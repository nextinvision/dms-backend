import { Controller, Get, Post, Body, UseGuards, Put } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('system-settings')
@UseGuards(JwtAuthGuard)
export class SystemSettingsController {
    constructor(private readonly settingsService: SystemSettingsService) { }

    @Get()
    async findAll() {
        return this.settingsService.findAll();
    }

    @Post()
    async upsert(@Body() settings: { key: string; value: string; category?: string; description?: string }[]) {
        return this.settingsService.upsertMany(settings);
    }
}
