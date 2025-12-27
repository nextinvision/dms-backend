import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsDateString, IsObject, IsArray, IsBoolean } from 'class-validator';
import { AppointmentLocation } from '@prisma/client';

export class DocumentationFilesDto {
    @IsArray()
    @IsOptional()
    customerIdProof?: Array<{
        url: string;
        publicId: string;
        filename: string;
        format: string;
        bytes: number;
        width?: number;
        height?: number;
    }>;

    @IsArray()
    @IsOptional()
    vehicleRCCopy?: Array<{
        url: string;
        publicId: string;
        filename: string;
        format: string;
        bytes: number;
        width?: number;
        height?: number;
    }>;

    @IsArray()
    @IsOptional()
    warrantyCardServiceBook?: Array<{
        url: string;
        publicId: string;
        filename: string;
        format: string;
        bytes: number;
        width?: number;
        height?: number;
    }>;

    @IsArray()
    @IsOptional()
    photosVideos?: Array<{
        url: string;
        publicId: string;
        filename: string;
        format: string;
        bytes: number;
        width?: number;
        height?: number;
        duration?: number;
    }>;
}

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

    @IsObject()
    @IsOptional()
    documentationFiles?: DocumentationFilesDto;

    @IsString()
    @IsOptional()
    uploadedBy?: string; // User ID who uploaded the files

    // Operational Details
    @IsDateString()
    @IsOptional()
    estimatedDeliveryDate?: string;

    @IsString()
    @IsOptional()
    assignedServiceAdvisor?: string;

    @IsString()
    @IsOptional()
    assignedTechnician?: string;

    @IsBoolean()
    @IsOptional()
    pickupDropRequired?: boolean;

    @IsString()
    @IsOptional()
    pickupAddress?: string;

    @IsString()
    @IsOptional()
    pickupState?: string;

    @IsString()
    @IsOptional()
    pickupCity?: string;

    @IsString()
    @IsOptional()
    pickupPincode?: string;

    @IsString()
    @IsOptional()
    dropAddress?: string;

    @IsString()
    @IsOptional()
    dropState?: string;

    @IsString()
    @IsOptional()
    dropCity?: string;

    @IsString()
    @IsOptional()
    dropPincode?: string;

    @IsString()
    @IsOptional()
    preferredCommunicationMode?: string;

    @IsString()
    @IsOptional()
    previousServiceHistory?: string;

    @IsString()
    @IsOptional()
    estimatedServiceTime?: string;

    @IsString()
    @IsOptional()
    odometerReading?: string;

    @IsString()
    @IsOptional()
    duration?: string;
}
