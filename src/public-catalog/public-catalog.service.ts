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
import { MorphologicalValue } from '../morphology/entities/morphological-value.entity';
import { normalizeText } from '../common/utils/normalize-text.util';

const DAILY_DOWNLOAD_LIMIT = 20;

@Injectable()
export class PublicCatalogService {
  constructor(
    @InjectRepository(SpeciesRecord)
    private speciesRecordRepo: Repository<SpeciesRecord>,
    @InjectRepository(SpeciesPhoto)
    private speciesPhotoRepo: Repository<SpeciesPhoto>,
    @InjectRepository(DownloadQuota)
    private downloadQuotaRepo: Repository<DownloadQuota>,
    @InjectRepository(MorphologicalValue)
    private morphologyRepo: Repository<MorphologicalValue>,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private todayString(): string {
    return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  }

  /**
   * Convierte un field_name a slug para usarlo como query param.
   * "Tipo de ramificación" → "tipo_de_ramificacion"
   */
  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // elimina tildes
      .replace(/[^a-z0-9]+/g, '_')     // espacios y símbolos → _
      .replace(/^_|_$/g, '');          // trim underscores
  }

  /**
   * Obtiene los field_names filtrables desde BD (use_in_search = true, is_active = true)
   * y los devuelve como mapa slug → field_name original.
   * Ejemplo: { "tipo_de_ramificacion": "Tipo de ramificación" }
   */
  private async getActiveFilterMap(habit?: string): Promise<Record<string, string>> {
    const query = this.morphologyRepo
      .createQueryBuilder('m')
      .select('DISTINCT m.field_name', 'field_name')
      .where('m.use_in_search = true')
      .andWhere('m.is_active = true');

    if (habit) {
      query.andWhere('LOWER(m.habit) = :habit', { habit: normalizeText(habit) });
    }

    const rows = await query.getRawMany();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[this.toSlug(row.field_name)] = row.field_name;
    }
    return map;
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
   * Los filtros morfológicos ya no están hardcodeados.
   * Se consulta la BD para obtener los field_name con use_in_search = true,
   * se convierten a slug y se buscan en los query params.
   *
   * Ejemplo: field_name "Tipo de ramificación" → query param ?tipo_de_ramificacion=Erecta
   *
   * Estrategia de ranking: registros con más coincidencias aparecen primero.
   */
  async search(dto: SearchSpeciesDto, _user: User) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    // Obtener mapa dinámico de filtros activos: { slug → field_name_original }
    const filterMap = await this.getActiveFilterMap(dto.habit);

    const query = this.validatedQuery();

    // Filtro por texto libre en nombre científico y familia
    if (dto.q) {
      query.andWhere(
        '(LOWER(r.scientific_name) LIKE LOWER(:q) OR LOWER(r.family) LIKE LOWER(:q))',
        { q: `%${dto.q}%` },
      );
    }

    // Filtro directo por hábito (columna propia)
    if (dto.habit) {
      query.andWhere('LOWER(r.habit) = :habit', { habit: normalizeText(dto.habit) });
    }

    // Construir scoring dinámico por coincidencias en morphological_data (jsonb)
    const morphFilters: { slug: string; fieldName: string; value: string }[] = [];
    const extraParams = dto as Record<string, unknown>;

    for (const [slug, fieldName] of Object.entries(filterMap)) {
      const value = extraParams[slug] as string | undefined;
      if (value) {
        morphFilters.push({ slug, fieldName, value });
      }
    }

    if (morphFilters.length > 0) {
      const scoreParts = morphFilters.map(({ slug, fieldName, value }) => {
        const paramKey = `filter_${slug}`;
        query.setParameter(paramKey, value);
        return `CASE WHEN LOWER(r.morphological_data->>'${fieldName}') = LOWER(:${paramKey}) THEN 1 ELSE 0 END`;
      });

      const scoreExpr = scoreParts.join(' + ');
      query.andWhere(`(${scoreExpr}) > 0`);
      query.addSelect(`(${scoreExpr})`, 'score');
      query.orderBy('score', 'DESC').addOrderBy('r.validated_at', 'DESC');
    } else {
      query.orderBy('r.validated_at', 'DESC');
    }

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    // Construir resumen de filtros aplicados
    const filters_applied: Record<string, string | null> = { habit: dto.habit ?? null };
    for (const [slug] of Object.entries(filterMap)) {
      filters_applied[slug] = (extraParams[slug] as string) ?? null;
    }

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters_applied,
    };
  }

  // ─── HU-04: Sugerencias de búsqueda ─────────────────────────────────────

  /**
   * GET /catalogo/sugerencias?q=texto
   * Busca con ILIKE en scientific_name y family de registros validados.
   * Devuelve array de strings sin repetidos, máximo 10 resultados.
   */
  async getSuggestions(q: string): Promise<string[]> {
    if (!q || q.trim().length < 2) return [];

    const rows = await this.speciesRecordRepo
      .createQueryBuilder('r')
      .select(['r.scientific_name', 'r.family'])
      .where('r.status = :status', { status: RecordStatus.VALIDADO })
      .andWhere(
        '(LOWER(r.scientific_name) LIKE LOWER(:q) OR LOWER(r.family) LIKE LOWER(:q))',
        { q: `%${q.trim()}%` },
      )
      .limit(20) // traemos más para deduplicar
      .getMany();

    const suggestions = new Set<string>();

    for (const row of rows) {
      if (suggestions.size >= 10) break;
      if (row.scientific_name?.toLowerCase().includes(q.toLowerCase())) {
        suggestions.add(row.scientific_name);
      }
      if (suggestions.size >= 10) break;
      if (row.family?.toLowerCase().includes(q.toLowerCase())) {
        suggestions.add(row.family);
      }
    }

    return Array.from(suggestions).slice(0, 10);
  }

  // ─── HU-04: Filtros disponibles para el buscador ──────────────────────────

  /**
   * GET /catalogo/filtros
   * Devuelve los campos filtrables agrupados por field_name.
   * Condiciones: use_in_search = true, is_active = true, option_value != 'Otro'
   */
  async getSearchFilters(habit?: string): Promise<
    { field_name: string; habit: string; selection_type: string; opciones: string[] }[]
  > {
    const query = this.morphologyRepo
      .createQueryBuilder('m')
      .where('m.use_in_search = true')
      .andWhere('m.is_active = true')
      .andWhere("LOWER(m.option_value) != 'otro'")
      .orderBy('m.display_order', 'ASC')
      .addOrderBy('m.field_name', 'ASC');

    if (habit) {
      query.andWhere('LOWER(m.habit) = :habit', { habit: normalizeText(habit) });
    }

    const rows = await query.getMany();

    // Agrupar por field_name
    const grouped = new Map<
      string,
      { field_name: string; habit: string; selection_type: string; opciones: string[] }
    >();

    for (const row of rows) {
      const key = `${row.habit}__${row.field_name}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          field_name: row.field_name,
          habit: row.habit,
          selection_type: row.selection_type,
          opciones: [],
        });
      }
      grouped.get(key).opciones.push(row.option_value);
    }

    return Array.from(grouped.values());
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
