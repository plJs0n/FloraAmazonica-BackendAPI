import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MorphologyService } from './morphology.service';
import { CreateMorphologicalValueDto, UpdateMorphologicalValueDto, UpdateSearchFilterDto } from './dto/morphology.dto';
import { ToggleStatusDto } from '../catalog/dto/catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('morfologia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MorphologyController {
  constructor(private readonly morphologyService: MorphologyService) {}

  /**
   * GET /morfologia — Listar valores por hábito/sección
   */
  @Get()
  @Roles(UserRole.ADMINISTRADOR, UserRole.REGISTRADOR, UserRole.VALIDADOR)
  findAll(
    @Query('habit') habit?: string,
    @Query('section') section?: string,
  ) {
    return this.morphologyService.findAll(habit, section);
  }

  /**
   * PATCH /morfologia/filtro
   * Activa o desactiva use_in_search para TODAS las filas de un mismo habit + field_name.
   * Declarado antes de ':id' para que Nest no interprete "filtro" como un UUID.
   */
  @Patch('filtro')
  @Roles(UserRole.ADMINISTRADOR)
  updateSearchFilter(@Body() dto: UpdateSearchFilterDto) {
    return this.morphologyService.updateSearchFilter(
      dto.habit,
      dto.field_name,
      dto.use_in_search,
    );
  }

  /**
   * POST /morfologia — Crear valor morfológico
   */
  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(@Body() dto: CreateMorphologicalValueDto) {
    return this.morphologyService.create(dto);
  }

  /**
   * PATCH /morfologia/:id — Editar valor morfológico
   */
  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMorphologicalValueDto,
  ) {
    return this.morphologyService.update(id, dto);
  }

  /**
   * PATCH /morfologia/:id/estado — Activar/desactivar (lógico si tiene registros)
   */
  @Patch(':id/estado')
  @Roles(UserRole.ADMINISTRADOR)
  toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleStatusDto,
  ) {
    return this.morphologyService.toggleStatus(id, dto.is_active);
  }
}
