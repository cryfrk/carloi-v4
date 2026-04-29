import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectCommercialApplicationDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  rejectionReason!: string;
}
