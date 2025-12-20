import { IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class POItemDto {
    @IsUUID()
    @IsNotEmpty()
    centralInventoryPartId: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsNumber()
    @IsNotEmpty()
    unitPrice: number;

    @IsNumber()
    @IsNotEmpty()
    gstRate: number;
}

export class CreatePurchaseOrderDto {
    @IsUUID()
    @IsNotEmpty()
    supplierId: string;

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
}
