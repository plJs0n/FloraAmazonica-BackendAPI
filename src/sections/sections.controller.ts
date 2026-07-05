import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('secciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  /**
   * GET /secciones?habit=árbol
   * Lista secciones de un hábito ordenadas por display_order.
   */
  @Get()
  @Roles(UserRole.ADMINISTRADOR, UserRole.REGISTRADOR)
  findAll(@Query('habit') habit?: string) {
    return this.sectionsService.findAll(habit);
  }

  /**
   * POST /secciones
   * Crea una sección. Lanza 409 si ya existe name+habit.
   */
  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(@Body() dto: CreateSectionDto) {
    return this.sectionsService.create(dto);
  }

  /**
   * PATCH /secciones/:id
   * Edita name y/o display_order.
   */
  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(id, dto);
  }

  /**
   * DELETE /secciones/:id
   * Lanza 409 si hay campos morfológicos que usan esta sección.
   */
  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionsService.remove(id);
  }
}
