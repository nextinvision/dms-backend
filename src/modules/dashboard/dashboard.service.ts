import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSuperAdminDashboard() {
    const [
      totalServiceCenters,
      activeServiceCenters,
      totalUsers,
      activeUsers,
      totalCustomers,
      totalVehicles,
      pendingApprovals,
      lowStockAlerts,
      pendingComplaints,
      todayRevenue,
      todayJobs,
      completedJobsToday,
    ] = await Promise.all([
      this.prisma.serviceCenter.count(),
      this.prisma.serviceCenter.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.customer.count(),
      this.prisma.vehicle.count(),
      this.prisma.approval.count({
        where: { status: 'PENDING' },
      }),
      this.getLowStockCount(),
      this.prisma.complaint.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.getTodayRevenue(),
      this.prisma.jobCard.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.jobCard.count({
        where: {
          status: 'completed',
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Get recent alerts
    const alerts = await this.getAlerts();

    return {
      kpis: {
        serviceCenters: {
          total: totalServiceCenters,
          active: activeServiceCenters,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        customers: {
          total: totalCustomers,
        },
        vehicles: {
          total: totalVehicles,
        },
        operations: {
          pendingApprovals,
          lowStockAlerts,
          pendingComplaints,
          todayJobs,
          completedJobsToday,
        },
        revenue: {
          today: todayRevenue,
        },
      },
      alerts,
    };
  }

  async getAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [lowStock, pendingApprovals, escalatedComplaints, overdueInvoices] =
      await Promise.all([
        this.getLowStockItems(5),
        this.prisma.approval.findMany({
          where: { status: 'PENDING' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            stockTransfer: {
              include: {
                serviceCenter: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.complaint.findMany({
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            severity: { in: ['HIGH', 'CRITICAL'] },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        }),
        this.prisma.invoice.findMany({
          where: {
            status: 'OVERDUE',
            dueDate: { lt: new Date() },
          },
          take: 5,
          orderBy: { dueDate: 'asc' },
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
              },
            },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

    return {
      lowStock: lowStock.map((item) => ({
        type: 'low_stock',
        severity: 'medium',
        message: `Low stock: ${item.part.name} at ${item.serviceCenter.name}`,
        data: item,
      })),
      pendingApprovals: pendingApprovals.map((approval) => ({
        type: 'approval',
        severity: 'medium',
        message: `Pending ${approval.type} approval`,
        data: approval,
      })),
      escalatedComplaints: escalatedComplaints.map((complaint) => ({
        type: 'complaint',
        severity: complaint.severity.toLowerCase(),
        message: `Escalated complaint: ${complaint.title}`,
        data: complaint,
      })),
      overdueInvoices: overdueInvoices.map((invoice) => ({
        type: 'invoice',
        severity: 'high',
        message: `Overdue invoice: ${invoice.invoiceNumber} - ₹${invoice.totalAmount}`,
        data: invoice,
      })),
    };
  }

  private async getLowStockCount() {
    const inventories = await this.prisma.inventory.findMany({
      include: {
        part: true,
        serviceCenter: true,
      },
    });

    return inventories.filter(
      (inv) => inv.quantity <= inv.minLevel,
    ).length;
  }

  private async getLowStockItems(limit: number = 10) {
    // Get all inventories and filter in memory since Prisma doesn't support
    // comparing two fields directly in where clause easily
    const inventories = await this.prisma.inventory.findMany({
      include: {
        part: true,
        serviceCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Filter low stock items
    const lowStockItems = inventories
      .filter((inv) => inv.quantity <= inv.minLevel)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, limit);

    return lowStockItems;
  }

  private async getTodayRevenue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: today,
        },
        invoice: {
          status: 'PAID',
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  async getRealtimeMetrics() {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const [
      activeJobs,
      completedJobsToday,
      revenueToday,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.jobCard.count({
        where: {
          status: { in: ['assigned', 'in_progress', 'parts_pending'] },
        },
      }),
      this.prisma.jobCard.count({
        where: {
          status: 'completed',
          completedAt: { gte: today },
        },
      }),
      this.getTodayRevenue(),
      this.prisma.approval.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      activeJobs,
      completedJobsToday,
      revenueToday,
      pendingApprovals,
      timestamp: new Date(),
    };
  }
}

