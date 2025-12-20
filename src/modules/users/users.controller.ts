import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles('admin')
    create(@Body() createDto: CreateUserDto) {
        return this.usersService.create(createDto);
    }

    @Get()
    @Roles('admin', 'sc_manager')
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
}
