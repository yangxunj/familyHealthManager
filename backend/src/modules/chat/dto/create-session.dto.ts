import { IsUUID, IsOptional, IsString, MaxLength, IsIn, IsInt, Min } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  // 来源追踪字段（从健康建议页面创建时使用）
  @IsOptional()
  @IsUUID()
  sourceAdviceId?: string;

  @IsOptional()
  @IsIn(['concern', 'suggestion', 'action'])
  sourceItemType?: 'concern' | 'suggestion' | 'action';

  @IsOptional()
  @IsInt()
  @Min(0)
  sourceItemIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceItemTitle?: string;
}
