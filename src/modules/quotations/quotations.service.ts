import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';

@Injectable()
export class QuotationsService {
    constructor(private prisma: PrismaService) { }

    async create(createQuotationDto: CreateQuotationDto) {
        const { 
            serviceCenterId, 
            customerId, 
            vehicleId,
            items, 
            discount = 0,
            appointmentId,
            jobCardId,
            quotationDate,
            validUntil,
            documentType,
            hasInsurance,
            insurerId,
            insuranceStartDate,
            insuranceEndDate,
            batterySerialNumber,
            customNotes,
            notes,
            noteTemplateId,
            leadId,
            // Exclude computed fields that shouldn't be in Prisma input
            quotationNumber: _quotationNumber,
            subtotal: _subtotal,
            discountPercent: _discountPercent,
            preGstAmount: _preGstAmount,
            cgst: _cgst,
            sgst: _sgst,
            igst: _igst,
            totalAmount: _totalAmount,
            status: _status,
            ...rest 
        } = createQuotationDto;

        // Check if vehicle has an active job card and enforce linkage
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { currentStatus: true, activeJobCardId: true }
        });

        if (vehicle?.currentStatus === 'ACTIVE_JOB_CARD' && !jobCardId) {
            throw new BadRequestException(`Vehicle has an active Job Card (${vehicle.activeJobCardId}). Quotation must be linked to it.`);
        }

        // Check if quotation already exists for this appointment or job card with the same documentType
        if (appointmentId || jobCardId) {
            const existingQuotation = await this.prisma.quotation.findFirst({
                where: {
                    documentType: documentType || 'Quotation',
                    OR: [
                        { appointmentId: appointmentId || undefined },
                        { jobCardId: jobCardId || undefined },
                    ].filter(cond => cond[Object.keys(cond)[0]] !== undefined)
                }
            });

            if (existingQuotation) {
                throw new BadRequestException(`A ${documentType || 'Quotation'} already exists for this appointment or job card`);
            }
        }

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

        const discountAmount = discount || 0;
        const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
        const preGstAmount = subtotal - discountAmount;

        const cgst = gstTotal / 2;
        const sgst = gstTotal / 2;
        const igst = 0; // In production, calculate based on customer state
        const totalAmount = preGstAmount + gstTotal;

        return this.prisma.quotation.create({
            data: {
                serviceCenterId,
                customerId,
                vehicleId,
                appointmentId: appointmentId || null,
                jobCardId: jobCardId || null,
                quotationNumber,
                documentType: documentType || 'Quotation',
                quotationDate: quotationDate ? new Date(quotationDate) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null,
                hasInsurance: hasInsurance || false,
                insurerId: insurerId || null,
                insuranceStartDate: insuranceStartDate ? new Date(insuranceStartDate) : null,
                insuranceEndDate: insuranceEndDate ? new Date(insuranceEndDate) : null,
                batterySerialNumber: batterySerialNumber || null,
                customNotes: customNotes || notes || null,
                noteTemplateId: noteTemplateId || null,
                leadId: leadId || null,
                subtotal,
                preGstAmount,
                cgst,
                sgst,
                igst,
                totalAmount,
                discount: discountAmount,
                discountPercent,
                status: 'DRAFT',
                items: {
                    create: items.map((item: any, index: number) => ({
                        serialNumber: item.serialNumber || index + 1,
                        partName: item.partName,
                        partNumber: item.partNumber || null,
                        hsnSacCode: item.hsnSacCode || null,
                        quantity: item.quantity,
                        rate: item.rate,
                        gstPercent: item.gstPercent,
                        amount: item.amount || (item.rate * item.quantity * (1 + (item.gstPercent || 18) / 100)),
                    })),
                },
            },
            include: {
                items: true,
                customer: true,
                vehicle: true,
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
        const { page = 1, limit = 20, sortBy, sortOrder, serviceCenterId, status, customerId } = query;
        const skip = calculateSkip(page, parseInt(limit));

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;

        const [data, total] = await Promise.all([
            this.prisma.quotation.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true, vehicleMake: true, vehicleModel: true } },
                    items: true,
                },
                orderBy: buildOrderBy(sortBy, sortOrder),
            }),
            this.prisma.quotation.count({ where }),
        ]);

        return paginate(data, total, page, parseInt(limit));
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

    async update(id: string, updateDto: any) {
        const { items, ...rest } = updateDto;

        await this.findOne(id);

        // Recalculate totals if items are provided
        let totals: any = {};
        if (items) {
            const subtotal = items.reduce((acc, item) => acc + item.rate * item.quantity, 0);
            const gstTotal = items.reduce((acc, item) => {
                const itemSubtotal = item.rate * item.quantity;
                return acc + (itemSubtotal * item.gstPercent) / 100;
            }, 0);

            const discountAmount = rest.discount ?? 0;
            const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
            const preGstAmount = subtotal - discountAmount;

            const cgst = gstTotal / 2;
            const sgst = gstTotal / 2;
            const igst = 0;
            const totalAmount = preGstAmount + gstTotal;

            totals = { subtotal, preGstAmount, cgst, sgst, igst, totalAmount, discountPercent };
        }

        return this.prisma.$transaction(async (tx) => {
            if (items) {
                // Remove old items
                await tx.quotationItem.deleteMany({
                    where: { quotationId: id },
                });

                // Create new items
                await tx.quotationItem.createMany({
                    data: items.map((item: any, index: number) => ({
                        serialNumber: item.serialNumber || index + 1,
                        partName: item.partName,
                        partNumber: item.partNumber,
                        quantity: item.quantity,
                        rate: item.rate,
                        gstPercent: item.gstPercent,
                        amount: item.amount || (item.rate * item.quantity * (1 + (item.gstPercent || 18) / 100)),
                        quotationId: id,
                    })),
                });
            }

            // Update quotation
            return tx.quotation.update({
                where: { id },
                data: {
                    ...rest,
                    ...totals,
                    // Handle dates if present
                    quotationDate: rest.quotationDate ? new Date(rest.quotationDate) : undefined,
                    insuranceStartDate: rest.insuranceStartDate ? new Date(rest.insuranceStartDate) : undefined,
                    insuranceEndDate: rest.insuranceEndDate ? new Date(rest.insuranceEndDate) : undefined,
                    sentToCustomerAt: rest.sentToCustomerAt ? new Date(rest.sentToCustomerAt) : undefined,
                    customerApprovedAt: rest.customerApprovedAt ? new Date(rest.customerApprovedAt) : undefined,
                    customerRejectedAt: rest.customerRejectedAt ? new Date(rest.customerRejectedAt) : undefined,
                    sentToManagerAt: rest.sentToManagerAt ? new Date(rest.sentToManagerAt) : undefined,
                    managerApprovedAt: rest.managerApprovedAt ? new Date(rest.managerApprovedAt) : undefined,
                    managerRejectedAt: rest.managerRejectedAt ? new Date(rest.managerRejectedAt) : undefined,
                    whatsappSentAt: rest.whatsappSentAt ? new Date(rest.whatsappSentAt) : undefined,
                    passedToManagerAt: rest.passedToManagerAt ? new Date(rest.passedToManagerAt) : undefined,
                },
                include: {
                    items: true,
                    customer: true,
                    vehicle: true,
                },
            });
        });
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
        return this.prisma.quotation.update({
            where: { id },
            data: {
                status
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.$transaction(async (tx) => {
            // Delete associated items first
            await tx.quotationItem.deleteMany({
                where: { quotationId: id },
            });

            // Then delete the quotation
            return tx.quotation.delete({
                where: { id },
            });
        });
    }
}
