import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '姓名至少2个字符' })
  @MaxLength(50, { message: '姓名最多50个字符' })
  name?: string;
}
