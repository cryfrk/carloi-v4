import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MaxLength(600)
  body!: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
