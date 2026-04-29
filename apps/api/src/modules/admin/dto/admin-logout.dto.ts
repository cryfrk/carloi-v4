import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLogoutDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  refreshToken!: string;
}
