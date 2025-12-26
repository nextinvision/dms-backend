import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { JobCardPriority, AppointmentLocation } from '@prisma/client';
import { Type } from 'class-transformer';

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

export class JobCardPart1Dto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsString()
    @IsNotEmpty()
    mobilePrimary: string;

    @IsString()
    @IsOptional()
    customerType?: string;

    @IsString()
    @IsNotEmpty()
    vehicleBrand: string;

    @IsString()
    @IsNotEmpty()
    vehicleModel: string;

    @IsString()
    @IsNotEmpty()
    registrationNumber: string;

    @IsString()
    @IsNotEmpty()
    vinChassisNumber: string;

    @IsString()
    @IsOptional()
    variantBatteryCapacity?: string;

    @IsString()
    @IsOptional()
    warrantyStatus?: string;

    @IsString()
    @IsOptional()
    estimatedDeliveryDate?: string;

    @IsString()
    @IsOptional()
    customerAddress?: string;

    @IsString()
    @IsNotEmpty()
    customerFeedback: string;

    @IsString()
    @IsOptional()
    technicianObservation?: string;

    @IsString()
    @IsOptional()
    insuranceStartDate?: string;

    @IsString()
    @IsOptional()
    insuranceEndDate?: string;

    @IsString()
    @IsOptional()
    insuranceCompanyName?: string;

    @IsString()
    @IsOptional()
    batterySerialNumber?: string;

    @IsString()
    @IsOptional()
    mcuSerialNumber?: string;

    @IsString()
    @IsOptional()
    vcuSerialNumber?: string;

    @IsString()
    @IsOptional()
    otherPartSerialNumber?: string;
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

export class JobCardItemDto {
    @IsNotEmpty()
    srNo: number;

    @IsBoolean()
    @IsOptional()
    partWarrantyTag?: boolean = false;

    @IsString()
    @IsNotEmpty()
    partName: string;

    @IsString()
    @IsNotEmpty()
    partCode: string;

    @IsNotEmpty()
    qty: number;

    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    technician?: string;

    @IsString()
    @IsOptional()
    labourCode?: string;

    @IsString()
    @IsNotEmpty()
    itemType: string; // "part" | "work_item"
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
    priority?: JobCardPriority = JobCardPriority.NORMAL;

    @IsEnum(AppointmentLocation)
    @IsOptional()
    location?: AppointmentLocation = AppointmentLocation.STATION;

    @IsBoolean()
    @IsOptional()
    isTemporary?: boolean = true;

    @ValidateNested()
    @Type(() => JobCardPart1Dto)
    @IsOptional()
    part1?: JobCardPart1Dto;

    @IsObject()
    @IsOptional()
    part2A?: Part2ADataDto;

    @IsString()
    @IsOptional()
    uploadedBy?: string; // User ID who uploaded the files

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => JobCardItemDto)
    items?: JobCardItemDto[];
}

