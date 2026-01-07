import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { PartsIssuesService } from './parts-issues.service';
import { CreatePartsIssueDto } from './dto/create-parts-issue.dto';
import { DispatchPartsIssueDto } from './dto/dispatch-parts-issue.dto';
import { ApprovePartsIssueDto } from './dto/approve-parts-issue.dto';
import { UpdateTransportDetailsDto } from './dto/update-transport-details.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('parts-issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartsIssuesController {
    constructor(private readonly partsIssuesService: PartsIssuesService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'inventory_manager', 'central_inventory_manager', 'service_engineer')
    create(@Body() createDto: CreatePartsIssueDto, @Request() req: any) {
        return this.partsIssuesService.create(createDto, req.user.id);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'inventory_manager', 'central_inventory_manager', 'service_engineer')
    findAll(@Query() query: any) {
        return this.partsIssuesService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'inventory_manager', 'central_inventory_manager', 'service_engineer')
    findOne(@Param('id') id: string) {
        return this.partsIssuesService.findOne(id);
    }

    @Patch(':id/reject')
    @Roles('admin', 'central_inventory_manager')
    reject(@Param('id') id: string, @Body('reason') reason: string) {
        return this.partsIssuesService.reject(id, reason);
    }

    @Patch(':id/approve')
    @Roles('admin', 'central_inventory_manager')
    approve(@Param('id') id: string, @Body() approveDto: ApprovePartsIssueDto) {
        return this.partsIssuesService.approveByCIM(id, approveDto.approvedItems);
    }

    @Patch(':id/admin-approve')
    @Roles('admin')
    adminApprove(@Param('id') id: string) {
        return this.partsIssuesService.approveByAdmin(id);
    }

    @Patch(':id/dispatch')
    @Roles('admin', 'central_inventory_manager')
    dispatch(@Param('id') id: string, @Body() dispatchDto: DispatchPartsIssueDto, @Request() req: any) {
        return this.partsIssuesService.dispatch(id, dispatchDto, req.user?.id);
    }

    @Patch(':id/receive')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    receive(@Param('id') id: string, @Body('receivedItems') receivedItems: any[]) {
        return this.partsIssuesService.receive(id, receivedItems);
    }

    @Patch(':id/update-transport-details')
    @Roles('admin', 'central_inventory_manager')
    updateTransportDetails(@Param('id') id: string, @Body() updateDto: UpdateTransportDetailsDto) {
        return this.partsIssuesService.updateTransportDetails(id, updateDto.transportDetails);
    }
}
