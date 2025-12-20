import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @Roles('admin', 'sc_manager')
    getDashboardStats(@Query('serviceCenterId') scId: string, @Request() req: any) {
        // If not admin, use user's SC ID
        const effectiveScId = req.user.role === 'admin' ? scId : req.user.serviceCenterId;
        return this.analyticsService.getDashboardStats(effectiveScId);
    }

    @Get('revenue')
    @Roles('admin', 'sc_manager')
    getRevenueStats(
        @Query('serviceCenterId') scId: string,
        @Query('months') months: number,
        @Request() req: any
    ) {
        const effectiveScId = req.user.role === 'admin' ? scId : req.user.serviceCenterId;
        return this.analyticsService.getRevenueStats(effectiveScId, months);
    }
}
