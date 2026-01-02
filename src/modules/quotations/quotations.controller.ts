import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Put,
    Param,
    Query,
    UseGuards,
    Delete,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
    constructor(private readonly quotationsService: QuotationsService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor')
    create(@Body() createQuotationDto: CreateQuotationDto) {
        return this.quotationsService.create(createQuotationDto);
    }

    @Put(':id')
    @Roles('admin', 'sc_manager', 'service_advisor')
    update(@Param('id') id: string, @Body() updateDto: any) {
        return this.quotationsService.update(id, updateDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findAll(@Query() query: any) {
        return this.quotationsService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findOne(@Param('id') id: string) {
        return this.quotationsService.findOne(id);
    }

    @Patch(':id/approve')
    @Roles('admin', 'sc_manager')
    approve(@Param('id') id: string) {
        return this.quotationsService.approve(id);
    }

    @Post(':id/manager-review')
    @Roles('admin', 'sc_manager')
    managerReview(@Param('id') id: string, @Body() data: { status: 'APPROVED' | 'REJECTED'; notes?: string }) {
        return this.quotationsService.managerReview(id, data);
    }

    @Post(':id/pass-to-manager')
    @Roles('admin', 'sc_manager', 'service_advisor')
    passToManager(@Param('id') id: string, @Body('managerId') managerId: string) {
        return this.quotationsService.passToManager(id, managerId);
    }

    @Patch(':id/customer-approval')
    @Roles('admin', 'sc_manager', 'service_advisor')
    updateCustomerApproval(@Param('id') id: string, @Body() data: { status: 'APPROVED' | 'REJECTED'; reason?: string }) {
        return this.quotationsService.updateCustomerApproval(id, data);
    }

    @Delete(':id')
    @Roles('admin', 'sc_manager', 'service_advisor')
    remove(@Param('id') id: string) {
        return this.quotationsService.remove(id);
    }
}

