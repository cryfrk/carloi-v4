import { IsString, Length, Matches } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  identifier!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/)
  code!: string;
}
