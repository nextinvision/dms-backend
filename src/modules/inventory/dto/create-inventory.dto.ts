import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  serviceCenterId: string;

  @IsString()
  @IsNotEmpty()
  partId: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minLevel?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxLevel?: number;
}

