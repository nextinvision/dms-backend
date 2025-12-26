import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuotationItemDto {
    @IsString()
    @IsNotEmpty()
    partName: string;

    @IsString()
    @IsOptional()
    partNumber?: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsNumber()
    @IsNotEmpty()
    rate: number;

    @IsNumber()
    @IsNotEmpty()
    gstPercent: number;
}

export class CreateQuotationDto {
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
    @IsOptional()
    quotationDate?: string;

    @IsString()
    @IsOptional()
    documentType?: string = 'Quotation';


    @IsBoolean()
    @IsOptional()
    hasInsurance?: boolean = false;

    @IsString()
    @IsOptional()
    insurerId?: string;

    @IsString()
    @IsOptional()
    insuranceStartDate?: string;

    @IsString()
    @IsOptional()
    insuranceEndDate?: string;

    @IsString()
    @IsOptional()
    batterySerialNumber?: string;

    @IsString()
    @IsOptional()
    customNotes?: string;

    @IsString()
    @IsOptional()
    noteTemplateId?: string;


    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuotationItemDto)
    items: QuotationItemDto[];

    @IsNumber()
    @IsOptional()
    discount?: number = 0;
}
