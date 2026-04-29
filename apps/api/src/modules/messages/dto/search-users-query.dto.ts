import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}
