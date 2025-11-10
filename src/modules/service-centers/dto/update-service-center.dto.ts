import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceCenterDto } from './create-service-center.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ServiceCenterStatus } from '@prisma/client';

export class UpdateServiceCenterDto extends PartialType(CreateServiceCenterDto) {
  @IsEnum(ServiceCenterStatus)
  @IsOptional()
  status?: ServiceCenterStatus;
}

