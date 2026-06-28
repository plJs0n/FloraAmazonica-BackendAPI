import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserRoleDto } from './dto/user.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'first_name', 'paternal_last_name', 'maternal_last_name', 'email', 'role', 'is_active', 'created_at', 'updated_at'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'first_name', 'paternal_last_name', 'maternal_last_name', 'email', 'role', 'is_active', 'created_at', 'updated_at'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return user;
  }

  async toggleActive(id: string, is_active: boolean): Promise<User> {
    const user = await this.findOne(id);
    await this.usersRepository.update(id, { is_active });
    return this.findOne(id);
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<User> {
    const user = await this.findOne(id);
    await this.usersRepository.update(id, { role: dto.role });
    return this.findOne(id);
  }

  // Método interno para crear usuario (usado en futuro sprint de auth)
  async create(data: {
    first_name: string;
    paternal_last_name: string;
    maternal_last_name?: string;
    email: string;
    password_hash: string;
    role?: UserRole;
  }): Promise<User> {
    const exists = await this.usersRepository.findOne({
      where: { email: data.email },
    });

    if (exists) {
      throw new ConflictException('Ya existe un usuario con ese correo electrónico');
    }

    const user = this.usersRepository.create({
      ...data,
      is_active: false,
    });

    return this.usersRepository.save(user);
  }
}
