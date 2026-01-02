import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfGeneratorService {
    private readonly logger = new Logger(PdfGeneratorService.name);

    async generatePdfFromHtml(html: string, options?: {
        filename?: string;
        format?: 'A4' | 'Letter';
        printBackground?: boolean;
    }): Promise<Buffer> {
        const {
            filename = 'document.pdf',
            format = 'A4',
            printBackground = true,
        } = options || {};

        let browser: puppeteer.Browser | null = null;

        try {
            this.logger.log(`Generating PDF: ${filename}`);

            // Launch headless browser
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            });

            const page = await browser.newPage();

            // Set content and wait for any resources to load
            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000,
            });

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format,
                printBackground,
                margin: {
                    top: '1.2cm',
                    right: '1.2cm',
                    bottom: '1.2cm',
                    left: '1.2cm',
                },
                preferCSSPageSize: false,
            });

            this.logger.log(`PDF generated successfully: ${filename} (${pdfBuffer.length} bytes)`);

            return Buffer.from(pdfBuffer);
        } catch (error) {
            this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
            throw new Error(`PDF generation failed: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Validate HTML before PDF generation
     */
    validateHtml(html: string): boolean {
        if (!html || html.trim().length === 0) {
            throw new Error('HTML content cannot be empty');
        }

        if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
            throw new Error('Invalid HTML structure');
        }

        return true;
    }
}
