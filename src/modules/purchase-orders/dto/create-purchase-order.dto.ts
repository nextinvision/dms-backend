import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class POItemDto {
    @IsUUID()
    @IsOptional()
    centralInventoryPartId?: string;

    @IsUUID()
    @IsOptional()
    inventoryPartId?: string;  // Service Center Inventory Part ID

    // Part Information (will be populated from inventory if not provided)
    @IsString()
    @IsOptional()
    partName?: string;  // Part name for display

    @IsString()
    @IsOptional()
    partNumber?: string;  // Internal Part Number

    @IsString()
    @IsOptional()
    oemPartNumber?: string;  // OEM Part Number

    @IsString()
    @IsOptional()
    category?: string;  // Category

    @IsString()
    @IsOptional()
    originType?: string;  // OLD/NEW

    @IsString()
    @IsOptional()
    description?: string;  // Description

    @IsString()
    @IsOptional()
    brandName?: string;  // Brand Name

    @IsString()
    @IsOptional()
    variant?: string;  // Variant

    @IsString()
    @IsOptional()
    partType?: string;  // Part Type

    @IsString()
    @IsOptional()
    color?: string;  // Color

    @IsString()
    @IsOptional()
    unit?: string;  // Unit of measurement

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsNumber()
    @IsNotEmpty()
    unitPrice: number;

    @IsNumber()
    @IsNotEmpty()
    gstRate: number;

    @IsString()
    @IsOptional()
    urgency?: string;  // low, medium, high

    @IsString()
    @IsOptional()
    notes?: string;  // Part-specific notes
}

export class CreatePurchaseOrderDto {
    @IsUUID()
    @IsOptional()
    supplierId?: string;

    @IsUUID()
    @IsOptional()
    fromServiceCenterId?: string;  // Service center creating the order

    @IsUUID()
    @IsOptional()
    requestedById?: string;  // User creating the order

    @IsDateString()
    @IsNotEmpty()
    orderDate: string;

    @IsDateString()
    @IsOptional()
    expectedDeliveryDate?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => POItemDto)
    items: POItemDto[];

    @IsString()
    @IsOptional()
    paymentTerms?: string;

    @IsString()
    @IsOptional()
    orderNotes?: string;  // General order notes
}
