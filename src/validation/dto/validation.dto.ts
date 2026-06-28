import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { RecordStatus } from '../../common/enums/record-status.enum';

/**
 * Estados a los que el validador puede transicionar un registro.
 * No puede pasar a 'borrador' ni a sí mismo desde aquí.
 */
export enum ValidatorAllowedStatus {
  EN_REVISION = 'en_revision',
  OBSERVADO = 'observado',
  VALIDADO = 'validado',
  RECHAZADO = 'rechazado',
}

export class ChangeStatusDto {
  @IsEnum(ValidatorAllowedStatus, {
    message: `Estado inválido. Valores permitidos: ${Object.values(ValidatorAllowedStatus).join(', ')}`,
  })
  status: ValidatorAllowedStatus;

  /**
   * Obligatorio cuando status es 'observado' o 'rechazado'
   */
  @ValidateIf((o) =>
    o.status === ValidatorAllowedStatus.OBSERVADO ||
    o.status === ValidatorAllowedStatus.RECHAZADO,
  )
  @IsString()
  @IsNotEmpty({ message: 'Las notas de observación son obligatorias para este estado' })
  observation_notes?: string;
}

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}
