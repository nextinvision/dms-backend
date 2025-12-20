import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [VehiclesController],
    providers: [VehiclesService],
    exports: [VehiclesService],
})
export class VehiclesModule { }
