import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CatalogService } from './catalog.service';
import { ImportCatalogDto, ImportMode, UpdateSpeciesCatalogDto, ToggleStatusDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

const csvInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.csv$/i)) {
      return cb(new BadRequestException('Solo se aceptan archivos CSV'), false);
    }
    cb(null, true);
  },
});

@Controller('catalogo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * POST /catalogo/importar/preview — Vista previa sin persistir
   */
  @Post('importar/preview')
  @Roles(UserRole.ADMINISTRADOR)
  @UseInterceptors(csvInterceptor)
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportCatalogDto,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo CSV');
    return this.catalogService.previewImport(file.buffer, dto.mode);
  }

  /**
   * POST /catalogo/importar — Importar CSV (persiste)
   */
  @Post('importar')
  @Roles(UserRole.ADMINISTRADOR)
  @UseInterceptors(csvInterceptor)
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportCatalogDto,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo CSV');
    return this.catalogService.importCsv(file.buffer, dto.mode);
  }

  /**
   * GET /catalogo/familias — Listar familias con búsqueda parcial
   */
  @Get('familias')
  @Roles(UserRole.ADMINISTRADOR, UserRole.REGISTRADOR)
  findFamilies(@Query('search') search?: string) {
    return this.catalogService.findFamilies(search);
  }

  /**
   * PATCH /catalogo/familias/:id — Editar especie (por id)
   */
  @Patch('familias/:id')
  @Roles(UserRole.ADMINISTRADOR)
  updateFamily(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpeciesCatalogDto,
  ) {
    return this.catalogService.updateSpecies(id, dto);
  }

  /**
   * PATCH /catalogo/familias/:id/estado — Activar/desactivar
   */
  @Patch('familias/:id/estado')
  @Roles(UserRole.ADMINISTRADOR)
  toggleFamilyStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleStatusDto,
  ) {
    return this.catalogService.toggleSpeciesStatus(id, dto.is_active);
  }

  /**
   * GET /catalogo/especies — Listar especies con búsqueda parcial
   */
  @Get('especies')
  @Roles(UserRole.ADMINISTRADOR, UserRole.REGISTRADOR)
  findSpecies(@Query('search') search?: string) {
    return this.catalogService.findSpecies(search);
  }

  /**
   * PATCH /catalogo/especies/:id — Editar especie
   */
  @Patch('especies/:id')
  @Roles(UserRole.ADMINISTRADOR)
  updateSpecies(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpeciesCatalogDto,
  ) {
    return this.catalogService.updateSpecies(id, dto);
  }

  /**
   * PATCH /catalogo/especies/:id/estado — Activar/desactivar
   */
  @Patch('especies/:id/estado')
  @Roles(UserRole.ADMINISTRADOR)
  toggleSpeciesStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleStatusDto,
  ) {
    return this.catalogService.toggleSpeciesStatus(id, dto.is_active);
  }
}
