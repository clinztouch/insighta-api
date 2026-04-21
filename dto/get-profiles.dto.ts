import { IsOptional, IsString, IsInt, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetProfilesDto {
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;

  @IsOptional()
  @IsIn(['child', 'teenager', 'adult', 'senior'])
  age_group?: string;

  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  min_age?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  max_age?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_gender_probability?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_country_probability?: number;

  @IsOptional()
  @IsIn(['age', 'created_at', 'gender_probability'])
  sort_by?: 'age' | 'created_at' | 'gender_probability';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}