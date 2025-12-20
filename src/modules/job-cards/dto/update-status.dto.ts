import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobCardStatus } from '@prisma/client';

export class UpdateJobCardStatusDto {
    @IsEnum(JobCardStatus)
    @IsNotEmpty()
    status: JobCardStatus;

    @IsString()
    @IsOptional()
    notes?: string;
}
