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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    create(@Body() createAppointmentDto: CreateAppointmentDto) {
        return this.appointmentsService.create(createAppointmentDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findAll(@Query() query: any) {
        return this.appointmentsService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findOne(@Param('id') id: string) {
        return this.appointmentsService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
        return this.appointmentsService.update(id, updateAppointmentDto);
    }

    @Delete(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    remove(@Param('id') id: string) {
        return this.appointmentsService.remove(id);
    }
}
