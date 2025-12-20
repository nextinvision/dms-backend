import { Module } from '@nestjs/common';
import { PartsIssuesService } from './parts-issues.service';
import { PartsIssuesController } from './parts-issues.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [PartsIssuesController],
    providers: [PartsIssuesService],
    exports: [PartsIssuesService],
})
export class PartsIssuesModule { }
