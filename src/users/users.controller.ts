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

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Perfil propio (cualquier rol autenticado) ────────────────────────────

  /**
   * GET /usuarios/perfil — Obtener perfil del usuario autenticado
   */
  @Get('perfil')
  @Roles(
    UserRole.ADMINISTRADOR,
    UserRole.REGISTRADOR,
    UserRole.VALIDADOR,
    UserRole.CONSULTOR,
  )
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  /**
   * PATCH /usuarios/perfil — Editar nombre y email propios
   */
  @Patch('perfil')
  @Roles(
    UserRole.ADMINISTRADOR,
    UserRole.REGISTRADOR,
    UserRole.VALIDADOR,
    UserRole.CONSULTOR,
  )
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  /**
   * PATCH /usuarios/perfil/contrasena — Cambiar contraseña verificando la actual
   */
  @Patch('perfil/contrasena')
  @Roles(
    UserRole.ADMINISTRADOR,
    UserRole.REGISTRADOR,
    UserRole.VALIDADOR,
    UserRole.CONSULTOR,
  )
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  // ─── Administración (solo admin) ─────────────────────────────────────────

  /**
   * GET /usuarios — Listar todas las cuentas
   */
  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * PATCH /usuarios/:id/activar — Activar o desactivar cuenta
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
   * PATCH /usuarios/:id/rol — Cambiar rol del usuario
   */
  @Patch(':id/rol')
  @Roles(UserRole.ADMINISTRADOR)
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, dto);
  }
}
