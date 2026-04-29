import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AdminAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
