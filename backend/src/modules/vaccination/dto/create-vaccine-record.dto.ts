import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateVaccineRecordDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vaccineCode?: string;

  @IsString()
  @MaxLength(100)
  vaccineName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  doseNumber?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  totalDoses?: number;

  @IsDateString()
  vaccinatedAt: string;

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
