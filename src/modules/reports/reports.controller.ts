import {
    Controller,
    Post,
    Body,
    UseGuards,
    Res,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Post('generate-pdf')
    @Roles('admin', 'sc_manager')
    async generatePdf(
        @Body() body: {
            reportType: string;
            reportData: any;
            serviceCenterName: string;
            dateRange: { from: string; to: string };
        },
        @Res() res: Response,
    ) {
        try {
            const { reportType, reportData, serviceCenterName, dateRange } = body;

            const pdfBuffer = await this.reportsService.generateReportPdf(
                reportType,
                reportData,
                serviceCenterName,
                dateRange,
            );

            const filename = `${reportType}-report-${serviceCenterName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.status(HttpStatus.OK).send(pdfBuffer);
        } catch (error) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Failed to generate PDF',
                error: error.message,
            });
        }
    }
}

