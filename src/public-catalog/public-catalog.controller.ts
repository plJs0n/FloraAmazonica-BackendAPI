import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PublicCatalogService } from './public-catalog.service';
import { SearchSpeciesDto } from './dto/public-catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Todos los endpoints del catálogo público requieren autenticación.
 * Cualquier rol activo puede acceder (administrador, registrador, validador, consultor).
 */
@Controller('catalogo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.CONSULTOR,
  UserRole.REGISTRADOR,
  UserRole.VALIDADOR,
  UserRole.ADMINISTRADOR,
)
export class PublicCatalogController {
  constructor(private readonly publicCatalogService: PublicCatalogService) {}

  /**
   * GET /catalogo/filtros
   * Devuelve los campos filtrables activos agrupados por field_name.
   * Úsalo para construir la UI del buscador dinámicamente.
   * Query param opcional: ?habit=árbol
   *
   * Declarado ANTES de /buscar y /:id para evitar conflictos de rutas.
   */
  @Get('filtros')
  getSearchFilters(@Query('habit') habit?: string) {
    return this.publicCatalogService.getSearchFilters(habit);
  }

  /**
   * GET /catalogo/buscar
   * Buscador morfológico dinámico con ranking por coincidencias.
   * Los filtros disponibles se obtienen de GET /catalogo/filtros.
   * Cada field_name se convierte a slug para usarse como query param.
   *
   * Ejemplo: "Tipo de ramificación" → ?tipo_de_ramificacion=Erecta
   * Fijos: ?habit=árbol&page=1&limit=20
   */
  @Get('buscar')
  search(@Query() dto: SearchSpeciesDto, @Request() req) {
    return this.publicCatalogService.search(dto, req.user);
  }

  /**
   * GET /catalogo/:id
   * Ficha técnica completa de una especie validada.
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicCatalogService.findOne(id);
  }

  /**
   * GET /catalogo/:id/distribucion
   * Mapa de distribución: todos los puntos georreferenciados
   * de registros validados de la misma especie.
   */
  @Get(':id/distribucion')
  getDistribution(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicCatalogService.getDistribution(id);
  }

  /**
   * GET /catalogo/:id/fotos/:fotoId/descargar
   * Descarga individual con límite de 20 por usuario por día.
   * Redirige a la URL de Cloudinary con el crédito de autoría en headers.
   */
  @Get(':id/fotos/:fotoId/descargar')
  async downloadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const result = await this.publicCatalogService.downloadPhoto(id, fotoId, req.user);

    // Devolver redirect a Cloudinary con cabecera de autoría
    res.setHeader('X-Author-Credit', result.author_credit);
    res.setHeader('X-Photo-Type', result.photo_type);
    return res.redirect(HttpStatus.FOUND, result.url);
  }
}
