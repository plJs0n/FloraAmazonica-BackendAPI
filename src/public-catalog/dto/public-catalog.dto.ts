import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query params del buscador morfológico.
 * Todos los filtros son opcionales y combinables entre sí.
 * El ranking prioriza registros con más coincidencias.
 */
export class SearchSpeciesDto {
  @IsOptional()
  @IsString()
  habit?: string;

  @IsOptional()
  @IsString()
  flower_type?: string;

  @IsOptional()
  @IsString()
  flower_color?: string;

  @IsOptional()
  @IsString()
  fruit_type?: string;

  @IsOptional()
  @IsString()
  seed_type?: string;

  @IsOptional()
  @IsString()
  exudate_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
