import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemSettingsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        const settings = await this.prisma.systemSetting.findMany();
        // Convert array to object for easier frontend consumption, or return array.
        // Frontend expects key-value map or array.
        // Let's return array, frontend can map.
        return settings;
    }

    async upsertMany(settings: { key: string; value: string; category?: string; description?: string }[]) {
        console.log('Upserting settings:', JSON.stringify(settings, null, 2));
        const results = [];
        for (const setting of settings) {
            const res = await this.prisma.systemSetting.upsert({
                where: { key: setting.key },
                update: {
                    value: setting.value || '',
                    category: setting.category,
                    description: setting.description,
                },
                create: {
                    key: setting.key,
                    value: setting.value || '',
                    category: setting.category || 'general',
                    description: setting.description,
                },
            });
            results.push(res);
        }
        return results;
    }

    async getValue(key: string, defaultValue: string = ''): Promise<string> {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key },
        });
        return setting?.value || defaultValue;
    }
}
