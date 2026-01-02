import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';
import { PdfGeneratorService } from '../pdf-generator/pdf-generator.service';
import { FilesService } from '../files/files.service';
import { FileCategory, RelatedEntityType } from '../files/dto/create-file.dto';

@Injectable()
export class QuotationsService {
    constructor(
        private prisma: PrismaService,
        private pdfGenerator: PdfGeneratorService,
        private filesService: FilesService,
    ) { }

    async create(createQuotationDto: CreateQuotationDto) {
        const { serviceCenterId, items, discount = 0, ...rest } = createQuotationDto;

        // Check if vehicle has an active job card and enforce linkage
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: rest.vehicleId },
            select: { currentStatus: true, activeJobCardId: true }
        });

        if (vehicle?.currentStatus === 'ACTIVE_JOB_CARD' && !rest.jobCardId) {
            throw new BadRequestException(`Vehicle has an active Job Card (${vehicle.activeJobCardId}). Quotation must be linked to it.`);
        }

        // Check if quotation already exists for this appointment or job card with the same documentType
        if (rest.appointmentId || rest.jobCardId) {
            const existingQuotation = await this.prisma.quotation.findFirst({
                where: {
                    documentType: rest.documentType || 'Quotation',
                    OR: [
                        { appointmentId: rest.appointmentId || undefined },
                        { jobCardId: rest.jobCardId || undefined },
                    ].filter(cond => cond[Object.keys(cond)[0]] !== undefined)
                }
            });

            if (existingQuotation) {
                throw new BadRequestException(`A ${rest.documentType || 'Quotation'} already exists for this appointment or job card`);
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
                ...rest,
                serviceCenterId,
                quotationNumber,
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
                        partNumber: item.partNumber,
                        quantity: item.quantity,
                        rate: item.rate,
                        gstPercent: item.gstPercent,
                        amount: item.amount || (item.rate * item.quantity * (1 + (item.gstPercent || 18) / 100)),
                    })),
                },
                // Handle optional dates
                quotationDate: rest.quotationDate ? new Date(rest.quotationDate) : new Date(),
                insuranceStartDate: rest.insuranceStartDate ? new Date(rest.insuranceStartDate) : undefined,
                insuranceEndDate: rest.insuranceEndDate ? new Date(rest.insuranceEndDate) : undefined,
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

    async updateCustomerApproval(id: string, data: { status: 'APPROVED' | 'REJECTED'; reason?: string }) {
        await this.findOne(id);
        const status = data.status === 'APPROVED' ? 'CUSTOMER_APPROVED' : 'CUSTOMER_REJECTED';

        const updateData: any = {
            status,
            customerApprovalStatus: data.status,
            customerApproved: data.status === 'APPROVED',
            customerApprovedAt: data.status === 'APPROVED' ? new Date() : null,
            customerRejected: data.status === 'REJECTED',
            customerRejectedAt: data.status === 'REJECTED' ? new Date() : null,
            customerRejectionReason: data.reason || null,
        };

        // If approved, delete the quotation PDF
        if (data.status === 'APPROVED') {
            try {
                await this.filesService.deleteFilesByCategory(
                    'quotation',
                    id,
                    'quotation_pdf' as FileCategory,
                );
            } catch (error) {
                console.error('Failed to delete quotation PDF:', error);
            }
        }

        return this.prisma.quotation.update({
            where: { id },
            data: updateData,
        });
    }

    async generateAndSendPdf(id: string) {
        // Import the HTML template helper
        const { generateQuotationHtmlTemplate } = await import('./templates/quotation-html.template');

        // Fetch complete quotation data with all relations
        const quotation = await this.prisma.quotation.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                items: {
                    orderBy: { serialNumber: 'asc' },
                },
                serviceCenter: true,
            },
        });

        if (!quotation) {
            throw new NotFoundException('Quotation not found');
        }

        // Get WhatsApp number and validate
        const rawWhatsapp = (quotation.customer as any)?.whatsappNumber || quotation.customer?.phone;
        if (!rawWhatsapp) {
            throw new BadRequestException('Customer WhatsApp number is missing');
        }

        let customerWhatsapp = rawWhatsapp.replace(/\D/g, '');

        // Handle leading '0'
        if (customerWhatsapp.length === 11 && customerWhatsapp.startsWith('0')) {
            customerWhatsapp = customerWhatsapp.substring(1);
        }

        // Ensure 91 prefix for Indian numbers
        if (customerWhatsapp.length === 10) {
            customerWhatsapp = `91${customerWhatsapp}`;
        }

        // Validate WhatsApp number
        if (customerWhatsapp.length < 10) {
            throw new BadRequestException('Invalid WhatsApp number format');
        }

        // Prepare service center and advisor data
        const serviceCenter = quotation.serviceCenter || {
            name: '42 EV Tech & Services',
            address: '123 Main Street, Industrial Area',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            phone: '+91-20-12345678',
        };

        const serviceAdvisor = {
            name: 'Service Advisor',
            phone: '+91-9876543210',
        };

        // Generate HTML
        const html = generateQuotationHtmlTemplate({
            quotation,
            serviceCenter,
            serviceAdvisor,
        });

        // Generate PDF
        const pdfBuffer = await this.pdfGenerator.generatePdfFromHtml(html, {
            filename: `quotation-${quotation.quotationNumber}.pdf`,
        });

        // Upload PDF to file system
        const { url: pdfUrl, file } = await this.filesService.uploadBuffer(
            pdfBuffer,
            `quotation-${quotation.quotationNumber}.pdf`,
            {
                category: 'quotation_pdf' as FileCategory,
                relatedEntityType: 'quotation' as RelatedEntityType,
                relatedEntityId: quotation.id,
            }
        );

        // Update quotation status
        await this.prisma.quotation.update({
            where: { id },
            data: {
                status: 'SENT_TO_CUSTOMER',
                sentToCustomer: true,
                sentToCustomerAt: new Date(),
                whatsappSent: true,
                whatsappSentAt: new Date(),
            },
        });

        return {
            success: true,
            pdfUrl,
            whatsappNumber: customerWhatsapp,
            fileId: file.id,
        };
    }
}
