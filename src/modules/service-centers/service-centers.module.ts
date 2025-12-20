import { Module } from '@nestjs/common';
import { ServiceCentersService } from './service-centers.service';
import { ServiceCentersController } from './service-centers.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [ServiceCentersController],
    providers: [ServiceCentersService],
    exports: [ServiceCentersService],
})
export class ServiceCentersModule { }
