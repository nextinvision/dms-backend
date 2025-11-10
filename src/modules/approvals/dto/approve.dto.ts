import { IsOptional, IsString } from 'class-validator';

export class ApproveDto {
  @IsString()
  @IsOptional()
  comments?: string;
}

