import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobCardDto } from './dto/create-job-card.dto';
import { AssignEngineerDto } from './dto/assign-engineer.dto';
import { UpdateJobCardStatusDto } from './dto/update-status.dto';

@Injectable()
export class JobCardsService {
    constructor(private prisma: PrismaService) { }

    async create(createJobCardDto: CreateJobCardDto) {
        const { serviceCenterId, vehicleId } = createJobCardDto;

        // Get SC Code
        const sc = await this.prisma.serviceCenter.findUnique({
            where: { id: serviceCenterId },
        });
        if (!sc) throw new NotFoundException('Service Center not found');

        // Generate jobCardNumber: {scCode}-{YYYY}-{MM}-{SEQ}
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `${sc.code}-${year}-${month}-`;

        const lastJobCard = await this.prisma.jobCard.findFirst({
            where: { jobCardNumber: { startsWith: prefix } },
            orderBy: { jobCardNumber: 'desc' },
        });

        let seq = 1;
        if (lastJobCard) {
            const parts = lastJobCard.jobCardNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const jobCardNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        // Create Job Card in transaction
        return this.prisma.$transaction(async (tx) => {
            const jobCard = await tx.jobCard.create({
                data: {
                    ...createJobCardDto,
                    jobCardNumber,
                    status: 'CREATED',
                },
            });

            // Update vehicle status
            await tx.vehicle.update({
                where: { id: vehicleId },
                data: {
                    currentStatus: 'ACTIVE_JOB_CARD',
                    activeJobCardId: jobCard.id,
                },
            });

            return jobCard;
        });
    }

    async assignEngineer(id: string, assignEngineerDto: AssignEngineerDto) {
        const jobCard = await this.prisma.jobCard.findUnique({ where: { id } });
        if (!jobCard) throw new NotFoundException('Job Card not found');

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                assignedEngineerId: assignEngineerDto.engineerId,
                status: 'ASSIGNED',
            },
        });
    }

    async updateStatus(id: string, updateStatusDto: UpdateJobCardStatusDto) {
        const jobCard = await this.prisma.jobCard.findUnique({ where: { id } });
        if (!jobCard) throw new NotFoundException('Job Card not found');

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                status: updateStatusDto.status,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, serviceCenterId, status, customerId, vehicleId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (vehicleId) where.vehicleId = vehicleId;

        const [data, total] = await Promise.all([
            this.prisma.jobCard.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true, vehicleModel: true } },
                    assignedEngineer: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.jobCard.count({ where }),
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
        const jobCard = await this.prisma.jobCard.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                assignedEngineer: true,
                items: true,
                partsRequests: {
                    include: { items: true }
                }
            },
        });

        if (!jobCard) throw new NotFoundException('Job Card not found');
        return jobCard;
    }
}
