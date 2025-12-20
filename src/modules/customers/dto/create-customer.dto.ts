import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty()
    @IsPhoneNumber('IN')
    phone: string;

    @IsString()
    @IsOptional()
    @IsPhoneNumber('IN')
    whatsappNumber?: string;

    @IsString()
    @IsOptional()
    @IsPhoneNumber('IN')
    alternateNumber?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    cityState?: string;

    @IsString()
    @IsOptional()
    pincode?: string;

    @IsString()
    @IsOptional()
    customerType?: string = 'B2C';
}
