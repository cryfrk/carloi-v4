import { IsEnum, IsString } from 'class-validator';
import { VerificationChannel } from '../auth.constants';

export class SendVerificationCodeDto {
  @IsString()
  identifier!: string;

  @IsEnum(VerificationChannel)
  channel!: VerificationChannel;
}
