import { Module } from '@nestjs/common';
import { JobCardsService } from './job-cards.service';
import { JobCardsController } from './job-cards.controller';
import { DatabaseModule } from '../../database/database.module';
import { FilesModule } from '../files/files.module';

@Module({
    imports: [DatabaseModule, FilesModule],
    controllers: [JobCardsController],
    providers: [JobCardsService],
    exports: [JobCardsService],
})
export class JobCardsModule { }
