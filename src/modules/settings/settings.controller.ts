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
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.settingsService.findAll({ category });
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Post()
  create(
    @Body() createDto: CreateSettingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.settingsService.create(
      createDto.key,
      createDto.value,
      createDto.category,
      createDto.description,
      user.id,
    );
  }

  @Patch(':key')
  update(
    @Param('key') key: string,
    @Body() updateDto: UpdateSettingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.settingsService.update(key, updateDto.value, user.id);
  }

  @Delete(':key')
  remove(@Param('key') key: string, @CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.delete(key, user.id);
  }
}

