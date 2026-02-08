import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateCheckRecordDto {
  @IsDateString()
  checkDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  doctor?: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
