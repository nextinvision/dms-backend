import { IsArray, IsNotEmpty, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ApprovedItemDto {
    @IsUUID()
    @IsNotEmpty()
    itemId: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    approvedQty: number; // Approved quantity (can be adjusted based on available stock)
}

export class ApprovePartsIssueDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ApprovedItemDto)
    approvedItems: ApprovedItemDto[];
}

