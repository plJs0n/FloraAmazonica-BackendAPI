import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsNotEmpty } from 'class-validator';
import { SelectionType, FieldType } from '../entities/morphological-value.entity';
import { Type } from 'class-transformer';

export class CreateMorphologicalValueDto {
  @IsString()
  @IsNotEmpty()
  habit: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsNotEmpty()
  field_name: string;

  @IsString()
  @IsNotEmpty()
  option_value: string;

  @IsEnum(SelectionType)
  @IsOptional()
  selection_type?: SelectionType;

  @IsEnum(FieldType)
  @IsOptional()
  field_type?: FieldType;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  display_order?: number;
}

export class UpdateMorphologicalValueDto {
  @IsString()
  @IsOptional()
  habit?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  field_name?: string;

  @IsString()
  @IsOptional()
  option_value?: string;

  @IsEnum(SelectionType)
  @IsOptional()
  selection_type?: SelectionType;

  @IsEnum(FieldType)
  @IsOptional()
  field_type?: FieldType;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  display_order?: number;
}
