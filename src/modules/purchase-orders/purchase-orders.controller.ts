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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrdersController {
    constructor(private readonly poService: PurchaseOrdersService) { }

    @Post()
    @Roles('admin', 'central_inventory_manager')
    create(@Body() createDto: CreatePurchaseOrderDto) {
        return this.poService.create(createDto);
    }

    @Get()
    @Roles('admin', 'central_inventory_manager')
    findAll(@Query() query: any) {
        return this.poService.findAll(query);
    }

    @Get(':id')
    @Roles('admin', 'central_inventory_manager')
    findOne(@Param('id') id: string) {
        return this.poService.findOne(id);
    }

    @Patch(':id/submit')
    @Roles('admin', 'central_inventory_manager')
    submit(@Param('id') id: string) {
        return this.poService.submit(id);
    }

    @Patch(':id/approve')
    @Roles('admin')
    approve(@Param('id') id: string) {
        return this.poService.approve(id);
    }

    @Patch(':id/receive')
    @Roles('admin', 'central_inventory_manager')
    receive(@Param('id') id: string, @Body() receivedData: any) {
        return this.poService.receive(id, receivedData);
    }
}
