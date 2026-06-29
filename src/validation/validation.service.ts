import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { SpeciesRecord } from '../species/entities/species-record.entity';
import { RecordStatus } from '../common/enums/record-status.enum';
import { ChangeStatusDto, ValidatorAllowedStatus, PaginationDto } from './dto/validation.dto';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ValidationService {
  constructor(
    @InjectRepository(SpeciesRecord)
    private speciesRecordRepo: Repository<SpeciesRecord>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * GET /validacion/pendientes
   * Lista registros en cualquier estado excepto borrador, con paginación y filtro opcional por estado.
   */
  async findPending(dto: PaginationDto): Promise<PaginatedResult<SpeciesRecord>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const query = this.speciesRecordRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.photos', 'photos')
      .leftJoin('r.registrar', 'registrar')
      .addSelect([
        'registrar.id',
        'registrar.first_name',
        'registrar.paternal_last_name',
        'registrar.maternal_last_name',
        'registrar.email',
      ])
      .where('r.status != :borrador', { borrador: RecordStatus.BORRADOR })
      .orderBy('r.submitted_at', 'ASC') // más antiguos primero (FIFO)
      .skip(skip)
      .take(limit);

    // Filtro opcional por estado concreto
    if (dto.status) {
      query.andWhere('r.status = :status', { status: dto.status });
    }

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /validacion/:id
   * Ficha completa: datos del registro, fotos, coordenadas y registrador.
   * Excluye borradores.
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
        'registrar.email',
      ])
      .leftJoin('r.validator', 'validator')
      .addSelect([
        'validator.id',
        'validator.first_name',
        'validator.paternal_last_name',
        'validator.email',
      ])
      .leftJoinAndSelect('r.species_catalog', 'catalog')
      .where('r.id = :id', { id })
      .andWhere('r.status != :borrador', { borrador: RecordStatus.BORRADOR })
      .getOne();

    if (!record) {
      throw new NotFoundException(
        `Registro ${id} no encontrado o no disponible para validación`,
      );
    }

    return record;
  }

  /**
   * PATCH /validacion/:id/estado
   * El validador cambia el estado del registro.
   * - observation_notes obligatorio para 'observado' y 'rechazado'
   * - Al validar: registra validated_at y validator_id
   */
  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
    validator: User,
  ): Promise<SpeciesRecord> {
    const record = await this.findOne(id);

    // Validar que observation_notes está presente cuando es requerido
    const requiresNotes =
      dto.status === ValidatorAllowedStatus.OBSERVADO ||
      dto.status === ValidatorAllowedStatus.RECHAZADO;

    if (requiresNotes && !dto.observation_notes?.trim()) {
      throw new BadRequestException(
        `Las notas de observación son obligatorias cuando el estado es "${dto.status}"`,
      );
    }

    const updatePayload: Partial<SpeciesRecord> = {
      status: dto.status as unknown as RecordStatus,
      observation_notes: dto.observation_notes ?? record.observation_notes,
    };

    // Al validar: registrar timestamp y validador
    if (dto.status === ValidatorAllowedStatus.VALIDADO) {
      updatePayload.validated_at = new Date();
      updatePayload.validator_id = validator.id;

      // Notificar al registrador que su registro fue validado
      this.notificationsService
        .notifyStatusChanged(record.registrar as User, record, dto.status)
        .catch(() => null);
    }

    // Al observar o rechazar: limpiar validated_at si venía de un estado anterior
    if (
      dto.status === ValidatorAllowedStatus.OBSERVADO ||
      dto.status === ValidatorAllowedStatus.RECHAZADO
    ) {
      updatePayload.validated_at = null;
      updatePayload.validator_id = null;

      // Notificar al registrador con el nuevo estado y sus observaciones
      this.notificationsService
        .notifyStatusChanged(record.registrar as User, record, dto.status, dto.observation_notes)
        .catch(() => null);
    }

    await this.speciesRecordRepo.update(id, updatePayload);
    return this.findOne(id);
  }
}
