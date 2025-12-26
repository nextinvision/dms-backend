import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) { }

    async create(createInvoiceDto: CreateInvoiceDto) {
        const { serviceCenterId, items } = createInvoiceDto;

        // Get SC Code for invoice number
        const sc = await this.prisma.serviceCenter.findUnique({
            where: { id: serviceCenterId },
        });
        if (!sc) throw new NotFoundException('Service Center not found');

        // Generate Invoice Number: INV-{SCCODE}-{YYYY}-{SEQ}
        const year = new Date().getFullYear();
        const prefix = `INV-${sc.code}-${year}-`;
        const lastInvoice = await this.prisma.invoice.findFirst({
            where: { invoiceNumber: { startsWith: prefix } },
            orderBy: { invoiceNumber: 'desc' },
        });

        let seq = 1;
        if (lastInvoice) {
            const parts = lastInvoice.invoiceNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const invoiceNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        // Calculate totals
        const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
        const gstTotal = items.reduce((acc, item) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            return acc + (itemSubtotal * item.gstRate) / 100;
        }, 0);

        const cgst = gstTotal / 2;
        const sgst = gstTotal / 2;
        const grandTotal = subtotal + gstTotal;

        return this.prisma.invoice.create({
            data: {
                ...createInvoiceDto,
                invoiceNumber,
                subtotal,
                cgst,
                sgst,
                grandTotal,
                status: 'UNPAID',
                items: {
                    create: items,
                },
            },
            include: {
                items: true,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, serviceCenterId, status, customerId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;

        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return {
            data,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                items: true,
                jobCard: true,
            },
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
    }

    async updateStatus(id: string, status: 'PAID' | 'CANCELLED') {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: { jobCard: true },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');

        if (status === 'PAID') {
            return this.prisma.$transaction(async (tx) => {
                const updatedInvoice = await tx.invoice.update({
                    where: { id },
                    data: { status: 'PAID' },
                });

                // Post-payment hooks
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: {
                        lastServiceCenterId: invoice.serviceCenterId,
                        lastServiceDate: new Date(),
                        lastInvoiceNumber: invoice.invoiceNumber,
                    },
                });

                await tx.vehicle.update({
                    where: { id: invoice.vehicleId },
                    data: {
                        lastServiceDate: new Date(),
                        totalServices: { increment: 1 },
                        totalSpent: { increment: invoice.grandTotal },
                        currentStatus: 'AVAILABLE',
                        activeJobCardId: null,
                    },
                });

                if (invoice.jobCardId) {
                    await tx.jobCard.update({
                        where: { id: invoice.jobCardId },
                        data: { status: 'INVOICED' },
                    });
                }

                return updatedInvoice;
            });
        }

        return this.prisma.invoice.update({
            where: { id },
            data: { status },
        });
    }
}
