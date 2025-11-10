import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApproveDto } from './dto/approve.dto';
import { RejectDto } from './dto/reject.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.approvalsService.findAll({
      type: type as any,
      status: status as any,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.approvalsService.approve(id, user.id, approveDto.comments);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.approvalsService.reject(id, user.id, rejectDto.rejectionReason);
  }
}

