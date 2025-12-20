import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';
import { JobCardPriority, AppointmentLocation } from '@prisma/client';

export class CreateJobCardDto {
    @IsUUID()
    @IsNotEmpty()
    serviceCenterId: string;

    @IsUUID()
    @IsNotEmpty()
    customerId: string;

    @IsUUID()
    @IsNotEmpty()
    vehicleId: string;

    @IsUUID()
    @IsOptional()
    appointmentId?: string;

    @IsString()
    @IsNotEmpty()
    serviceType: string;

    @IsEnum(JobCardPriority)
    @IsOptional()
    priority?: JobCardPriority = JobCardPriority.MEDIUM;

    @IsEnum(AppointmentLocation)
    @IsOptional()
    location?: AppointmentLocation = AppointmentLocation.STATION;

    @IsObject()
    @IsOptional()
    part1Data?: any;
}
