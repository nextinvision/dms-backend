import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [QuotationsController],
    providers: [QuotationsService],
    exports: [QuotationsService],
})
export class QuotationsModule { }
