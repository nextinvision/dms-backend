import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ========== INVOICES ==========

  async findAllInvoices(filters?: {
    serviceCenterId?: string;
    customerId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (filters?.serviceCenterId) {
      where.serviceCenterId = filters.serviceCenterId;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
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
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
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

  async findOneInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
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
            address: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  // ========== PAYMENT OVERVIEW ==========

  async getPaymentOverview(filters?: {
    serviceCenterId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.InvoiceWhereInput = {};

    if (filters?.serviceCenterId) {
      where.serviceCenterId = filters.serviceCenterId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        payments: true,
      },
    });

    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    const outstandingAmount = totalAmount - paidAmount;

    const byStatus = {
      UNPAID: invoices.filter((inv) => inv.status === 'UNPAID').length,
      PARTIAL: invoices.filter((inv) => inv.status === 'PARTIAL').length,
      PAID: invoices.filter((inv) => inv.status === 'PAID').length,
      OVERDUE: invoices.filter((inv) => inv.status === 'OVERDUE').length,
    };

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      outstandingAmount,
      byStatus,
    };
  }

  async getOutstandingAnalysis(filters?: {
    serviceCenterId?: string;
    overdueOnly?: boolean;
  }) {
    const where: Prisma.InvoiceWhereInput = {
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
    };

    if (filters?.serviceCenterId) {
      where.serviceCenterId = filters.serviceCenterId;
    }

    if (filters?.overdueOnly) {
      where.status = 'OVERDUE';
      where.dueDate = { lt: new Date() };
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
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
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { totalAmount: 'desc' },
      ],
    });

    const totalOutstanding = invoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)),
      0,
    );

    return {
      totalOutstanding,
      count: invoices.length,
      invoices,
    };
  }

  // ========== CREDIT NOTES ==========

  async createCreditNote(createDto: CreateCreditNoteDto, createdBy: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: createDto.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (createDto.amount > Number(invoice.totalAmount) - Number(invoice.paidAmount)) {
      throw new BadRequestException(
        'Credit note amount cannot exceed outstanding amount',
      );
    }

    // Create a payment record with negative amount (credit note)
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: createDto.invoiceId,
        amount: -createDto.amount, // Negative for credit note
        method: 'ONLINE', // Default for credit notes
        reference: `CN-${Date.now()}`,
        notes: createDto.notes || createDto.reason,
      },
    });

    // Update invoice paid amount
    const newPaidAmount = Number(invoice.paidAmount) - createDto.amount;
    const newStatus =
      newPaidAmount <= 0
        ? 'UNPAID'
        : newPaidAmount >= Number(invoice.totalAmount)
          ? 'PAID'
          : 'PARTIAL';

    await this.prisma.invoice.update({
      where: { id: createDto.invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    await this.logAudit(
      createdBy,
      'CREATE',
      'CreditNote',
      payment.id,
      `Created credit note for invoice ${invoice.invoiceNumber}: ₹${createDto.amount}`,
    );

    return payment;
  }

  // ========== TODAY'S REVENUE ==========

  async getTodaysRevenue(serviceCenterId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: Prisma.PaymentWhereInput = {
      createdAt: { gte: today },
      invoice: {
        status: 'PAID',
      },
    };

    if (serviceCenterId) {
      where.invoice = {
        serviceCenterId,
        status: 'PAID',
      };
    } else {
      where.invoice = {
        status: 'PAID',
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        invoice: {
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
    });

    const totalRevenue = payments
      .filter((p) => Number(p.amount) > 0) // Exclude credit notes
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      date: today,
      totalRevenue,
      transactionCount: payments.filter((p) => Number(p.amount) > 0).length,
      payments: payments.filter((p) => Number(p.amount) > 0),
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

