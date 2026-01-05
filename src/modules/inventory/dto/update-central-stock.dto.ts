import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCentralStockDto {
    @IsInt()
    @Min(0)
    @IsNotEmpty()
    stockQuantity: number; // New stock quantity to set
}

