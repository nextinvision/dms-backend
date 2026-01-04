import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DispatchItemDto {
    @IsUUID()
    @IsNotEmpty()
    itemId: string;

    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number) // Ensure it's transformed to a number
    quantity: number; // Quantity to issue in this dispatch (can be partial)
}

export class DispatchPartsIssueDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DispatchItemDto)
    items: DispatchItemDto[];

    @IsOptional()
    transportDetails?: any; // JSON object with transporter, trackingNumber, etc. (no strict validation)
}

