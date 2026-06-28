import { IsString, IsOptional, IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';

export enum ImportMode {
  AGREGAR = 'agregar',
  REEMPLAZAR = 'reemplazar',
}

export class ImportCatalogDto {
  @IsEnum(ImportMode, { message: 'Modo debe ser "agregar" o "reemplazar"' })
  mode: ImportMode;
}

export class UpdateSpeciesCatalogDto {
  @IsString()
  @IsOptional()
  scientific_name?: string;

  @IsString()
  @IsOptional()
  family?: string;
}

export class ToggleStatusDto {
  @IsBoolean()
  is_active: boolean;
}

export class CatalogSearchDto {
  @IsString()
  @IsOptional()
  search?: string;
}
