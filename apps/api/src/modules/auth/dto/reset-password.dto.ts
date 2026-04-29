import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  identifier!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/)
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
