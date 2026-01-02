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

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsNumber()
    @IsOptional()
    serialNumber?: number;
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

    @IsUUID()
    @IsOptional()
    jobCardId?: string;

    @IsString()
    @IsOptional()
    quotationDate?: string;

    @IsString()
    @IsOptional()
    validUntil?: string;

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
    notes?: string;

    @IsString()
    @IsOptional()
    noteTemplateId?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsBoolean()
    @IsOptional()
    passedToManager?: boolean;

    @IsString()
    @IsOptional()
    passedToManagerAt?: string;

    @IsString()
    @IsOptional()
    managerId?: string;

    @IsString()
    @IsOptional()
    customerApprovalStatus?: string;

    @IsString()
    @IsOptional()
    customerApprovedAt?: string;

    @IsString()
    @IsOptional()
    customerRejectionReason?: string;

    @IsString()
    @IsOptional()
    leadId?: string;

    @IsString()
    @IsOptional()
    quotationNumber?: string;

    @IsNumber()
    @IsOptional()
    subtotal?: number;

    @IsNumber()
    @IsOptional()
    discount?: number = 0;

    @IsNumber()
    @IsOptional()
    discountPercent?: number;

    @IsNumber()
    @IsOptional()
    preGstAmount?: number;

    @IsNumber()
    @IsOptional()
    cgst?: number;

    @IsNumber()
    @IsOptional()
    sgst?: number;

    @IsNumber()
    @IsOptional()
    igst?: number;

    @IsNumber()
    @IsOptional()
    totalAmount?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuotationItemDto)
    items: QuotationItemDto[];
}
