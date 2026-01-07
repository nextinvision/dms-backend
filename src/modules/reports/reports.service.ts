import { Injectable, Logger } from '@nestjs/common';
import { PdfGeneratorService } from '../pdf-generator/pdf-generator.service';
import { generateReportHtmlTemplate } from './templates/report-html.template';

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(private readonly pdfGenerator: PdfGeneratorService) {}

    async generateReportPdf(
        reportType: string,
        reportData: any,
        serviceCenterName: string,
        dateRange: { from: string; to: string }
    ): Promise<Buffer> {
        try {
            this.logger.log(`Generating PDF for ${reportType} report`);

            // Generate HTML from template
            const html = generateReportHtmlTemplate({
                reportType,
                reportData,
                serviceCenterName,
                dateRange,
            });

            // Validate HTML
            this.pdfGenerator.validateHtml(html);

            // Generate PDF
            const pdfBuffer = await this.pdfGenerator.generatePdfFromHtml(html, {
                filename: `${reportType}-report-${serviceCenterName}-${new Date().toISOString().split('T')[0]}.pdf`,
                format: 'A4',
                printBackground: true,
            });

            this.logger.log(`PDF generated successfully for ${reportType} report`);
            return pdfBuffer;
        } catch (error) {
            this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
            throw error;
        }
    }
}

