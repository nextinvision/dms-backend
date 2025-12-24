import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceCenterDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(10)
    code: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    pinCode?: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    capacity?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    technicianCount?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    serviceRadius?: number;

    @IsBoolean()
    @IsOptional()
    homeServiceEnabled?: boolean;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    maxAppointmentsPerDay?: number;

    @IsString()
    @IsOptional()
    invoicePrefix?: string;

    @IsString()
    @IsOptional()
    bankName?: string;

    @IsString()
    @IsOptional()
    bankAccount?: string;

    @IsString()
    @IsOptional()
    bankIFSC?: string;

    @IsString()
    @IsOptional()
    gstNumber?: string;

    @IsString()
    @IsOptional()
    panNumber?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    serviceTypes?: string[];

    @IsString()
    @IsOptional()
    status?: string;
}
