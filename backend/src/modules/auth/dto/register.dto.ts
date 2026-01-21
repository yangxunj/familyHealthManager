import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: '姓名至少2个字符' })
  @MaxLength(50, { message: '姓名最多50个字符' })
  name: string;

  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  @MaxLength(100, { message: '密码最多100个字符' })
  password: string;
}
