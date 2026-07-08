import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { SpeciesRecord } from './entities/species-record.entity';
import { SpeciesPhoto } from './entities/species-photo.entity';
import { CreateSpeciesRecordDto, UpdateSpeciesRecordDto, UploadPhotoDto } from './dto/species.dto';
import { RecordStatus } from '../common/enums/record-status.enum';
import { PhotoType } from '../common/enums/photo-type.enum';
import { generateTrackingCode } from '../common/utils/tracking-code.util';
import { normalizeText } from '../common/utils/normalize-text.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';

const REQUIRED_PHOTO_TYPES = Object.values(PhotoType);

@Injectable()
export class SpeciesService {
  constructor(
    @InjectRepository(SpeciesRecord)
    private speciesRecordRepo: Repository<SpeciesRecord>,
    @InjectRepository(SpeciesPhoto)
    private speciesPhotoRepo: Repository<SpeciesPhoto>,
    private cloudinaryService: CloudinaryService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Calcula DAP a partir de CAP: DAP = CAP / π
   */
  private calculateDap(cap: number): number {
    return cap / Math.PI;
  }

  /**
   * Verifica que el registro sea editable (solo en_revision u observado)
   */
  private assertEditable(record: SpeciesRecord): void {
    const editableStatuses = [RecordStatus.EN_REVISION, RecordStatus.OBSERVADO];
    if (!editableStatuses.includes(record.status)) {
      throw new ForbiddenException(
        `Solo se pueden modificar registros en estado "en_revision" u "observado". Estado actual: ${record.status}`,
      );
    }
  }

  /**
   * Genera el siguiente código de seguimiento para el año actual
   */
  private async generateNextTrackingCode(): Promise<string> {
    const year = new Date().getFullYear();
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);

    const count = await this.speciesRecordRepo
      .createQueryBuilder('r')
      .where('r.tracking_code IS NOT NULL')
      .andWhere('r.submitted_at >= :start', { start: startOfYear })
      .andWhere('r.submitted_at <= :end', { end: endOfYear })
      .getCount();

    return generateTrackingCode(count + 1);
  }

  /**
   * POST /especies — Crear registro (borrador o envío)
   */
  async create(dto: CreateSpeciesRecordDto, user: User): Promise<SpeciesRecord> {
    const isDraft = dto.is_draft !== false; // default true

    // Si no es borrador (se está enviando), validar campos completos
    if (!isDraft) {
      await this.validateForSubmission(dto, user.id);
    }

    // Validar coordenadas únicas (solo si se proveen)
    if (dto.latitude != null && dto.longitude != null) {
      const duplicate = await this.speciesRecordRepo.findOne({
        where: { latitude: dto.latitude, longitude: dto.longitude },
      });
      if (duplicate) {
        throw new ConflictException(
          `Ya existe un registro con las coordenadas (${dto.latitude}, ${dto.longitude})`,
        );
      }
    }

    // Calcular DAP si hábito es árbol
    let dap: number = null;
    if (normalizeText(dto.habit) === 'arbol' && dto.cap != null) {
      dap = this.calculateDap(dto.cap);
    }

    const record = this.speciesRecordRepo.create({
      ...dto,
      registrar_id: user.id,
      dap,
      is_draft: isDraft,
      status: isDraft ? RecordStatus.BORRADOR : RecordStatus.EN_REVISION,
      submitted_at: isDraft ? null : new Date(),
      country_distribution: dto.country_distribution ?? [],
      morphological_data: dto.morphological_data ?? {},
    });

    if (!isDraft) {
      record.tracking_code = await this.generateNextTrackingCode();
    }

    const saved = await this.speciesRecordRepo.save(record);

    // Notificar al registrador cuando el registro se envía (no borrador)
    if (!isDraft) {
      this.notificationsService.notifyRecordReceived(user, saved).catch(() => null);
    }

    return saved;
  }

  /**
   * Validaciones al enviar (is_draft = false)
   */
  private async validateForSubmission(
    dto: CreateSpeciesRecordDto,
    userId: string,
    existingRecordId?: string,
  ): Promise<void> {
    if (!dto.scientific_name) throw new BadRequestException('El nombre científico es obligatorio');
    if (!dto.family) throw new BadRequestException('La familia es obligatoria');
    if (!dto.habit) throw new BadRequestException('El hábito es obligatorio');
    if (dto.latitude == null) throw new BadRequestException('La latitud es obligatoria');
    if (dto.longitude == null) throw new BadRequestException('La longitud es obligatoria');

    // Validar 5 fotos si existe el registro previo
    if (existingRecordId) {
      const photos = await this.speciesPhotoRepo.find({
        where: { species_record_id: existingRecordId },
      });
      const uploadedTypes = new Set(photos.map((p) => p.photo_type));
      const missingTypes = REQUIRED_PHOTO_TYPES.filter((t) => !uploadedTypes.has(t));
      if (missingTypes.length > 0) {
        throw new BadRequestException(
          `Faltan las siguientes fotos para enviar: ${missingTypes.join(', ')}`,
        );
      }
    }
  }

