import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: '请提供有效的刷新令牌' })
  refreshToken: string;
}
