import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as appleSignin from 'apple-signin-auth';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { RegisterDto, LoginDto, SocialLoginDto } from './dto/auth.dto';

const SALT_ROUNDS = 10;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  // ─── Helper: construir respuesta JWT ─────────────────────────────────────

  private buildTokenResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.toUserResponse(user),
    };
  }

  // ─── Helper: verificar que el usuario puede iniciar sesión ───────────────

  private assertCanLogin(user: User): void {
    if (user.status === UserStatus.PENDIENTE) {
      throw new ForbiddenException(
        'Tu cuenta aún no ha sido activada. Contacta a un administrador para que la active.',
      );
    }
    if (user.status === UserStatus.INACTIVO) {
      throw new ForbiddenException(
        'Tu cuenta ha sido desactivada. Contacta a un administrador.',
      );
    }
  }

  // ─── Registro local ───────────────────────────────────────────────────────

  /**
   * POST /auth/registro
   * Crea cuenta con status=PENDIENTE y role=CONSULTOR por defecto.
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    await this.createAccount(dto);
    return {
      message:
        'Cuenta creada correctamente. Un administrador debe activarla antes de que puedas iniciar sesión.',
    };
  }

  // ─── Registro para app iOS (devuelve usuario formateado) ────────────────────

  /**
   * POST /auth/register (alias para iOS)
   * Igual que register, pero devuelve el objeto usuario con el contrato UserDTO de iOS.
   */
  async registerForApp(dto: RegisterDto) {
    const user = await this.createAccount(dto);
    return this.toUserResponse(user);
  }

  private async createAccount(dto: RegisterDto) {
    const exists = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Ya existe una cuenta con ese correo electrónico');

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepository.create({
      first_name: dto.first_name,
      paternal_last_name: dto.paternal_last_name,
      maternal_last_name: dto.maternal_last_name,
      email: dto.email,
      password_hash,
      dni: dto.dni,
      institution: dto.institution,
      position: dto.position,
      role: UserRole.CONSULTOR,
      status: UserStatus.PENDIENTE,
    });
    return this.usersRepository.save(user);
  }

  /**
   * GET /auth/profile (app iOS)
   * Devuelve el usuario autenticado con el contrato UserDTO.
   */
  getProfile(user: User) {
    return this.toUserResponse(user);
  }

  /**
   * POST /auth/check-email
   * Indica si ya existe una cuenta con ese correo (público).
   */
  async checkEmail(email: string): Promise<{ exists: boolean }> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return { exists: !!user };
  }

  /**
   * Formato de respuesta de usuario para el decoder de iOS.
   * Las fechas se envían en ISO8601 sin milisegundos (el decoder de iOS no acepta fracciones).
   */
  private toUserResponse(user: User) {
    return {
      id: user.id,
      first_name: user.first_name,
      paternal_last_name: user.paternal_last_name,
      maternal_last_name: user.maternal_last_name,
      dni: user.dni,
      email: user.email,
      institution: user.institution,
      position: user.position,
      role: user.role,
      status: user.status,
      avatar_url: user.avatar_url,
      created_at: user.created_at?.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
  }

  // ─── Login local ─────────────────────────────────────────────────────────

  /**
   * POST /auth/login
   * Autentica con email + contraseña. HTTP 403 si PENDIENTE o INACTIVO.
   */
  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    this.assertCanLogin(user);

    return this.buildTokenResponse(user);
  }

  // ─── Social Login: Google ─────────────────────────────────────────────────

  /**
   * POST /auth/google
   * Recibe el id_token generado por la app iOS con Google Sign-In,
   * lo verifica y autentica (o registra) al usuario.
   */
  async loginWithGoogle(dto: SocialLoginDto) {
    let email: string;
    let name: string;
    let avatar_url: string;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name ?? '';
      avatar_url = payload.picture ?? null;
    } catch (err) {
      this.logger.error(`Google token inválido: ${err.message}`);
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }

    return this.findOrCreateSocialUser({
      email,
      firstName: name.split(' ')[0] || dto.first_name || email.split('@')[0],
      lastName: name.split(' ').slice(1).join(' ') || dto.last_name || '',
      avatar_url,
    });
  }

  // ─── Social Login: Apple ──────────────────────────────────────────────────

  /**
   * POST /auth/apple
   * Recibe el id_token generado por la app iOS con Sign in with Apple,
   * lo verifica y autentica (o registra) al usuario.
   */
  async loginWithApple(dto: SocialLoginDto) {
    let email: string;

    try {
      const payload = await appleSignin.verifyIdToken(dto.id_token, {
        audience: process.env.APPLE_CLIENT_ID,
        ignoreExpiration: false,
      });
      email = payload.email;
    } catch (err) {
      this.logger.error(`Apple token inválido: ${err.message}`);
      throw new UnauthorizedException('Token de Apple inválido o expirado');
    }

    return this.findOrCreateSocialUser({
      email,
      firstName: dto.first_name || email.split('@')[0],
      lastName: dto.last_name || '',
      avatar_url: null,
    });
  }

  // ─── Helper Social: buscar o crear usuario ───────────────────────────────

  private async findOrCreateSocialUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    avatar_url: string | null;
  }) {
    const { email, firstName, lastName, avatar_url } = params;

    let user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      user = this.usersRepository.create({
        email,
        first_name: firstName,
        paternal_last_name: lastName,
        maternal_last_name: '',
        avatar_url,
        role: UserRole.CONSULTOR,
        status: UserStatus.PENDIENTE,
      });
      await this.usersRepository.save(user);
      this.logger.log(`Nuevo usuario social creado: ${email}`);
    }

    this.assertCanLogin(user);

    if (avatar_url && user.avatar_url !== avatar_url) {
      await this.usersRepository.update(user.id, { avatar_url });
      user.avatar_url = avatar_url;
    }

    return this.buildTokenResponse(user);
  }
}
