import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateCheckItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  intervalMonths?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
