import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateServiceCenterDto } from './dto/create-service-center.dto';
import { UpdateServiceCenterDto } from './dto/update-service-center.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServiceCentersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceCenterDto, createdBy: string) {
    // Check if code already exists
    const existing = await this.prisma.serviceCenter.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException('Service center code already exists');
    }

    const serviceCenter = await this.prisma.serviceCenter.create({
      data: {
        ...createDto,
        createdBy,
      },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    // Log audit
    await this.logAudit(createdBy, 'CREATE', 'ServiceCenter', serviceCenter.id, `Created service center: ${serviceCenter.name}`);

    return serviceCenter;
  }

  async findAll(filters?: {
    status?: string;
    city?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceCenterWhereInput = {};

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceCenter.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              assignments: true,
              jobCards: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceCenter.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const serviceCenter = await this.prisma.serviceCenter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
            jobCards: true,
            inventory: true,
            invoices: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!serviceCenter) {
      throw new NotFoundException('Service center not found');
    }

    return serviceCenter;
  }

  async update(id: string, updateDto: UpdateServiceCenterDto, updatedBy: string) {
    const existing = await this.prisma.serviceCenter.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Service center not found');
    }

    // Check code uniqueness if code is being updated
    if (updateDto.code && updateDto.code !== existing.code) {
      const codeExists = await this.prisma.serviceCenter.findUnique({
        where: { code: updateDto.code },
      });

      if (codeExists) {
        throw new ConflictException('Service center code already exists');
      }
    }

    const serviceCenter = await this.prisma.serviceCenter.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy,
      },
    });

    // Log audit
    await this.logAudit(updatedBy, 'UPDATE', 'ServiceCenter', id, `Updated service center: ${serviceCenter.name}`);

    return serviceCenter;
  }

  async remove(id: string, deletedBy: string) {
    const serviceCenter = await this.prisma.serviceCenter.findUnique({
      where: { id },
    });

    if (!serviceCenter) {
      throw new NotFoundException('Service center not found');
    }

    // Check if service center has active assignments
    const assignments = await this.prisma.serviceCenterAssignment.count({
      where: { serviceCenterId: id },
    });

    if (assignments > 0) {
      throw new BadRequestException('Cannot delete service center with assigned users');
    }

    await this.prisma.serviceCenter.delete({
      where: { id },
    });

    // Log audit
    await this.logAudit(deletedBy, 'DELETE', 'ServiceCenter', id, `Deleted service center: ${serviceCenter.name}`);

    return { message: 'Service center deleted successfully' };
  }

  async getStats(id: string) {
    const serviceCenter = await this.prisma.serviceCenter.findUnique({
      where: { id },
    });

    if (!serviceCenter) {
      throw new NotFoundException('Service center not found');
    }

    const [staffCount, activeJobs, totalInvoices, totalRevenue] = await Promise.all([
      this.prisma.serviceCenterAssignment.count({
        where: { serviceCenterId: id },
      }),
      this.prisma.jobCard.count({
        where: {
          serviceCenterId: id,
          status: { in: ['assigned', 'in_progress', 'parts_pending'] },
        },
      }),
      this.prisma.invoice.count({
        where: { serviceCenterId: id },
      }),
      this.prisma.invoice.aggregate({
        where: { serviceCenterId: id, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      staffCount,
      activeJobs,
      totalInvoices,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    };
  }

  private async logAudit(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    description?: string,
  ) {
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

