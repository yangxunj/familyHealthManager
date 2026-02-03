import { IsString, Length } from 'class-validator';

export class JoinFamilyDto {
  @IsString()
  @Length(8, 8)
  inviteCode: string;
}
