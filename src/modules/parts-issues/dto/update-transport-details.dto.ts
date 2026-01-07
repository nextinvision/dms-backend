import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateTransportDetailsDto {
    @IsOptional()
    @IsObject()
    transportDetails?: {
        transporter?: string;
        trackingNumber?: string;
        expectedDelivery?: string;
    };
}

