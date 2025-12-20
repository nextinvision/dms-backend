import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JobCardPriority } from '@prisma/client';

class IssueItemDto {
    @IsUUID()
    @IsNotEmpty()
    centralInventoryPartId: string;

    @IsNotEmpty()
    requestedQty: number;
}

export class CreatePartsIssueDto {
    @IsUUID()
    @IsNotEmpty()
    toServiceCenterId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IssueItemDto)
    items: IssueItemDto[];

    @IsEnum(JobCardPriority)
    @IsOptional()
    priority?: JobCardPriority = JobCardPriority.MEDIUM;
}
