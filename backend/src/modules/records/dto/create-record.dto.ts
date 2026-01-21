import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecordType, MeasurementContext } from '@prisma/client';

export class CreateRecordDto {
  @IsUUID()
  memberId: string;

  @IsDateString()
  recordDate: string;

  @IsEnum(RecordType)
  recordType: RecordType;

  @IsNumber()
  value: number;

  @IsString()
  @MaxLength(20)
  unit: string;

  @IsOptional()
  @IsEnum(MeasurementContext)
  context?: MeasurementContext;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// 单条记录项（用于批量添加）
export class RecordItemDto {
  @IsEnum(RecordType)
  recordType: RecordType;

  @IsNumber()
  value: number;

  @IsString()
  @MaxLength(20)
  unit: string;
}

// 批量添加记录 DTO（同一次测量的多个指标）
export class CreateBatchRecordDto {
  @IsUUID()
  memberId: string;

  @IsDateString()
  recordDate: string;

  @IsOptional()
  @IsEnum(MeasurementContext)
  context?: MeasurementContext;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordItemDto)
  records: RecordItemDto[];
}
