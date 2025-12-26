import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    create(@Body() createLeadDto: CreateLeadDto) {
        return this.leadsService.create(createLeadDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    findAll(@Query() query: any) {
        return this.leadsService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    findOne(@Param('id') id: string) {
        return this.leadsService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
        return this.leadsService.update(id, updateLeadDto);
    }

    @Delete(':id')
    @Roles('admin', 'sc_manager')
    remove(@Param('id') id: string) {
        return this.leadsService.remove(id);
    }

    @Post(':id/convert-to-quotation')
    @Roles('admin', 'sc_manager', 'service_advisor')
    convertToQuotation(
        @Param('id') id: string,
        @Body('quotationId') quotationId: string,
    ) {
        return this.leadsService.convertToQuotation(id, quotationId);
    }

    @Post(':id/convert-to-job-card')
    @Roles('admin', 'sc_manager', 'service_advisor')
    convertToJobCard(
        @Param('id') id: string,
        @Body('jobCardId') jobCardId: string,
    ) {
        return this.leadsService.convertToJobCard(id, jobCardId);
    }
}
