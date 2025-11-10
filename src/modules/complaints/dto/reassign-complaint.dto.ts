import { IsNotEmpty, IsString } from 'class-validator';

export class ReassignComplaintDto {
  @IsString()
  @IsNotEmpty()
  assignedTo: string;
}

