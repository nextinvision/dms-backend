import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalStatus, ApprovalType } from '@prisma/client';

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    type?: ApprovalType;
    status?: ApprovalStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        skip,
        take: limit,
        include: {
          stockTransfer: {
            include: {
              serviceCenter: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              items: {
                include: {
                  part: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approval.count({ where }),
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
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: {
        stockTransfer: {
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            items: {
              include: {
                part: true,
              },
            },
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    return approval;
  }

  async approve(id: string, approvedBy: string, comments?: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Approval is not in pending status');
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        comments,
      },
    });

    // Handle entity-specific approval logic
    if (approval.type === 'STOCK_TRANSFER' && approval.entityType === 'StockTransfer') {
      await this.prisma.stockTransfer.update({
        where: { id: approval.entityId },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
        },
      });
    }

    // Log audit
    await this.logAudit(
      approvedBy,
      'APPROVE',
      'Approval',
      id,
      `Approved ${approval.type}: ${approval.entityId}`,
    );

    return updated;
  }

  async reject(id: string, rejectedBy: string, rejectionReason: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException('Approval is not in pending status');
    }

    const updated = await this.prisma.approval.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });

    // Handle entity-specific rejection logic
    if (approval.type === 'STOCK_TRANSFER' && approval.entityType === 'StockTransfer') {
      await this.prisma.stockTransfer.update({
        where: { id: approval.entityId },
        data: {
          status: 'rejected',
        },
      });
    }

    // Log audit
    await this.logAudit(
      rejectedBy,
      'REJECT',
      'Approval',
      id,
      `Rejected ${approval.type}: ${approval.entityId} - ${rejectionReason}`,
    );

    return updated;
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

