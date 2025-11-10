import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN', 'SC_MANAGER', 'SC_STAFF', 'SERVICE_ADVISOR', 'CALL_CENTER')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('vehicles')
  searchVehicles(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      return { vehicles: [], customers: [] };
    }
    return this.searchService.searchVehicles(query, limit ? parseInt(limit) : 10);
  }

  @Get('vehicles/:id')
  getVehicleDetails(@Param('id') id: string) {
    try {
      return this.searchService.getVehicleDetails(id);
    } catch (error) {
      throw new NotFoundException('Vehicle not found');
    }
  }

  @Get('customers/:id')
  getCustomerDetails(@Param('id') id: string) {
    try {
      return this.searchService.getCustomerDetails(id);
    } catch (error) {
      throw new NotFoundException('Customer not found');
    }
  }
}

