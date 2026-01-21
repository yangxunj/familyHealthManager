import { IsUUID, IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { RecordType } from '@prisma/client';

export class QueryRecordDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(RecordType)
  recordType?: RecordType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class QueryTrendDto {
  @IsUUID()
  memberId: string;

  @IsEnum(RecordType)
  recordType: RecordType;

  @IsOptional()
  @IsString()
  period?: 'week' | 'month' | 'quarter' | 'all'; // 7天/30天/90天/全部
}
