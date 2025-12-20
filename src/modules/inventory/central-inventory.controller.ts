import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Param,
} from '@nestjs/common';
import { CentralInventoryService } from './central-inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('central-inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentralInventoryController {
    constructor(private readonly centralInventoryService: CentralInventoryService) { }

    @Get()
    @Roles('admin', 'central_inventory_manager')
    findAll(@Query() query: any) {
        return this.centralInventoryService.findAll(query);
    }

    @Post('parts')
    @Roles('admin', 'central_inventory_manager')
    create(@Body() data: any) {
        return this.centralInventoryService.create(data);
    }

    @Get(':id')
    @Roles('admin', 'central_inventory_manager')
    findOne(@Param('id') id: string) {
        return this.centralInventoryService.findOne(id);
    }
}
