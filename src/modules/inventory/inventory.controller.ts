import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ========== PARTS ENDPOINTS ==========

  @Post('parts')
  createPart(
    @Body() createDto: CreatePartDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.createPart(createDto, user.id);
  }

  @Get('parts')
  findAllParts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAllParts({
      category,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('parts/:id')
  findOnePart(@Param('id') id: string) {
    return this.inventoryService.findOnePart(id);
  }

  @Patch('parts/:id')
  updatePart(
    @Param('id') id: string,
    @Body() updateDto: UpdatePartDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.updatePart(id, updateDto, user.id);
  }

  @Delete('parts/:id')
  removePart(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.inventoryService.deletePart(id, user.id);
  }

  // ========== STOCK ENDPOINTS ==========

  @Get('stock')
  getCentralStock(
    @Query('partId') partId?: string,
    @Query('partName') partName?: string,
    @Query('serviceCenterId') serviceCenterId?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getCentralStock({
      partId,
      partName,
      serviceCenterId,
      lowStock: lowStock === 'true',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stock/low-stock-alerts')
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  // ========== INVENTORY ITEM MANAGEMENT ==========

  @Post('stock')
  createInventoryItem(
    @Body() createDto: CreateInventoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.createInventoryItem(createDto, user.id);
  }

  @Patch('stock/:id')
  updateInventoryItem(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.updateInventoryItem(id, updateDto, user.id);
  }

  @Patch('stock/service-center/:serviceCenterId/part/:partId')
  updateInventoryByServiceCenterAndPart(
    @Param('serviceCenterId') serviceCenterId: string,
    @Param('partId') partId: string,
    @Body() updateDto: UpdateInventoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.updateInventoryByServiceCenterAndPart(
      serviceCenterId,
      partId,
      updateDto,
      user.id,
    );
  }

  // ========== STOCK TRANSFER ENDPOINTS ==========

  @Post('transfers')
  createStockTransfer(
    @Body() createDto: CreateStockTransferDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inventoryService.createStockTransfer(createDto, user.id);
  }

  @Get('transfers')
  findAllStockTransfers(
    @Query('status') status?: string,
    @Query('toServiceCenterId') toServiceCenterId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findAllStockTransfers({
      status,
      toServiceCenterId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('transfers/:id')
  findOneStockTransfer(@Param('id') id: string) {
    return this.inventoryService.findOneStockTransfer(id);
  }
}

