import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
    Delete,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryPartDto } from './dto/create-inventory-part.dto';
import { UpdateInventoryPartDto } from './dto/update-inventory-part.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post('parts')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    create(@Body() createDto: CreateInventoryPartDto) {
        return this.inventoryService.create(createDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'inventory_manager', 'service_engineer', 'service_advisor', 'call_center')
    findAll(@Query() query: any) {
        return this.inventoryService.findAll(query);
    }

    @Get('low-stock')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    getLowStock(@Query('serviceCenterId') scId: string) {
        return this.inventoryService.getLowStock(scId);
    }

    @Patch('parts/:id/adjust-stock')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    adjustStock(@Param('id') id: string, @Body() adjustDto: AdjustStockDto) {
        return this.inventoryService.adjustStock(id, adjustDto);
    }

    @Patch('parts/:id')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    update(@Param('id') id: string, @Body() updateDto: UpdateInventoryPartDto) {
        return this.inventoryService.update(id, updateDto);
    }

    @Delete('parts/:id')
    @Roles('admin', 'sc_manager', 'inventory_manager')
    remove(@Param('id') id: string) {
        return this.inventoryService.remove(id);
    }
}
