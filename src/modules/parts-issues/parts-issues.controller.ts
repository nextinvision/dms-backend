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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('parts-issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartsIssuesController {
    constructor(private readonly partsIssuesService: PartsIssuesService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'inventory_manager')
    create(@Body() createDto: CreatePartsIssueDto, @Request() req: any) {
        return this.partsIssuesService.create(createDto, req.user.id);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'inventory_manager', 'central_inventory_manager')
    findAll(@Query() query: any) {
        return this.partsIssuesService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'inventory_manager', 'central_inventory_manager')
    findOne(@Param('id') id: string) {
        return this.partsIssuesService.findOne(id);
    }

    @Patch(':id/approve')
    @Roles('admin')
    approve(@Param('id') id: string, @Body('approvedItems') approvedItems: any[]) {
        return this.partsIssuesService.approve(id, approvedItems);
    }

    @Patch(':id/dispatch')
    @Roles('admin', 'central_inventory_manager')
    dispatch(@Param('id') id: string, @Body('transportDetails') transportDetails: any) {
        return this.partsIssuesService.dispatch(id, transportDetails);
    }

    @Patch(':id/receive')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    receive(@Param('id') id: string, @Body('receivedItems') receivedItems: any[]) {
        return this.partsIssuesService.receive(id, receivedItems);
    }
}
