import { IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';

export class SkipVaccineDto {
  @IsUUID()
  memberId: string;

  @IsString()
  @MaxLength(50)
  vaccineCode: string;

  @IsString()
  @MaxLength(20)
  seasonLabel: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
