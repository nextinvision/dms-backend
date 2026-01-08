import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsNumber, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum HomeServiceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateHomeServiceDto {
  @IsUUID()
  @IsNotEmpty()
  serviceCenterId: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsNotEmpty()
  vehicleModel: string;

  @IsString()
  @IsNotEmpty()
  registration: string;

  @IsString()
  @IsNotEmpty()
  serviceAddress: string;

  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsString()
  @IsNotEmpty()
  scheduledTime: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  estimatedCost: number;

  @IsUUID()
  @IsOptional()
  assignedEngineerId?: string;

  @IsEnum(HomeServiceStatus)
  @IsOptional()
  status?: HomeServiceStatus;
}

