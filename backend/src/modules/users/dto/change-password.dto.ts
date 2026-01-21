import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: '新密码至少6个字符' })
  @MaxLength(100, { message: '新密码最多100个字符' })
  newPassword: string;
}
