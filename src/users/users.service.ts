import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateUserRoleDto, UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { NotificationsService } from '../notifications/notifications.service';

const SAFE_SELECT: (keyof User)[] = [
  'id', 'first_name', 'paternal_last_name', 'maternal_last_name',
  'email', 'role', 'status', 'dni', 'institution', 'position',
  'avatar_url', 'created_at', 'updated_at',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Admin: listar todos ──────────────────────────────────────────────────

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: SAFE_SELECT,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    return user;
  }

  // ─── Admin: activar/desactivar ────────────────────────────────────────────

  /**
   * Ahora recibe un UserStatus en lugar de un booleano.
   * Sigue aceptando is_active (boolean) para compatibilidad con el endpoint anterior,
   * mapeándolo a ACTIVO / INACTIVO.
   */
  async toggleActive(id: string, is_active: boolean): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    const wasPending = user.status === UserStatus.PENDIENTE;
    const wasInactive = user.status === UserStatus.INACTIVO;
    const newStatus = is_active ? UserStatus.ACTIVO : UserStatus.INACTIVO;

    await this.usersRepository.update(id, { status: newStatus });
    const updated = await this.findOne(id);

    // Disparar notificación solo cuando pasa a ACTIVO desde PENDIENTE o INACTIVO
    if (is_active && (wasPending || wasInactive)) {
      const fullUser = await this.usersRepository.findOne({ where: { id } });
      this.notificationsService.notifyAccountActivated(fullUser).catch(() => null);
    }

    return updated;
  }

  async setStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    const wasNotActive = user.status !== UserStatus.ACTIVO;
    await this.usersRepository.update(id, { status });
    const updated = await this.findOne(id);

    if (status === UserStatus.ACTIVO && wasNotActive) {
      const fullUser = await this.usersRepository.findOne({ where: { id } });
      this.notificationsService.notifyAccountActivated(fullUser).catch(() => null);
    }

    return updated;
  }

  // ─── Admin: cambiar rol ───────────────────────────────────────────────────

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<User> {
    await this.findOne(id);
    await this.usersRepository.update(id, { role: dto.role });
    return this.findOne(id);
  }

  // ─── Perfil propio ────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<User> {
    return this.findOne(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    if (dto.email) {
      const conflict = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (conflict && conflict.id !== userId) {
        throw new ConflictException('Ese correo electrónico ya está en uso');
      }
    }
    await this.usersRepository.update(userId, dto);
    return this.findOne(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (!user.password_hash) {
      throw new BadRequestException(
        'Esta cuenta usa inicio de sesión social y no tiene contraseña configurada.',
      );
    }

    const valid = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    const password_hash = await bcrypt.hash(dto.new_password, 10);
    await this.usersRepository.update(userId, { password_hash });

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ─── Método interno ───────────────────────────────────────────────────────

  async create(data: {
    first_name: string;
    paternal_last_name: string;
    maternal_last_name?: string;
    email: string;
    password_hash: string;
    role?: UserRole;
  }): Promise<User> {
    const exists = await this.usersRepository.findOne({ where: { email: data.email } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese correo electrónico');

    const user = this.usersRepository.create({ ...data, status: UserStatus.PENDIENTE });
    return this.usersRepository.save(user);
  }
}
