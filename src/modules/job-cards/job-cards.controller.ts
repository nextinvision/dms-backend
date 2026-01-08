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
import { JobCardsService } from './job-cards.service';
import { CreateJobCardDto } from './dto/create-job-card.dto';
import { AssignEngineerDto } from './dto/assign-engineer.dto';
import { UpdateJobCardStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('job-cards')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class JobCardsController {
    constructor(private readonly jobCardsService: JobCardsService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    create(@Body() createJobCardDto: CreateJobCardDto) {
        return this.jobCardsService.create(createJobCardDto);
    }

    @Post(':id/assign-engineer')
    @Roles('admin', 'sc_manager')
    assignEngineer(@Param('id') id: string, @Body() assignEngineerDto: AssignEngineerDto) {
        return this.jobCardsService.assignEngineer(id, assignEngineerDto);
    }

    @Post(':id/parts-request')
    @Roles('admin', 'sc_manager', 'service_engineer')
    createPartsRequest(@Param('id') id: string, @Body('items') items: any[]) {
        return this.jobCardsService.createPartsRequest(id, items);
    }

    @Patch(':id/status')
    @Roles('admin', 'sc_manager', 'service_engineer')
    updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateJobCardStatusDto) {
        return this.jobCardsService.updateStatus(id, updateStatusDto);
    }

    @Get('parts-requests/pending')
    @Roles('admin', 'sc_manager', 'inventory_manager', 'service_engineer')
    getPendingPartsRequests(@Query('serviceCenterId') serviceCenterId?: string) {
        return this.jobCardsService.getPendingPartsRequests(serviceCenterId);
    }

    @Patch('parts-requests/:id/status')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    updatePartsRequestStatus(@Param('id') id: string, @Body() data: { status: 'APPROVED' | 'REJECTED' | 'COMPLETED'; notes?: string }) {
        return this.jobCardsService.updatePartsRequestStatus(id, data.status, data.notes);
    }

    @Post('parts-requests/:id/delete')
    @Roles('admin', 'sc_manager', 'service_engineer')
    deletePartsRequest(@Param('id') id: string) {
        return this.jobCardsService.deletePartsRequest(id);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findAll(@Query() query: any) {
        return this.jobCardsService.findAll(query);
    }

    @Patch(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    update(@Param('id') id: string, @Body() updateJobCardDto: Partial<CreateJobCardDto>) {
        return this.jobCardsService.update(id, updateJobCardDto);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findOne(@Param('id') id: string) {
        return this.jobCardsService.findOne(id);
    }

    @Post(':id/pass-to-manager')
    @Roles('admin', 'sc_manager', 'service_advisor')
    passToManager(@Param('id') id: string, @Body('managerId') managerId: string) {
        return this.jobCardsService.passToManager(id, managerId);
    }

    @Post(':id/manager-review')
    @Roles('admin', 'sc_manager')
    managerReview(@Param('id') id: string, @Body() data: { status: 'APPROVED' | 'REJECTED'; notes?: string }) {
        return this.jobCardsService.managerReview(id, data);
    }

    @Post(':id/convert-to-actual')
    @Roles('admin', 'sc_manager', 'service_advisor')
    convertToActual(@Param('id') id: string) {
        return this.jobCardsService.convertToActual(id);
    }

}

