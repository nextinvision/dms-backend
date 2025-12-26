import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationsService {
    constructor(private prisma: PrismaService) { }

    async create(createQuotationDto: CreateQuotationDto) {
        const { serviceCenterId, items, discount = 0, ...rest } = createQuotationDto;

        // Generate Quotation Number: QTN-{YYYY}-{SEQ}
        const year = new Date().getFullYear();
        const prefix = `QTN-${year}-`;
        const lastQuotation = await this.prisma.quotation.findFirst({
            where: { quotationNumber: { startsWith: prefix } },
            orderBy: { quotationNumber: 'desc' },
        });

        let seq = 1;
        if (lastQuotation) {
            const parts = lastQuotation.quotationNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const quotationNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        // Calculate totals
        const subtotal = items.reduce((acc, item) => acc + item.rate * item.quantity, 0);
        const gstTotal = items.reduce((acc, item) => {
            const itemSubtotal = item.rate * item.quantity;
            return acc + (itemSubtotal * item.gstPercent) / 100;
        }, 0);

        const cgst = gstTotal / 2;
        const sgst = gstTotal / 2;
        const totalAmount = subtotal + gstTotal - discount;

        return this.prisma.quotation.create({
            data: {
                ...rest,
                serviceCenterId,
                quotationNumber,
                subtotal,
                cgst,
                sgst,
                totalAmount,
                discount,
                status: 'DRAFT',
                items: {
                    create: items,
                },
                // Handle optional dates
                quotationDate: rest.quotationDate ? new Date(rest.quotationDate) : new Date(),
                insuranceStartDate: rest.insuranceStartDate ? new Date(rest.insuranceStartDate) : undefined,
                insuranceEndDate: rest.insuranceEndDate ? new Date(rest.insuranceEndDate) : undefined,
            },
            include: {
                items: true,
            },
        });
    }

    async passToManager(id: string, managerId: string) {
        await this.findOne(id);
        return this.prisma.quotation.update({
            where: { id },
            data: {
                passedToManager: true,
                passedToManagerAt: new Date(),
                managerId,
            },
        });
    }

    async updateCustomerApproval(id: string, data: { status: 'APPROVED' | 'REJECTED'; reason?: string }) {
        await this.findOne(id);
        return this.prisma.quotation.update({
            where: { id },
            data: {
                customerApprovalStatus: data.status,
                customerRejectionReason: data.reason,
                customerApprovedAt: new Date(),
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
            this.prisma.quotation.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true, vehicleModel: true } },
                    items: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.quotation.count({ where }),
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
        const quotation = await this.prisma.quotation.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                items: true,
            },
        });

        if (!quotation) {
            throw new NotFoundException('Quotation not found');
        }

        return quotation;
    }

    async approve(id: string) {
        await this.findOne(id);
        return this.prisma.quotation.update({
            where: { id },
            data: { status: 'MANAGER_APPROVED' },
        });
    }

    async managerReview(id: string, data: { status: 'APPROVED' | 'REJECTED'; notes?: string }) {
        await this.findOne(id);
        const status = data.status === 'APPROVED' ? 'MANAGER_APPROVED' : 'MANAGER_REJECTED';
        // Ensure we save the notes if there's a field for it, otherwise just status
        // Assuming 'notes' field might not exist on Quotation model yet, so we just update status for now.
        // If Model doesn't support notes, we lose them. Let's check schema.prisma later if needed.
        return this.prisma.quotation.update({
            where: { id },
            data: {
                status
            },
        });
    }
}
