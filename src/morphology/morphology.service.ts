import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MorphologicalValue } from './entities/morphological-value.entity';
import { CreateMorphologicalValueDto, UpdateMorphologicalValueDto } from './dto/morphology.dto';
import { SpeciesRecord } from '../species/entities/species-record.entity';

@Injectable()
export class MorphologyService {
  constructor(
    @InjectRepository(MorphologicalValue)
    private morphologyRepo: Repository<MorphologicalValue>,
    @InjectRepository(SpeciesRecord)
    private speciesRecordRepo: Repository<SpeciesRecord>,
  ) {}

  private normalize(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * GET /morfologia — Listar por hábito y/o sección
   */
  async findAll(habit?: string, section?: string): Promise<MorphologicalValue[]> {
    const query = this.morphologyRepo
      .createQueryBuilder('m')
      .orderBy('m.habit', 'ASC')
      .addOrderBy('m.section', 'ASC')
      .addOrderBy('m.display_order', 'ASC');

    if (habit) {
      query.andWhere('LOWER(m.habit) = :habit', { habit: this.normalize(habit) });
    }

    if (section) {
      query.andWhere('LOWER(m.section) = :section', { section: this.normalize(section) });
    }

    return query.getMany();
  }

  /**
   * POST /morfologia — Crear valor morfológico
   */
  async create(dto: CreateMorphologicalValueDto): Promise<MorphologicalValue> {
    // Unicidad por (habit, section, field_name, option_value) normalizado
    const exists = await this.morphologyRepo
      .createQueryBuilder('m')
      .where('LOWER(m.habit) = :habit', { habit: this.normalize(dto.habit) })
      .andWhere('LOWER(m.section) = :section', { section: this.normalize(dto.section) })
      .andWhere('LOWER(m.field_name) = :field_name', { field_name: this.normalize(dto.field_name) })
      .andWhere('LOWER(m.option_value) = :option_value', { option_value: this.normalize(dto.option_value) })
      .getOne();

    if (exists) {
      throw new ConflictException(
        `Ya existe un valor morfológico con ese contexto (habit="${dto.habit}", section="${dto.section}", field="${dto.field_name}", value="${dto.option_value}")`,
      );
    }

    const value = this.morphologyRepo.create(dto);
    return this.morphologyRepo.save(value);
  }

  /**
   * PATCH /morfologia/:id — Editar valor morfológico
   */
  async update(id: string, dto: UpdateMorphologicalValueDto): Promise<MorphologicalValue> {
    const existing = await this.morphologyRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Valor morfológico ${id} no encontrado`);

    // Verificar unicidad si cambian los campos del contexto
    const checkHabit = dto.habit ?? existing.habit;
    const checkSection = dto.section ?? existing.section;
    const checkField = dto.field_name ?? existing.field_name;
    const checkOption = dto.option_value ?? existing.option_value;

    const duplicate = await this.morphologyRepo
      .createQueryBuilder('m')
      .where('LOWER(m.habit) = :habit', { habit: this.normalize(checkHabit) })
      .andWhere('LOWER(m.section) = :section', { section: this.normalize(checkSection) })
      .andWhere('LOWER(m.field_name) = :field_name', { field_name: this.normalize(checkField) })
      .andWhere('LOWER(m.option_value) = :option_value', { option_value: this.normalize(checkOption) })
      .andWhere('m.id != :id', { id })
      .getOne();

    if (duplicate) {
      throw new ConflictException('Ya existe un valor morfológico con ese contexto');
    }

    await this.morphologyRepo.update(id, dto);
    return this.morphologyRepo.findOne({ where: { id } });
  }

  /**
   * PATCH /morfologia/:id/estado — Activar/desactivar (lógico si tiene registros)
   */
  async toggleStatus(id: string, is_active: boolean): Promise<MorphologicalValue> {
    const value = await this.morphologyRepo.findOne({ where: { id } });
    if (!value) throw new NotFoundException(`Valor morfológico ${id} no encontrado`);

    if (!is_active) {
      // Verificar si algún registro usa este valor en su morphological_data
      // Búsqueda en JSONB: buscar si option_value aparece en los datos guardados
      const inUse = await this.speciesRecordRepo
        .createQueryBuilder('r')
        .where(`r.morphological_data::text ILIKE :val`, {
          val: `%${value.option_value}%`,
        })
        .getCount();

      if (inUse > 0) {
        // Desactivación lógica (ya es el comportamiento por defecto)
        await this.morphologyRepo.update(id, { is_active: false });
        return this.morphologyRepo.findOne({ where: { id } });
      }
    }

    await this.morphologyRepo.update(id, { is_active });
    return this.morphologyRepo.findOne({ where: { id } });
  }

  /**
   * PATCH /morfologia/filtro
   * Actualiza use_in_search para todas las filas que comparten
   * el mismo habit + field_name (un campo tiene una fila por opción).
   */
  async updateSearchFilter(
    habit: string,
    field_name: string,
    use_in_search: boolean,
  ): Promise<{ updated: number }> {
    const result = await this.morphologyRepo
      .createQueryBuilder()
      .update()
      .set({ use_in_search })
      .where('habit = :habit', { habit: habit.trim() })
      .andWhere('field_name = :field_name', { field_name: field_name.trim() })
      .execute();

    return { updated: result.affected ?? 0 };
  }
}
