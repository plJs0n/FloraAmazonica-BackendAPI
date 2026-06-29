import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { RegisterDto, LoginDto } from './dto/auth.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * POST /auth/registro
   * Crea cuenta con is_active=false y role=consultor.
   * El admin la activa manualmente (HU-05).
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    const exists = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Ya existe una cuenta con ese correo electrónico');
    }

    const password_hash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = this.usersRepository.create({
      first_name: dto.first_name,
      paternal_last_name: dto.paternal_last_name,
      maternal_last_name: dto.maternal_last_name,
      email: dto.email,
      password_hash,
      role: UserRole.CONSULTOR,
      is_active: false,
    });

    await this.usersRepository.save(user);

    return {
      message:
        'Cuenta creada correctamente. Un administrador debe activarla antes de que puedas iniciar sesión.',
    };
  }

  /**
   * POST /auth/login
   * Autentica y devuelve JWT.
   * HTTP 403 si la cuenta está inactiva.
   */
  async login(dto: LoginDto): Promise<{ access_token: string; user: Partial<User> }> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.is_active) {
      throw new ForbiddenException(
        'Tu cuenta aún no ha sido activada. Contacta a un administrador para que la active.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        first_name: user.first_name,
        paternal_last_name: user.paternal_last_name,
        maternal_last_name: user.maternal_last_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    };
  }
}
