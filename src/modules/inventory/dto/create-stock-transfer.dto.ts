import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockTransferItemDto {
  @IsString()
  @IsNotEmpty()
  partId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateStockTransferDto {
  @IsString()
  @IsNotEmpty()
  toServiceCenterId: string;

  @IsString()
  @IsOptional()
  fromServiceCenterId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

