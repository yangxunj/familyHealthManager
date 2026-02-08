import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateCheckItemDto {
  @IsUUID()
  memberId: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsInt()
  @Min(1)
  @Max(120)
  intervalMonths: number;

  @IsOptional()
  @IsString()
  description?: string;
}
