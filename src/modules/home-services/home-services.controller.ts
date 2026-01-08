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
    Request,
} from '@nestjs/common';
import { HomeServicesService } from './home-services.service';
import { CreateHomeServiceDto } from './dto/create-home-service.dto';
import { UpdateHomeServiceDto } from './dto/update-home-service.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('home-services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HomeServicesController {
    constructor(private readonly homeServicesService: HomeServicesService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    create(@Body() createHomeServiceDto: CreateHomeServiceDto, @Request() req) {
        const createdById = req.user?.id;
        return this.homeServicesService.create(createHomeServiceDto, createdById);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findAll(@Query() query: any) {
        return this.homeServicesService.findAll(query);
    }

    @Get('stats')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    getStats(@Query('serviceCenterId') serviceCenterId?: string) {
        return this.homeServicesService.getStats(serviceCenterId);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findOne(@Param('id') id: string) {
        return this.homeServicesService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'sc_manager', 'service_advisor')
    update(@Param('id') id: string, @Body() updateHomeServiceDto: UpdateHomeServiceDto) {
        return this.homeServicesService.update(id, updateHomeServiceDto);
    }

    @Delete(':id')
    @Roles('admin', 'sc_manager')
    remove(@Param('id') id: string) {
        return this.homeServicesService.remove(id);
    }
}

