import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject, IsArray } from 'class-validator';
import { JobCardPriority, AppointmentLocation } from '@prisma/client';

export class WarrantyDocumentationFilesDto {
    @IsArray()
    @IsOptional()
    videoEvidence?: Array<{
        url: string;
        publicId: string;
        filename: string;
        format: string;
        bytes: number;
        duration?: number;
    }>;

    @IsArray()
    @IsOptional()
    vinImage?: Array<{
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
    odoImage?: Array<{
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
    damageImages?: Array<{
        url: string;
        publicId: string;
        filename: string;
        format: string;
        bytes: number;
        width?: number;
        height?: number;
    }>;
}

export class Part2ADataDto {
    @IsString()
    @IsOptional()
    issueDescription?: string;

    @IsString()
    @IsOptional()
    numberOfObservations?: string;

    @IsString()
    @IsOptional()
    symptom?: string;

    @IsString()
    @IsOptional()
    defectPart?: string;

    @IsObject()
    @IsOptional()
    files?: WarrantyDocumentationFilesDto;
}

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

    @IsObject()
    @IsOptional()
    part2AData?: Part2ADataDto;

    @IsString()
    @IsOptional()
    uploadedBy?: string; // User ID who uploaded the files
}
