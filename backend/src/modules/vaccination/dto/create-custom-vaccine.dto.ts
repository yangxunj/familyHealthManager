import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateCustomVaccineDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsIn(['ONCE', 'YEARLY', 'MULTI_DOSE'])
  frequency: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  totalDoses?: number = 1;

  @IsOptional()
  @IsString()
  description?: string;
}
