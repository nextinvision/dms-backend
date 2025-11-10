import { IsNotEmpty, IsString } from 'class-validator';

export class RejectDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

