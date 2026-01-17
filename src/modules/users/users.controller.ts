import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles('admin', 'sc_manager')
    create(@Body() createDto: CreateUserDto) {
        return this.usersService.create(createDto);
    }

    @Get()
    @Roles('admin', 'sc_manager', 'service_advisor', 'service_engineer', 'call_center')
    findAll(@Query() query: any) {
        return this.usersService.findAll(query);
    }

    @Get('me')
    getProfile(@Request() req: any) {
        return this.usersService.findOne(req.user.id);
    }

    @Get(':id')
    @Roles('admin', 'sc_manager')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin')
    update(@Param('id') id: string, @Body() updateDto: UpdateUserDto) {
        return this.usersService.update(id, updateDto);
    }

    @Delete(':id')
    @Roles('admin', 'sc_manager', 'service_engineer', 'service_advisor', 'call_center') // Allow all roles that can view to also delete
    remove(@Param('id') id: string, @Request() req: any) {
        console.log('=== DELETE USER REQUEST ===');
        console.log('Delete request by user:', JSON.stringify(req.user, null, 2));
        console.log('User role:', req.user?.role);
        console.log('Attempting to delete user ID:', id);
        console.log('===========================');
        return this.usersService.remove(id);
    }
}
