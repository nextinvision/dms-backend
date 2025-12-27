import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';

export class CreateInventoryPartDto {
    @IsUUID()
    @IsNotEmpty()
    serviceCenterId: string;

    // Basic Part Information
    @IsString()
    @IsOptional()
    oemPartNumber?: string;

    @IsString()
    @IsNotEmpty()
    partName: string;

    @IsString()
    @IsNotEmpty()
    partNumber: string;

    @IsString()
    @IsOptional()
    originType?: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsOptional()
    description?: string;

    // Stock Information
    @IsNumber()
    @IsNotEmpty()
    stockQuantity: number;

    @IsNumber()
    @IsNotEmpty()
    minStockLevel: number;

    @IsNumber()
    @IsNotEmpty()
    maxStockLevel: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsString()
    @IsOptional()
    location?: string;

    // Part Details
    @IsString()
    @IsOptional()
    brandName?: string;

    @IsString()
    @IsOptional()
    variant?: string;

    @IsString()
    @IsOptional()
    partType?: string;

    @IsString()
    @IsOptional()
    color?: string;

    // Pricing - Purchase
    @IsNumber()
    @IsNotEmpty()
    costPrice: number;

    @IsNumber()
    @IsOptional()
    pricePreGst?: number;

    @IsNumber()
    @IsOptional()
    gstRateInput?: number;

    @IsNumber()
    @IsOptional()
    gstInput?: number;

    // Pricing - Sale
    @IsNumber()
    @IsNotEmpty()
    unitPrice: number;

    @IsNumber()
    @IsNotEmpty()
    gstRate: number;

    @IsNumber()
    @IsOptional()
    gstRateOutput?: number;

    @IsNumber()
    @IsOptional()
    totalPrice?: number;

    @IsNumber()
    @IsOptional()
    totalGst?: number;

    // Labour Information
    @IsString()
    @IsOptional()
    labourName?: string;

    @IsString()
    @IsOptional()
    labourCode?: string;

    @IsString()
    @IsOptional()
    labourWorkTime?: string;

    @IsNumber()
    @IsOptional()
    labourRate?: number;

    @IsNumber()
    @IsOptional()
    labourGstRate?: number;

    @IsNumber()
    @IsOptional()
    labourPrice?: number;

    // Flags
    @IsBoolean()
    @IsOptional()
    highValuePart?: boolean;
}