  /**
   * GET /especies — Listar registros propios con estado
   */
  async findAll(user: User): Promise<SpeciesRecord[]> {
    return this.speciesRecordRepo.find({
      where: { registrar_id: user.id },
      relations: ['photos'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * GET /especies/:id — Detalle de un registro
   */
  async findOne(id: string, user: User): Promise<SpeciesRecord> {
    const record = await this.speciesRecordRepo.findOne({
      where: { id, registrar_id: user.id },
      relations: ['photos', 'species_catalog'],
    });

    if (!record) {
      throw new NotFoundException(`Registro ${id} no encontrado`);
    }

    return record;
  }

  /**
   * PATCH /especies/:id — Editar registro (solo en_revision u observado)
   */
  async update(id: string, dto: UpdateSpeciesRecordDto, user: User): Promise<SpeciesRecord> {
    const record = await this.findOne(id, user);
    this.assertEditable(record);

    // Validar coordenadas únicas si cambian
    if (
      (dto.latitude != null || dto.longitude != null) &&
      (dto.latitude !== record.latitude || dto.longitude !== record.longitude)
    ) {
      const newLat = dto.latitude ?? record.latitude;
      const newLng = dto.longitude ?? record.longitude;

      const duplicate = await this.speciesRecordRepo.findOne({
        where: { latitude: newLat, longitude: newLng },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `Ya existe un registro con las coordenadas (${newLat}, ${newLng})`,
        );
      }
    }

    // Recalcular DAP si cambia hábito o CAP
    const habit = dto.habit ?? record.habit;
    const cap = dto.cap ?? record.cap;

    let dap = record.dap;
    if (normalizeText(habit) === 'arbol' && cap != null) {
      dap = this.calculateDap(cap);
    } else if (normalizeText(habit) !== 'arbol') {
      dap = null;
    }

    await this.speciesRecordRepo.update(id, {
      ...dto,
      dap,
    });

    return this.findOne(id, user);
  }

  /**
   * DELETE /especies/:id — Eliminar registro (solo en_revision u observado)
   */
  async remove(id: string, user: User): Promise<{ message: string }> {
    const record = await this.findOne(id, user);
    this.assertEditable(record);

    // Eliminar fotos de Cloudinary
    if (record.photos?.length) {
      await Promise.all(
        record.photos.map((photo) =>
          this.cloudinaryService.deleteImage(photo.cloudinary_public_id).catch(() => null),
        ),
      );
    }

    await this.speciesRecordRepo.remove(record);
    return { message: 'Registro eliminado correctamente' };
  }

  /**
   * POST /especies/fotos — Subir foto a Cloudinary
   */
  async uploadPhoto(
    file: Express.Multer.File,
    dto: UploadPhotoDto,
    user: User,
  ): Promise<SpeciesPhoto> {
    // Validar que el tipo de foto sea válido
    if (!Object.values(PhotoType).includes(dto.photo_type as PhotoType)) {
      throw new BadRequestException(
        `Tipo de foto inválido. Valores permitidos: ${Object.values(PhotoType).join(', ')}`,
      );
    }

    // Verificar que el registro existe y pertenece al usuario
    const record = await this.speciesRecordRepo.findOne({
      where: { id: dto.species_record_id, registrar_id: user.id },
    });

    if (!record) {
      throw new NotFoundException(`Registro ${dto.species_record_id} no encontrado`);
    }

    // Subir a Cloudinary
    const folder = `species/${dto.species_record_id}`;
    const result = await this.cloudinaryService.uploadImage(file.buffer, folder);

    // Si ya existe una foto del mismo tipo para este registro, reemplazarla
    const existing = await this.speciesPhotoRepo.findOne({
      where: {
        species_record_id: dto.species_record_id,
        photo_type: dto.photo_type as PhotoType,
      },
    });

    if (existing) {
      await this.cloudinaryService.deleteImage(existing.cloudinary_public_id).catch(() => null);
      await this.speciesPhotoRepo.remove(existing);
    }

    const photo = this.speciesPhotoRepo.create({
      species_record_id: dto.species_record_id,
      photo_type: dto.photo_type as PhotoType,
      cloudinary_url: result.url,
      cloudinary_public_id: result.public_id,
      author_id: user.id,
    });

    return this.speciesPhotoRepo.save(photo);
  }

  /**
   * Enviar borrador (cambiar is_draft → false)
   */
  async submit(id: string, user: User): Promise<SpeciesRecord> {
    const record = await this.findOne(id, user);

    if (!record.is_draft) {
      throw new BadRequestException('El registro ya fue enviado');
    }

    // Validar fotos completas
    const photos = await this.speciesPhotoRepo.find({
      where: { species_record_id: id },
    });
    const uploadedTypes = new Set(photos.map((p) => p.photo_type));
    const missingTypes = REQUIRED_PHOTO_TYPES.filter((t) => !uploadedTypes.has(t));

    if (missingTypes.length > 0) {
      throw new BadRequestException(
        `Faltan las siguientes fotos para enviar: ${missingTypes.join(', ')}`,
      );
    }

    if (record.latitude == null || record.longitude == null) {
      throw new BadRequestException('Las coordenadas son obligatorias para enviar');
    }

    const trackingCode = await this.generateNextTrackingCode();

    await this.speciesRecordRepo.update(id, {
      is_draft: false,
      status: RecordStatus.EN_REVISION,
      tracking_code: trackingCode,
      submitted_at: new Date(),
    });

    const submitted = await this.findOne(id, user);

    // Notificar al registrador que su borrador fue enviado a revisión
    this.notificationsService.notifyRecordReceived(user, submitted).catch(() => null);

    return submitted;
  }
}
