import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';

export enum LeadStatus {
    NEW = 'NEW',
    CONTACTED = 'CONTACTED',
    QUALIFIED = 'QUALIFIED',
    CONVERTED = 'CONVERTED',
    LOST = 'LOST',
}

export enum LeadSource {
    WEBSITE = 'WEBSITE',
    PHONE = 'PHONE',
    WALK_IN = 'WALK_IN',
    REFERRAL = 'REFERRAL',
    SOCIAL_MEDIA = 'SOCIAL_MEDIA',
    OTHER = 'OTHER',
}

export class CreateLeadDto {
    @IsString()
    @IsNotEmpty()
    customerName: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    vehicleModel?: string;

    @IsString()
    @IsOptional()
    vehicleRegistration?: string;

    @IsString()
    @IsOptional()
    serviceType?: string;

    @IsEnum(LeadSource)
    @IsOptional()
    source?: LeadSource = LeadSource.WEBSITE;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsString()
    @IsNotEmpty()
    serviceCenterId: string;

    @IsString()
    @IsOptional()
    assignedTo?: string; // User ID
}
