import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
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
}
