import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeadDto, LeadStatus } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';

@Injectable()
export class LeadsService {
    constructor(private prisma: PrismaService) { }

    async create(createLeadDto: CreateLeadDto) {
        // Generate lead number: LEAD-{YYYY}-{MM}-{SEQ}
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `LEAD-${year}-${month}-`;

        const lastLead = await this.prisma.lead.findFirst({
            where: { leadNumber: { startsWith: prefix } },
            orderBy: { leadNumber: 'desc' },
        });

        let seq = 1;
        if (lastLead) {
            const parts = lastLead.leadNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const leadNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        return this.prisma.lead.create({
            data: {
                leadNumber,
                customerName: createLeadDto.customerName,
                phone: createLeadDto.phone,
                email: createLeadDto.email,
                vehicleModel: createLeadDto.vehicleModel,
                vehicleMake: createLeadDto.vehicleMake,
                inquiryType: createLeadDto.inquiryType || 'Service',
                serviceType: createLeadDto.serviceType,
                source: createLeadDto.source,
                notes: createLeadDto.notes,
                status: LeadStatus.NEW,
                serviceCenterId: createLeadDto.serviceCenterId,
                assignedTo: createLeadDto.assignedTo || null,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 10, sortBy, sortOrder, ...filters } = query;
        const skip = calculateSkip(page, parseInt(limit));

        const where: any = {};

        if (filters.serviceCenterId) {
            where.serviceCenterId = filters.serviceCenterId;
        }

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.assignedTo) {
            where.assignedToId = filters.assignedTo;
        }

        if (filters.search) {
            where.OR = [
                { customerName: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { leadNumber: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.prisma.lead.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: buildOrderBy(sortBy, sortOrder),
            }),
            this.prisma.lead.count({ where }),
        ]);

        return paginate(data, total, page, parseInt(limit));
    }

    async findOne(id: string) {
        const lead = await this.prisma.lead.findUnique({
            where: { id },
        });

        if (!lead) {
            throw new NotFoundException('Lead not found');
        }

        return lead;
    }

    async update(id: string, updateLeadDto: UpdateLeadDto) {
        await this.findOne(id); // Verify exists

        return this.prisma.lead.update({
            where: { id },
            data: {
                customerName: updateLeadDto.customerName,
                phone: updateLeadDto.phone,
                email: updateLeadDto.email,
                vehicleModel: updateLeadDto.vehicleModel,
                vehicleMake: updateLeadDto.vehicleMake,
                serviceType: updateLeadDto.serviceType,
                source: updateLeadDto.source,
                notes: updateLeadDto.notes,
                status: updateLeadDto.status as any,
                assignedTo: updateLeadDto.assignedTo || null,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Verify exists

        return this.prisma.lead.delete({
            where: { id },
        });
    }

    async convertToQuotation(id: string, quotationId: string) {
        return this.prisma.lead.update({
            where: { id },
            data: {
                status: LeadStatus.CONVERTED,
                // @ts-ignore - Field will be available after migration
                convertedToQuotationId: quotationId,
            },
        });
    }

    async convertToJobCard(id: string, jobCardId: string) {
        return this.prisma.lead.update({
            where: { id },
            data: {
                status: LeadStatus.CONVERTED,
                // @ts-ignore - Field will be available after migration
                convertedToJobCardId: jobCardId,
            },
        });
    }
}
