import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Param,
    Patch,
} from '@nestjs/common';
import { CentralInventoryService } from './central-inventory.service';
import { UpdateCentralStockDto } from './dto/update-central-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('central-inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentralInventoryController {
    constructor(private readonly centralInventoryService: CentralInventoryService) { }

    @Get()
    @Roles('admin', 'central_inventory_manager', 'inventory_manager')
    findAll(@Query() query: any) {
        return this.centralInventoryService.findAll(query);
    }

    @Post('parts')
    @Roles('admin', 'central_inventory_manager')
    create(@Body() data: any) {
        return this.centralInventoryService.create(data);
    }

    @Get(':id')
    @Roles('admin', 'central_inventory_manager', 'inventory_manager')
    findOne(@Param('id') id: string) {
        return this.centralInventoryService.findOne(id);
    }

    @Patch(':id/stock')
    @Roles('admin', 'central_inventory_manager')
    updateStock(@Param('id') id: string, @Body() updateDto: UpdateCentralStockDto) {
        return this.centralInventoryService.updateStock(id, updateDto);
    }

    @Patch(':id/stock/add')
    @Roles('admin', 'central_inventory_manager')
    addStock(@Param('id') id: string, @Body('quantity') quantity: number) {
        return this.centralInventoryService.addStock(id, quantity);
    }
}
