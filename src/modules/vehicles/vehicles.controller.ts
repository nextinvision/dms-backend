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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor')
    create(@Body() createVehicleDto: CreateVehicleDto) {
        return this.vehiclesService.create(createVehicleDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findAll(@Query() query: any) {
        return this.vehiclesService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findOne(@Param('id') id: string) {
        return this.vehiclesService.findOne(id);
    }

    @Get(':id/service-history')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    getServiceHistory(@Param('id') id: string, @Query() query: any) {
        return this.vehiclesService.getServiceHistory(id, query);
    }

    @Patch(':id')
    @Roles('admin', 'sc_manager', 'service_advisor')
    update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
        return this.vehiclesService.update(id, updateVehicleDto);
    }
}
