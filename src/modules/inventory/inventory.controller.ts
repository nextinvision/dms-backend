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
import { InventoryService } from './inventory.service';
import { CreateInventoryPartDto } from './dto/create-inventory-part.dto';
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
    @Roles('admin', 'sc_manager', 'inventory_manager', 'service_engineer')
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
}
