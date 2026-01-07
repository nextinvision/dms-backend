import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PartsRequestItemDto {
    @IsString()
    @IsNotEmpty()
    partName: string;

    @IsString()
    @IsOptional()
    partNumber?: string;

    @IsString()
    @IsOptional()
    inventoryPartId?: string; // Optional if selecting from inventory

    @IsNumber()
    @IsNotEmpty()
    quantity: number;

    @IsBoolean()
    @IsOptional()
    isWarranty?: boolean;
}

export class CreatePartsRequestDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PartsRequestItemDto)
    items: PartsRequestItemDto[];
}
