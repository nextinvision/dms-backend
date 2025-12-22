import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    create(@Body() createCustomerDto: CreateCustomerDto) {
        return this.customersService.create(createCustomerDto);
    }

    @Post('bulk')
    @Roles('admin')
    bulkCreate(@Body('customers') customers: CreateCustomerDto[]) {
        return this.customersService.bulkCreate(customers);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findAll(@Query() query: any) {
        return this.customersService.findAll(query);
    }

    @Get('search')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    search(@Query('query') query: string, @Query('type') type: string) {
        return this.customersService.search(query, type);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findOne(@Param('id') id: string) {
        return this.customersService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'sc_manager', 'service_advisor', 'call_center')
    update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
        return this.customersService.update(id, updateCustomerDto);
    }

    @Delete(':id')
    @Roles('admin', 'sc_manager')
    remove(@Param('id') id: string) {
        return this.customersService.remove(id);
    }
}
