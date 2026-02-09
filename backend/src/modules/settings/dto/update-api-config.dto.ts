import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateApiConfigDto {
  @IsOptional()
  @IsString()
  dashscopeApiKey?: string;

  @IsOptional()
  @IsString()
  googleApiKey?: string;

  @IsOptional()
  @IsString()
  @IsIn(['auto', 'alibaba', 'google'])
  aiProvider?: string;
}
