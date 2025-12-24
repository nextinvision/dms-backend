import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ServiceCentersService } from './service-centers.service';
import { CreateServiceCenterDto } from './dto/create-service-center.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('service-centers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceCentersController {
    constructor(private readonly scService: ServiceCentersService) { }

    @Post()
    @Roles('admin')
    create(@Body() createDto: CreateServiceCenterDto) {
        return this.scService.create(createDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center', 'inventory_manager', 'central_inventory_manager')
    findAll() {
        return this.scService.findAll();
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center', 'inventory_manager', 'central_inventory_manager')
    findOne(@Param('id') id: string) {
        return this.scService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin')
    update(@Param('id') id: string, @Body() data: any) {
        return this.scService.update(id, data);
    }
}
