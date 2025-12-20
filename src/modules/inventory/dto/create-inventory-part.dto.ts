import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInventoryPartDto {
    @IsUUID()
    @IsNotEmpty()
    serviceCenterId: string;

    @IsString()
    @IsNotEmpty()
    partName: string;

    @IsString()
    @IsNotEmpty()
    partNumber: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsNumber()
    @IsNotEmpty()
    unitPrice: number;

    @IsNumber()
    @IsNotEmpty()
    costPrice: number;

    @IsNumber()
    @IsNotEmpty()
    gstRate: number;

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
    location?: string;
}
