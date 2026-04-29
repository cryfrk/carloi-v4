import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
