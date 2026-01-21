import { IsUUID } from 'class-validator';

export class GenerateAdviceDto {
  @IsUUID()
  memberId: string;
}
