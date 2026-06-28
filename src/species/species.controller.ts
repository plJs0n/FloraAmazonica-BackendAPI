import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SpeciesService } from './species.service';
import { CreateSpeciesRecordDto, UpdateSpeciesRecordDto, UploadPhotoDto } from './dto/species.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('especies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.REGISTRADOR)
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  /**
   * POST /especies — Crear registro (borrador o envío directo)
   */
  @Post()
  create(@Body() dto: CreateSpeciesRecordDto, @Request() req) {
    return this.speciesService.create(dto, req.user);
  }

  /**
   * GET /especies — Listar registros propios
   */
  @Get()
  findAll(@Request() req) {
    return this.speciesService.findAll(req.user);
  }

  /**
   * GET /especies/:id — Detalle de un registro
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.speciesService.findOne(id, req.user);
  }

  /**
   * PATCH /especies/:id — Editar registro (solo en_revision u observado)
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpeciesRecordDto,
    @Request() req,
  ) {
    return this.speciesService.update(id, dto, req.user);
  }

  /**
   * DELETE /especies/:id — Eliminar registro (solo en_revision u observado)
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.speciesService.remove(id, req.user);
  }

  /**
   * POST /especies/fotos — Subir foto a Cloudinary
   * Nota: La ruta /fotos debe declararse antes de /:id para no confundirse
   */
  @Post('fotos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|jpg)$/)) {
          return cb(new BadRequestException('Solo se aceptan imágenes JPEG, PNG o WebP'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('Se requiere un archivo de imagen');
    }
    return this.speciesService.uploadPhoto(file, dto, req.user);
  }

  /**
   * POST /especies/:id/enviar — Enviar borrador a revisión
   */
  @Post(':id/enviar')
  submit(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.speciesService.submit(id, req.user);
  }
}
