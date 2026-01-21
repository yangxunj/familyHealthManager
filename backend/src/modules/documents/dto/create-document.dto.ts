import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';

export class FileInfoDto {
  @IsString()
  url: string;

  @IsString()
  name: string;

  @IsString()
  originalName: string;

  @IsOptional()
  size?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateDocumentDto {
  @IsUUID()
  memberId: string;

  @IsEnum(DocumentType, { message: '请选择有效的文档类型' })
  type: DocumentType;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsDateString({}, { message: '请输入有效的检查日期' })
  checkDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileInfoDto)
  files: FileInfoDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
