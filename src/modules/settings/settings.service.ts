import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { category?: string }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    const settings = await this.prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      const category = setting.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      settings,
      grouped,
    };
  }

  async findOne(key: string) {
    const setting = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    return setting;
  }

  async create(key: string, value: string, category?: string, description?: string, updatedBy?: string) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (existing) {
      throw new ConflictException('Setting with this key already exists');
    }

    const setting = await this.prisma.systemConfig.create({
      data: {
        key,
        value,
        category,
        description,
        updatedBy,
      },
    });

    await this.logAudit(
      updatedBy,
      'CREATE',
      'SystemConfig',
      setting.id,
      `Created setting: ${key}`,
    );

    return setting;
  }

  async update(key: string, value: string, updatedBy?: string) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException('Setting not found');
    }

    const setting = await this.prisma.systemConfig.update({
      where: { key },
      data: {
        value,
        updatedBy,
      },
    });

    await this.logAudit(
      updatedBy,
      'UPDATE',
      'SystemConfig',
      setting.id,
      `Updated setting: ${key} = ${value}`,
    );

    return setting;
  }

  async delete(key: string, deletedBy?: string) {
    const setting = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Setting not found');
    }

    await this.prisma.systemConfig.delete({
      where: { key },
    });

    await this.logAudit(
      deletedBy,
      'DELETE',
      'SystemConfig',
      setting.id,
      `Deleted setting: ${key}`,
    );

    return { message: 'Setting deleted successfully' };
  }

  private async logAudit(
    userId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    description?: string,
  ) {
    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: action as any,
          entityType,
          entityId,
          description,
        },
      });
    }
  }
}

