import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  habit: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  display_order?: number;
}

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  display_order?: number;
}
