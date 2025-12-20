import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CentralInventoryService } from './central-inventory.service';
import { InventoryController } from './inventory.controller';
import { CentralInventoryController } from './central-inventory.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [InventoryController, CentralInventoryController],
    providers: [InventoryService, CentralInventoryService],
    exports: [InventoryService, CentralInventoryService],
})
export class InventoryModule { }
