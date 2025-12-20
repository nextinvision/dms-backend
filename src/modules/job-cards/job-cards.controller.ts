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
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobCardsController {
    constructor(private readonly jobCardsService: JobCardsService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor')
    create(@Body() createJobCardDto: CreateJobCardDto) {
        return this.jobCardsService.create(createJobCardDto);
    }

    @Post(':id/assign-engineer')
    @Roles('admin', 'sc_manager')
    assignEngineer(@Param('id') id: string, @Body() assignEngineerDto: AssignEngineerDto) {
        return this.jobCardsService.assignEngineer(id, assignEngineerDto);
    }

    @Patch(':id/status')
    @Roles('admin', 'sc_manager', 'service_engineer')
    updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateJobCardStatusDto) {
        return this.jobCardsService.updateStatus(id, updateStatusDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findAll(@Query() query: any) {
        return this.jobCardsService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer')
    findOne(@Param('id') id: string) {
        return this.jobCardsService.findOne(id);
    }
}
