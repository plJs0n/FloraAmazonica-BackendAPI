import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpeciesRecord } from '../species/entities/species-record.entity';
import { SpeciesPhoto } from '../species/entities/species-photo.entity';
import { DownloadQuota } from './entities/download-quota.entity';
import { RecordStatus } from '../common/enums/record-status.enum';
import { SearchSpeciesDto } from './dto/public-catalog.dto';
import { User } from '../users/entities/user.entity';

const DAILY_DOWNLOAD_LIMIT = 20;

/**
 * Campos del jsonb morphological_data que mapean a cada query param del buscador.
 * El ranking cuenta cuántos de estos campos coinciden en cada registro.
 */
const MORPHOLOGICAL_FILTER_MAP: Record<string, string> = {
  flower_type:  'tipo_flor',
  flower_color: 'color_flor',
  fruit_type:   'tipo_fruto',
  seed_type:    'tipo_semilla',
  exudate_type: 'tipo_exudado',
};

@Injectable()
export class PublicCatalogService {
  constructor(
    @InjectRepository(SpeciesRecord)
    private speciesRecordRepo: Repository<SpeciesRecord>,
    @InjectRepository(SpeciesPhoto)
    private speciesPhotoRepo: Repository<SpeciesPhoto>,
    @InjectRepository(DownloadQuota)
    private downloadQuotaRepo: Repository<DownloadQuota>,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private todayString(): string {
    return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  }

  /**
   * Base query que garantiza solo registros validados con sus relaciones públicas.
   */
  private validatedQuery() {
    return this.speciesRecordRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.photos', 'photos')
      .leftJoin('r.registrar', 'registrar')
      .addSelect([
        'registrar.id',
        'registrar.first_name',
        'registrar.paternal_last_name',
        'registrar.maternal_last_name',
      ])
      .where('r.status = :status', { status: RecordStatus.VALIDADO });
  }

  // ─── HU-04: Buscador morfológico ─────────────────────────────────────────

  /**
   * GET /catalogo/buscar
   *
   * Estrategia de ranking:
   * 1. Filtra obligatoriamente por `habit` si se provee (campo de columna directa).
   * 2. Para los filtros morfológicos (flower_type, fruit_type, etc.), construye
   *    una puntuación de coincidencias usando jsonb en PostgreSQL.
   * 3. Ordena por score DESC → más coincidencias primero.
   * 4. Si no hay filtros, devuelve todos los validados paginados.
   */
  async search(dto: SearchSpeciesDto, _user: User) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const query = this.validatedQuery();

    // Filtro directo por hábito (columna propia)
    if (dto.habit) {
      query.andWhere('LOWER(r.habit) = LOWER(:habit)', { habit: dto.habit });
    }

    // Construir scoring por coincidencias en morphological_data (jsonb)
    const morphFilters: { param: string; field: string; value: string }[] = [];

    for (const [queryParam, jsonField] of Object.entries(MORPHOLOGICAL_FILTER_MAP)) {
      const value = dto[queryParam as keyof SearchSpeciesDto] as string | undefined;
      if (value) {
        morphFilters.push({ param: queryParam, field: jsonField, value });
      }
    }

    if (morphFilters.length > 0) {
      // Genera expresión de score: suma de CASEs que valen 1 cuando coincide
      const scoreParts = morphFilters.map(({ field, param }) => {
        query.setParameter(`${param}_val`, field);
        query.setParameter(`${param}_expected`, String(dto[param as keyof SearchSpeciesDto]));
        return `CASE WHEN LOWER(r.morphological_data->>'${field}') = LOWER(:${param}_expected) THEN 1 ELSE 0 END`;
      });

      const scoreExpr = scoreParts.join(' + ');

      // Solo devuelve registros que tengan al menos 1 coincidencia morfológica
      query.andWhere(`(${scoreExpr}) > 0`);
      query.addSelect(`(${scoreExpr})`, 'score');
      query.orderBy('score', 'DESC').addOrderBy('r.validated_at', 'DESC');
    } else {
      query.orderBy('r.validated_at', 'DESC');
    }

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters_applied: {
        habit: dto.habit ?? null,
        ...Object.fromEntries(
          Object.keys(MORPHOLOGICAL_FILTER_MAP).map((k) => [
            k,
            (dto[k as keyof SearchSpeciesDto] as string) ?? null,
          ]),
        ),
      },
    };
  }

  // ─── HU-04: Ficha técnica ─────────────────────────────────────────────────

  /**
   * GET /catalogo/:id
   * Ficha técnica completa de un registro validado.
   */
  async findOne(id: string): Promise<SpeciesRecord> {
    const record = await this.speciesRecordRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.photos', 'photos')
      .leftJoin('r.registrar', 'registrar')
      .addSelect([
        'registrar.id',
        'registrar.first_name',
        'registrar.paternal_last_name',
        'registrar.maternal_last_name',
      ])
      .leftJoinAndSelect('r.species_catalog', 'catalog')
      .where('r.id = :id', { id })
      .andWhere('r.status = :status', { status: RecordStatus.VALIDADO })
      .getOne();

    if (!record) {
      throw new NotFoundException(
        `Especie ${id} no encontrada en el catálogo público`,
      );
    }

    return record;
  }

  // ─── HU-04: Mapa de distribución ─────────────────────────────────────────

  /**
   * GET /catalogo/:id/distribucion
   * Devuelve todos los puntos georreferenciados de registros validados
   * de la misma especie (mismo scientific_name).
   */
  async getDistribution(id: string) {
    const base = await this.findOne(id);

    const points = await this.speciesRecordRepo
      .createQueryBuilder('r')
      .select(['r.id', 'r.latitude', 'r.longitude', 'r.scientific_name', 'r.tracking_code'])
      .where('LOWER(r.scientific_name) = LOWER(:name)', {
        name: base.scientific_name,
      })
      .andWhere('r.status = :status', { status: RecordStatus.VALIDADO })
      .andWhere('r.latitude IS NOT NULL')
      .andWhere('r.longitude IS NOT NULL')
      .getMany();

    return {
      scientific_name: base.scientific_name,
      family: base.family,
      total_points: points.length,
      points: points.map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        tracking_code: p.tracking_code,
      })),
    };
  }

  // ─── HU-04: Descarga de foto individual ──────────────────────────────────

  /**
   * GET /catalogo/:id/fotos/:fotoId/descargar
   *
   * Controla el límite de 20 descargas por usuario por día.
   * Devuelve la URL de Cloudinary para redirigir al cliente.
   * HTTP 429 si se supera el límite.
   */
  async downloadPhoto(
    recordId: string,
    photoId: string,
    user: User,
  ): Promise<{ url: string; photo_type: string; author_credit: string }> {
    // 1. Verificar que el registro existe y está validado
    await this.findOne(recordId);

    // 2. Verificar que la foto pertenece al registro
    const photo = await this.speciesPhotoRepo
      .createQueryBuilder('p')
      .leftJoin('p.author', 'author')
      .addSelect([
        'author.first_name',
        'author.paternal_last_name',
        'author.maternal_last_name',
      ])
      .where('p.id = :photoId', { photoId })
      .andWhere('p.species_record_id = :recordId', { recordId })
      .getOne();

    if (!photo) {
      throw new NotFoundException(`Foto ${photoId} no encontrada para este registro`);
    }

    // 3. Controlar cuota diaria
    const today = this.todayString();

    let quota = await this.downloadQuotaRepo.findOne({
      where: { user_id: user.id, date: today },
    });

    if (quota && quota.count >= DAILY_DOWNLOAD_LIMIT) {
      throw new HttpException(
        {
          statusCode: 429,
          message: `Alcanzaste el límite de ${DAILY_DOWNLOAD_LIMIT} descargas diarias. Podrás continuar mañana.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4. Incrementar o crear contador
    if (!quota) {
      quota = this.downloadQuotaRepo.create({
        user_id: user.id,
        date: today,
        count: 1,
      });
    } else {
      quota.count += 1;
    }
    await this.downloadQuotaRepo.save(quota);

    // 5. Componer crédito de autoría
    const author = (photo as any).author;
    const authorName = author
      ? `${author.first_name} ${author.paternal_last_name}`.trim()
      : 'Autor desconocido';

    return {
      url: photo.cloudinary_url,
      photo_type: photo.photo_type,
      author_credit: authorName,
    };
  }
}
