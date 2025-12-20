import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationsService {
    constructor(private prisma: PrismaService) { }

    async create(createQuotationDto: CreateQuotationDto) {
        const { serviceCenterId, items, discount = 0 } = createQuotationDto;

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
                ...createQuotationDto,
                quotationNumber,
                subtotal,
                cgst,
                sgst,
                totalAmount,
                status: 'DRAFT',
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
            data: { status: 'APPROVED' },
        });
    }
}
