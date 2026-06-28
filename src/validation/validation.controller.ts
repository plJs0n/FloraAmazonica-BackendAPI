import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ValidationService } from './validation.service';
import { ChangeStatusDto, PaginationDto } from './dto/validation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('validacion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VALIDADOR)
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  /**
   * GET /validacion/pendientes
   * Lista todos los registros fuera de borrador, con paginación.
   * Query params opcionales: page, limit, status
   */
  @Get('pendientes')
  findPending(@Query() dto: PaginationDto) {
    return this.validationService.findPending(dto);
  }

  /**
   * GET /validacion/:id
   * Ficha completa del registro para revisión (excluye borradores).
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.validationService.findOne(id);
  }

  /**
   * PATCH /validacion/:id/estado
   * Cambia el estado del registro.
   * observation_notes es obligatorio si el nuevo estado es 'observado' o 'rechazado'.
   */
  @Patch(':id/estado')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @Request() req,
  ) {
    return this.validationService.changeStatus(id, dto, req.user);
  }
}
