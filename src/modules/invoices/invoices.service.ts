import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { paginate, calculateSkip } from '../../common/utils/pagination.util';
import { generateDocumentNumber } from '../../common/utils/document-number.util';

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
        const invoiceNumber = await generateDocumentNumber(this.prisma, {
            prefix: 'INV',
            fieldName: 'invoiceNumber',
            model: this.prisma.invoice,
            includeServiceCenterCode: sc.code,
        });

        // Calculate totals
        const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
        const gstTotal = items.reduce((acc, item) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            return acc + (itemSubtotal * item.gstRate) / 100;
        }, 0);

        const cgst = gstTotal / 2;
        const sgst = gstTotal / 2;
        const grandTotal = subtotal + gstTotal;

        // Extract items and invoiceType from DTO to avoid spreading them into the data object
        const { items: invoiceItems, invoiceType: dtoInvoiceType, ...invoiceData } = createInvoiceDto;

        // Determine invoice type
        const finalInvoiceType: 'OTC_ORDER' | 'JOB_CARD' = dtoInvoiceType || (createInvoiceDto.jobCardId ? 'JOB_CARD' : 'OTC_ORDER');

        return this.prisma.invoice.create({
            data: {
                serviceCenterId: invoiceData.serviceCenterId,
                customerId: invoiceData.customerId,
                vehicleId: invoiceData.vehicleId,
                jobCardId: invoiceData.jobCardId || null,
                placeOfSupply: invoiceData.placeOfSupply || null,
                invoiceNumber,
                invoiceType: finalInvoiceType,
                subtotal,
                cgst,
                sgst,
                grandTotal,
                status: 'UNPAID',
                items: {
                    create: invoiceItems,
                },
            },
            include: {
                items: true,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, serviceCenterId, status, customerId } = query;
        const skip = calculateSkip(page, limit);

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (query.invoiceType) where.invoiceType = query.invoiceType;

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

        return paginate(data, total, Number(page), Number(limit));
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
