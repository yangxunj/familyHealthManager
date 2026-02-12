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
  @IsIn(['alibaba', 'google'])
  aiProvider?: string;

  @IsOptional()
  @IsString()
  @IsIn(['qwen3-max', 'glm-4.7', 'deepseek-v3.2', 'kimi-k2.5'])
  dashscopeModel?: string;

  @IsOptional()
  @IsString()
  @IsIn(['gemini-3-flash-preview', 'gemini-3-pro-preview'])
  geminiModel?: string;
}
