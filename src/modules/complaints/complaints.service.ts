import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ComplaintStatus, ComplaintSeverity } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    status?: ComplaintStatus;
    severity?: ComplaintSeverity;
    serviceCenterId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.severity) {
      where.severity = filters.severity;
    }

    if (filters?.serviceCenterId) {
      where.serviceCenterId = filters.serviceCenterId;
    }

    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        include: {
          serviceCenter: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaint.count({ where }),
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
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        serviceCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    return complaint;
  }

  async updateStatus(
    id: string,
    status: ComplaintStatus,
    updatedBy: string,
    resolution?: string,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    const updateData: any = {
      status,
    };

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedBy = updatedBy;
      updateData.resolvedAt = new Date();
      if (resolution) {
        updateData.resolution = resolution;
      }
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: updateData,
    });

    // Log audit
    await this.logAudit(
      updatedBy,
      'UPDATE',
      'Complaint',
      id,
      `Updated complaint status to ${status}`,
    );

    return updated;
  }

  async reassign(id: string, assignedTo: string, updatedBy: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        assignedTo,
      },
    });

    // Log audit
    await this.logAudit(
      updatedBy,
      'ASSIGN',
      'Complaint',
      id,
      `Reassigned complaint to user: ${assignedTo}`,
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

