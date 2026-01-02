import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { DatabaseModule } from '../../database/database.module';
import { PdfGeneratorModule } from '../pdf-generator/pdf-generator.module';
import { FilesModule } from '../files/files.module';

@Module({
    imports: [DatabaseModule, PdfGeneratorModule, FilesModule],
    controllers: [QuotationsController],
    providers: [QuotationsService],
    exports: [QuotationsService],
})
export class QuotationsModule { }
