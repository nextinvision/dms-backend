import { PartialType } from '@nestjs/mapped-types';
import { CreateAppointmentDto } from './create-appointment.dto';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
    @IsEnum(AppointmentStatus)
    @IsOptional()
    status?: AppointmentStatus;

    @IsDateString()
    @IsOptional()
    checkInDate?: string;
}
