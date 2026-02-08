import { IsOptional, IsUUID } from 'class-validator';

export class QueryVaccineRecordDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
