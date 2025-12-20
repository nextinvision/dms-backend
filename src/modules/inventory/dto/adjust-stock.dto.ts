import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AdjustmentType {
    ADD = 'ADD',
    SUBTRACT = 'SUBTRACT',
    SET = 'SET',
}

export class AdjustStockDto {
    @IsEnum(AdjustmentType)
    @IsNotEmpty()
    adjustmentType: AdjustmentType;

    @IsInt()
    @IsNotEmpty()
    quantity: number;

    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
