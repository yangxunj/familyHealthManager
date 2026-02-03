import { IsString } from 'class-validator';

export class UpdateOcrTextDto {
  @IsString()
  ocrText: string;
}
