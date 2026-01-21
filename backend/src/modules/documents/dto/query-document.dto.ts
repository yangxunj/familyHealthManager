import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class QueryDocumentDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
