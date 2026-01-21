import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from '@prisma/client';
import { FileInfoDto } from './create-document.dto';

export class UpdateDocumentDto {
  @IsOptional()
  @IsEnum(DocumentType, { message: '请选择有效的文档类型' })
  type?: DocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsDateString({}, { message: '请输入有效的检查日期' })
  checkDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileInfoDto)
  files?: FileInfoDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
