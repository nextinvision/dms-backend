import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { ReassignComplaintDto } from './dto/reassign-complaint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('serviceCenterId') serviceCenterId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.complaintsService.findAll({
      status: status as any,
      severity: severity as any,
      serviceCenterId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complaintsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateComplaintStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.complaintsService.updateStatus(
      id,
      updateDto.status,
      user.id,
      updateDto.resolution,
    );
  }

  @Post(':id/reassign')
  reassign(
    @Param('id') id: string,
    @Body() reassignDto: ReassignComplaintDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.complaintsService.reassign(id, reassignDto.assignedTo, user.id);
  }
}

