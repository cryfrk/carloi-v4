import { UserType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEnum(UserType)
  userType!: UserType;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9._-]{3,30}$/)
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9\s()-]{10,20}$/)
  phone?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{11}$/)
  tcIdentityNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyTitle?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10,15}$/)
  taxNumber?: string;
}
