import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryPartDto } from './create-inventory-part.dto';

export class UpdateInventoryPartDto extends PartialType(CreateInventoryPartDto) { }
