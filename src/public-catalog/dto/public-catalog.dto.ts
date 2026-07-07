import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO del buscador morfológico.
 * Los filtros morfológicos ya no están hardcodeados — se leen de la BD
 * (morphological_values.use_in_search = true) y se pasan como query params
 * con el field_name slugificado.
 *
 * Ejemplo de uso:
 *   GET /catalogo/buscar?habit=árbol&tipo_de_ramificacion=Erecta&color_de_flor=Blanco
 *
 * El DTO solo declara los campos fijos (habit, page, limit).
 * Los filtros morfológicos dinámicos llegan en el objeto completo del request.
 */
export class SearchSpeciesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  habit?: string;

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

  // Permite campos dinámicos adicionales (filtros morfológicos)
  [key: string]: unknown;
}
