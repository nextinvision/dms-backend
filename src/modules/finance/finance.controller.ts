import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('invoices')
  findAllInvoices(
    @Query('serviceCenterId') serviceCenterId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.findAllInvoices({
      serviceCenterId,
      customerId,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('invoices/:id')
  findOneInvoice(@Param('id') id: string) {
    return this.financeService.findOneInvoice(id);
  }

  @Get('payment-overview')
  getPaymentOverview(
    @Query('serviceCenterId') serviceCenterId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.financeService.getPaymentOverview({
      serviceCenterId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Get('outstanding')
  getOutstandingAnalysis(
    @Query('serviceCenterId') serviceCenterId?: string,
    @Query('overdueOnly') overdueOnly?: string,
  ) {
    return this.financeService.getOutstandingAnalysis({
      serviceCenterId,
      overdueOnly: overdueOnly === 'true',
    });
  }

  @Get('revenue/today')
  getTodaysRevenue(@Query('serviceCenterId') serviceCenterId?: string) {
    return this.financeService.getTodaysRevenue(serviceCenterId);
  }

  @Post('credit-notes')
  createCreditNote(
    @Body() createDto: CreateCreditNoteDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.financeService.createCreditNote(createDto, user.id);
  }
}

