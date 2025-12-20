import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { AppointmentLocation } from '@prisma/client';

export class CreateAppointmentDto {
    @IsUUID()
    @IsNotEmpty()
    customerId: string;

    @IsUUID()
    @IsNotEmpty()
    vehicleId: string;

    @IsUUID()
    @IsNotEmpty()
    serviceCenterId: string;

    @IsString()
    @IsNotEmpty()
    serviceType: string;

    @IsDateString()
    @IsNotEmpty()
    appointmentDate: string;

    @IsString()
    @IsNotEmpty()
    appointmentTime: string;

    @IsString()
    @IsOptional()
    customerComplaint?: string;

    @IsEnum(AppointmentLocation)
    @IsOptional()
    location?: AppointmentLocation = AppointmentLocation.STATION;

    @IsNumber()
    @IsOptional()
    estimatedCost?: number;
}
