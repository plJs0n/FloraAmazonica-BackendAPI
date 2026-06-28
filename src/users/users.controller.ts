import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /usuarios — Listar todas las cuentas con estado y rol
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
