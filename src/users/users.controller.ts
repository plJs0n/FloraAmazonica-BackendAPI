import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserRoleDto, UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UserStatus } from '../common/enums/user-status.enum';

const ALL_ROLES = [UserRole.ADMINISTRADOR, UserRole.REGISTRADOR, UserRole.VALIDADOR, UserRole.CONSULTOR];

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Perfil propio ────────────────────────────────────────────────────────

  @Get('perfil')
  @Roles(...ALL_ROLES)
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('perfil')
  @Roles(...ALL_ROLES)
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('perfil/contrasena')
  @Roles(...ALL_ROLES)
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  // ─── Admin: gestión de usuarios ──────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * PATCH /usuarios/:id/activar
   * Mantiene compatibilidad con el cuerpo { is_active: boolean }.
   * Internamente mapea a UserStatus.ACTIVO / INACTIVO.
   */
  @Patch(':id/activar')
  @Roles(UserRole.ADMINISTRADOR)
  toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('is_active') is_active: boolean,
  ) {
    return this.usersService.toggleActive(id, is_active);
  }

  /**
   * PATCH /usuarios/:id/estado
   * Permite establecer el status directamente: activo | inactivo | pendiente.
   */
  @Patch(':id/estado')
  @Roles(UserRole.ADMINISTRADOR)
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: UserStatus,
  ) {
    return this.usersService.setStatus(id, status);
  }

  @Patch(':id/rol')
  @Roles(UserRole.ADMINISTRADOR)
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto);
  }
}
