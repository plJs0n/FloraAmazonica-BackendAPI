import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from './entities/section.entity';
import { MorphologicalValue } from '../morphology/entities/morphological-value.entity';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private sectionsRepo: Repository<Section>,
    @InjectRepository(MorphologicalValue)
    private morphologyRepo: Repository<MorphologicalValue>,
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
   * GET /secciones?habit=árbol
   * Lista secciones de un hábito ordenadas por display_order.
   */
  async findAll(habit?: string): Promise<Section[]> {
    const query = this.sectionsRepo
      .createQueryBuilder('s')
      .orderBy('s.display_order', 'ASC')
      .addOrderBy('s.name', 'ASC');

    if (habit) {
      query.where('LOWER(s.habit) = :habit', { habit: this.normalize(habit) });
    }

    return query.getMany();
  }

  /**
   * POST /secciones
   * Crea una sección. Unicidad: no puede haber dos con el mismo name en el mismo habit.
   */
  async create(dto: CreateSectionDto): Promise<Section> {
    const exists = await this.sectionsRepo
      .createQueryBuilder('s')
      .where('LOWER(s.habit) = :habit', { habit: this.normalize(dto.habit) })
      .andWhere('LOWER(s.name) = :name', { name: this.normalize(dto.name) })
      .getOne();

    if (exists) {
      throw new ConflictException(
        `Ya existe una sección "${dto.name}" para el hábito "${dto.habit}"`,
      );
    }

    const section = this.sectionsRepo.create(dto);
    return this.sectionsRepo.save(section);
  }

  /**
   * PATCH /secciones/:id
   * Edita nombre y/o display_order. Verifica unicidad si cambia el nombre.
   */
  async update(id: string, dto: UpdateSectionDto): Promise<Section> {
    const section = await this.sectionsRepo.findOne({ where: { id } });
    if (!section) throw new NotFoundException(`Sección ${id} no encontrada`);

    if (dto.name) {
      const duplicate = await this.sectionsRepo
        .createQueryBuilder('s')
        .where('LOWER(s.habit) = :habit', { habit: this.normalize(section.habit) })
        .andWhere('LOWER(s.name) = :name', { name: this.normalize(dto.name) })
        .andWhere('s.id != :id', { id })
        .getOne();

      if (duplicate) {
        throw new ConflictException(
          `Ya existe una sección "${dto.name}" para el hábito "${section.habit}"`,
        );
      }
    }

    await this.sectionsRepo.update(id, dto);
    return this.sectionsRepo.findOne({ where: { id } });
  }

  /**
   * DELETE /secciones/:id
   * Solo elimina si no hay valores morfológicos que referencien
   * esta sección (mismo name + habit).
   */
  async remove(id: string): Promise<{ message: string }> {
    const section = await this.sectionsRepo.findOne({ where: { id } });
    if (!section) throw new NotFoundException(`Sección ${id} no encontrada`);

    const inUse = await this.morphologyRepo
      .createQueryBuilder('m')
      .where('LOWER(m.habit) = :habit', { habit: this.normalize(section.habit) })
      .andWhere('LOWER(m.section) = :section', { section: this.normalize(section.name) })
      .getCount();

    if (inUse > 0) {
      throw new ConflictException(
        `No se puede eliminar: la sección "${section.name}" tiene ${inUse} campo(s) morfológico(s) asociado(s). ` +
        'Reasigna o elimina esos campos primero.',
      );
    }

    await this.sectionsRepo.delete(id);
    return { message: `Sección "${section.name}" eliminada correctamente` };
  }
}
