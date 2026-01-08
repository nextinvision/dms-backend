import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfGeneratorModule } from '../pdf-generator/pdf-generator.module';

@Module({
    imports: [PdfGeneratorModule],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule {}

