import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
    @IsEnum(VehicleStatus)
    @IsOptional()
    currentStatus?: VehicleStatus;

    @IsUUID()
    @IsOptional()
    activeJobCardId?: string;
}
