import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminRefreshDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  refreshToken!: string;
}
