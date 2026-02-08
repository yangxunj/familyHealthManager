import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateVaccineRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  vaccineCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vaccineName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  doseNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  totalDoses?: number;

  @IsOptional()
  @IsDateString()
  vaccinatedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  batchNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
