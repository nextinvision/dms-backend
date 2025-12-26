import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { LeadStatus } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
    @IsEnum(LeadStatus)
    @IsOptional()
    status?: LeadStatus;
}
