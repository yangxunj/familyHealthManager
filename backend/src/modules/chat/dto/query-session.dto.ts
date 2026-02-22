import { IsOptional, IsUUID, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySessionDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsIn(['GENERAL', 'FOOD_QUERY'])
  type?: 'GENERAL' | 'FOOD_QUERY';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
