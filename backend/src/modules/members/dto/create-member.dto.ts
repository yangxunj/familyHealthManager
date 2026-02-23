import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Relationship, Gender, BloodType } from '@prisma/client';

export class CreateMemberDto {
  @IsString()
  @MinLength(1, { message: '姓名不能为空' })
  @MaxLength(100, { message: '姓名最多100个字符' })
  name: string;

  @IsEnum(Relationship, { message: '请选择有效的关系' })
  relationship: Relationship;

  @IsEnum(Gender, { message: '请选择有效的性别' })
  gender: Gender;

  @IsDateString({}, { message: '请输入有效的出生日期' })
  birthDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  weight?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicDiseases?: string[];

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  linkToCurrentUser?: boolean;
}
