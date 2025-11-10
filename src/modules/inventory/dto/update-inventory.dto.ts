import {
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';

export class UpdateInventoryDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minLevel?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxLevel?: number;
}

