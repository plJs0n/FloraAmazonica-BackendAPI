import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsNotEmpty,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSpeciesRecordDto {
  @IsString()
  @IsNotEmpty()
  scientific_name: string;

  @IsString()
  @IsNotEmpty()
  family: string;

  @IsString()
  @IsNotEmpty()
  habit: string;

  @IsString()
  @IsOptional()
  life_type?: string;

  @IsArray()
  @IsOptional()
  country_distribution?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  crown_diameter_parallel?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  crown_diameter_perpendicular?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  crown_base_height?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cap?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsObject()
  @IsOptional()
  morphological_data?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  is_draft?: boolean;

  @IsString()
  @IsOptional()
  author_name?: string;

  @IsString()
  @IsOptional()
  local_name?: string;

  @IsUUID()
  @IsOptional()
  species_catalog_id?: string;
}

export class UpdateSpeciesRecordDto {
  @IsString()
  @IsOptional()
  scientific_name?: string;

  @IsString()
  @IsOptional()
  family?: string;

  @IsString()
  @IsOptional()
  habit?: string;

  @IsArray()
  @IsOptional()
  country_distribution?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  crown_diameter_parallel?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  crown_diameter_perpendicular?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  crown_base_height?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cap?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsObject()
  @IsOptional()
  morphological_data?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  is_draft?: boolean;

  @IsString()
  @IsOptional()
  author_name?: string;

  @IsString()
  @IsOptional()
  local_name?: string;

  @IsUUID()
  @IsOptional()
  species_catalog_id?: string;
}

export class UploadPhotoDto {
  @IsUUID()
  species_record_id: string;

  @IsString()
  @IsNotEmpty()
  photo_type: string;
}
