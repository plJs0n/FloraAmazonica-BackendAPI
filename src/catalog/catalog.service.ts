import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { SpeciesCatalog } from './entities/species-catalog.entity';
import { ImportMode, UpdateSpeciesCatalogDto } from './dto/catalog.dto';
import { RecordStatus } from '../common/enums/record-status.enum';

export interface CsvRow {
  scientific_name: string;
  family: string;
}

export interface ImportPreviewResult {
  nuevos: number;
  actualizados: number;
  conservados: number;
  desactivados: number;
  errores: Array<{ row: number; message: string }>;
  preview: Array<{
    scientific_name: string;
    family: string;
    action: 'nuevo' | 'actualizado' | 'conservado' | 'desactivado';
  }>;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(SpeciesCatalog)
    private catalogRepo: Repository<SpeciesCatalog>,
  ) {}

  private normalize(text: string): string {
    return text?.trim().toLowerCase() ?? '';
  }

  /**
   * Parsea el buffer CSV y retorna filas validadas
   */
  private parseCsv(buffer: Buffer): { rows: CsvRow[]; errors: Array<{ row: number; message: string }> } {
    const errors: Array<{ row: number; message: string }> = [];
    let records: any[];

    try {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      throw new BadRequestException(`Error al parsear CSV: ${err.message}`);
    }

    const rows: CsvRow[] = [];

    records.forEach((record, index) => {
      const rowNum = index + 2; // encabezado en fila 1
      const scientific_name = record['scientific_name'] || record['nombre_cientifico'] || '';
      const family = record['family'] || record['familia'] || '';

      if (!scientific_name.trim()) {
        errors.push({ row: rowNum, message: 'Nombre científico vacío' });
        return;
      }

      if (!family.trim()) {
        errors.push({ row: rowNum, message: 'Familia vacía' });
        return;
      }

      rows.push({ scientific_name: scientific_name.trim(), family: family.trim() });
    });

    return { rows, errors };
  }

  /**
   * POST /catalogo/importar/preview — Vista previa sin persistir
   */
  async previewImport(buffer: Buffer, mode: ImportMode): Promise<ImportPreviewResult> {
    const { rows, errors } = this.parseCsv(buffer);
    const allExisting = await this.catalogRepo.find();

    const existingMap = new Map(
      allExisting.map((e) => [this.normalize(e.scientific_name), e]),
    );
    const incomingKeys = new Set(rows.map((r) => this.normalize(r.scientific_name)));

    let nuevos = 0;
    let actualizados = 0;
    let conservados = 0;
    let desactivados = 0;
    const preview: ImportPreviewResult['preview'] = [];

    for (const row of rows) {
      const key = this.normalize(row.scientific_name);
      const existing = existingMap.get(key);

      if (!existing) {
        nuevos++;
        preview.push({ ...row, action: 'nuevo' });
      } else {
        const familyChanged = this.normalize(existing.family) !== this.normalize(row.family);
        if (familyChanged || !existing.is_active) {
          actualizados++;
          preview.push({ ...row, action: 'actualizado' });
        } else {
          conservados++;
          preview.push({ ...row, action: 'conservado' });
        }
      }
    }

    if (mode === ImportMode.REEMPLAZAR) {
      for (const existing of allExisting) {
        const key = this.normalize(existing.scientific_name);
        if (!incomingKeys.has(key) && existing.is_active) {
          desactivados++;
          preview.push({
            scientific_name: existing.scientific_name,
            family: existing.family,
            action: 'desactivado',
          });
        }
      }
    } else {
      // modo agregar: conservar los que no están en el CSV
      for (const existing of allExisting) {
        const key = this.normalize(existing.scientific_name);
        if (!incomingKeys.has(key) && existing.is_active) {
          conservados++;
          preview.push({
            scientific_name: existing.scientific_name,
            family: existing.family,
            action: 'conservado',
          });
        }
      }
    }

    return { nuevos, actualizados, conservados, desactivados, errores: errors, preview };
  }

  /**
   * POST /catalogo/importar — Importar CSV con persistencia
   */
  async importCsv(buffer: Buffer, mode: ImportMode): Promise<ImportPreviewResult> {
    const { rows, errors } = this.parseCsv(buffer);
    const allExisting = await this.catalogRepo.find();

    const existingMap = new Map(
      allExisting.map((e) => [this.normalize(e.scientific_name), e]),
    );
    const incomingKeys = new Set(rows.map((r) => this.normalize(r.scientific_name)));

    let nuevos = 0;
    let actualizados = 0;
    let conservados = 0;
    let desactivados = 0;

    // Procesar filas entrantes
    for (const row of rows) {
      const key = this.normalize(row.scientific_name);
      const existing = existingMap.get(key);

      if (!existing) {
        await this.catalogRepo.save(
          this.catalogRepo.create({
            scientific_name: row.scientific_name,
            family: row.family,
            is_active: true,
          }),
        );
        nuevos++;
      } else {
        const familyChanged = this.normalize(existing.family) !== this.normalize(row.family);
        if (familyChanged || !existing.is_active) {
          await this.catalogRepo.update(existing.id, {
            family: row.family,
            is_active: true,
          });
          actualizados++;
        } else {
          conservados++;
        }
      }
    }

    // Modo reemplazar: desactivar los no incluidos
    if (mode === ImportMode.REEMPLAZAR) {
      for (const existing of allExisting) {
        const key = this.normalize(existing.scientific_name);
        if (!incomingKeys.has(key) && existing.is_active) {
          await this.catalogRepo.update(existing.id, { is_active: false });
          desactivados++;
        }
      }
    } else {
      // modo agregar: contar conservados
      for (const existing of allExisting) {
        const key = this.normalize(existing.scientific_name);
        if (!incomingKeys.has(key) && existing.is_active) {
          conservados++;
        }
      }
    }

    return {
      nuevos,
      actualizados,
      conservados,
      desactivados,
      errores: errors,
      preview: [],
    };
  }

  // ─── Familias ────────────────────────────────────────────────────

  async findFamilies(search?: string): Promise<{ family: string; is_active: boolean }[]> {
    const all = await this.catalogRepo
      .createQueryBuilder('s')
      .select(['s.family', 'MAX(s.is_active::int)::boolean as is_active'])
      .where(search ? 's.family ILIKE :search' : '1=1', { search: `%${search}%` })
      .groupBy('s.family')
      .getRawMany();

    return all.map((r) => ({ family: r.s_family, is_active: r.is_active }));
  }

  // ─── Especies (species_catalog) ──────────────────────────────────

  async findSpecies(search?: string): Promise<SpeciesCatalog[]> {
    const where: any = {};
    if (search) {
      return this.catalogRepo.find({
        where: [
          { scientific_name: ILike(`%${search}%`) },
          { family: ILike(`%${search}%`) },
        ],
        order: { scientific_name: 'ASC' },
      });
    }
    return this.catalogRepo.find({ order: { scientific_name: 'ASC' } });
  }

  async updateSpecies(id: string, dto: UpdateSpeciesCatalogDto): Promise<SpeciesCatalog> {
    const record = await this.catalogRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Especie ${id} no encontrada`);
    await this.catalogRepo.update(id, dto);
    return this.catalogRepo.findOne({ where: { id } });
  }

  async toggleSpeciesStatus(id: string, is_active: boolean): Promise<SpeciesCatalog> {
    const record = await this.catalogRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Especie ${id} no encontrada`);
    await this.catalogRepo.update(id, { is_active });
    return this.catalogRepo.findOne({ where: { id } });
  }
}
