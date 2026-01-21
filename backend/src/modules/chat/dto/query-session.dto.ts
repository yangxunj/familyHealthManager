import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySessionDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

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
