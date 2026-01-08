import { PartialType } from '@nestjs/mapped-types';
import { CreateHomeServiceDto, HomeServiceStatus } from './create-home-service.dto';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export class UpdateHomeServiceDto extends PartialType(CreateHomeServiceDto) {
  @IsEnum(HomeServiceStatus)
  @IsOptional()
  status?: HomeServiceStatus;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;
}

