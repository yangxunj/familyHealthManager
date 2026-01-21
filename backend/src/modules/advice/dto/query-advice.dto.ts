import { IsUUID, IsOptional } from 'class-validator';

export class QueryAdviceDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
