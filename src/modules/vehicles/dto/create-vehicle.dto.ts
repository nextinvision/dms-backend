import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
    @IsUUID()
    @IsNotEmpty()
    customerId: string;

    @IsString()
    @IsNotEmpty()
    registration: string;

    @IsString()
    @IsOptional()
    vin?: string;

    @IsString()
    @IsNotEmpty()
    vehicleMake: string;

    @IsString()
    @IsNotEmpty()
    vehicleModel: string;

    @IsInt()
    @IsNotEmpty()
    vehicleYear: number;

    @IsString()
    @IsOptional()
    variant?: string;

    @IsString()
    @IsOptional()
    vehicleColor?: string;

    @IsString()
    @IsOptional()
    motorNumber?: string;

    @IsString()
    @IsOptional()
    chargerSerialNumber?: string;

    @IsDateString()
    @IsOptional()
    purchaseDate?: string;

    @IsString()
    @IsOptional()
    warrantyStatus?: string;

    @IsDateString()
    @IsOptional()
    insuranceStartDate?: string;

    @IsDateString()
    @IsOptional()
    insuranceEndDate?: string;

    @IsString()
    @IsOptional()
    insuranceCompanyName?: string;
}
