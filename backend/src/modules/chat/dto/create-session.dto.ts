import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
