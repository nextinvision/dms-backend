import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateHomeServiceDto } from './dto/create-home-service.dto';
import { UpdateHomeServiceDto } from './dto/update-home-service.dto';
import { HomeServiceStatus } from './dto/create-home-service.dto';
import { calculateSkip } from '../../common/utils/pagination.util';
import { generateDocumentNumber } from '../../common/utils/document-number.util';

@Injectable()
export class HomeServicesService {
    constructor(private prisma: PrismaService) { }

    // Common include selections to avoid duplication
    private readonly defaultInclude = {
        customer: {
            select: {
                id: true,
                name: true,
                phone: true,
            },
        },
        vehicle: {
            select: {
                id: true,
                registration: true,
                vehicleMake: true,
                vehicleModel: true,
            },
        },
        assignedEngineer: {
            select: {
                id: true,
                name: true,
            },
        },
        serviceCenter: {
            select: {
                id: true,
                name: true,
                code: true,
            },
        },
    };

    private readonly detailInclude = {
        ...this.defaultInclude,
        assignedEngineer: {
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        },
        serviceCenter: {
            select: {
                id: true,
                name: true,
                code: true,
                address: true,
                phone: true,
            },
        },
        createdBy: {
            select: {
                id: true,
                name: true,
            },
        },
    };

    async create(createHomeServiceDto: CreateHomeServiceDto, createdById?: string) {
        const { serviceCenterId } = createHomeServiceDto;

        // Get Service Center to generate service number
        const sc = await this.prisma.serviceCenter.findUnique({
            where: { id: serviceCenterId },
        });
        if (!sc) throw new NotFoundException('Service Center not found');

        // Generate service number: HS-{SCCODE}-{YYYY}-{SEQ}
        const serviceNumber = await generateDocumentNumber(this.prisma, {
            prefix: 'HS',
            fieldName: 'serviceNumber',
            model: this.prisma.homeService,
            sequenceLength: 3,
            includeServiceCenterCode: sc.code,
        });

        // Convert scheduledDate string to DateTime
        const scheduledDate = new Date(createHomeServiceDto.scheduledDate);

        return this.prisma.homeService.create({
            data: {
                serviceNumber,
                serviceCenterId,
                customerId: createHomeServiceDto.customerId,
                customerName: createHomeServiceDto.customerName,
                phone: createHomeServiceDto.phone,
                vehicleId: createHomeServiceDto.vehicleId,
                vehicleModel: createHomeServiceDto.vehicleModel,
                registration: createHomeServiceDto.registration,
                serviceAddress: createHomeServiceDto.serviceAddress,
                serviceType: createHomeServiceDto.serviceType,
                scheduledDate,
                scheduledTime: createHomeServiceDto.scheduledTime,
                estimatedCost: createHomeServiceDto.estimatedCost,
                assignedEngineerId: createHomeServiceDto.assignedEngineerId,
                status: createHomeServiceDto.status || HomeServiceStatus.SCHEDULED,
                createdById,
            },
            include: this.detailInclude,
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, serviceCenterId, status, customerId } = query;
        const skip = calculateSkip(page, limit);

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;

        const [data, total] = await Promise.all([
            this.prisma.homeService.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: this.defaultInclude,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.homeService.count({ where }),
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
        const homeService = await this.prisma.homeService.findUnique({
            where: { id },
            include: {
                ...this.detailInclude,
                customer: true, // Include full customer object for detail view
                vehicle: true,  // Include full vehicle object for detail view
            },
        });

        if (!homeService) {
            throw new NotFoundException('Home service not found');
        }

        return homeService;
    }

    async update(id: string, updateHomeServiceDto: UpdateHomeServiceDto) {
        await this.findOne(id); // Verify exists

        const updateData: any = { ...updateHomeServiceDto };

        // Convert date strings to DateTime if provided
        const dateFields = ['scheduledDate', 'startTime', 'completedAt'] as const;
        dateFields.forEach((field) => {
            if (updateHomeServiceDto[field]) {
                updateData[field] = new Date(updateHomeServiceDto[field]!);
            }
        });

        return this.prisma.homeService.update({
            where: { id },
            data: updateData,
            include: this.defaultInclude,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Verify exists before deletion
        return this.prisma.homeService.delete({
            where: { id },
        });
    }

    async getStats(serviceCenterId?: string) {
        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;

        const [scheduled, inProgress, completed, total] = await Promise.all([
            this.prisma.homeService.count({
                where: { ...where, status: HomeServiceStatus.SCHEDULED },
            }),
            this.prisma.homeService.count({
                where: { ...where, status: HomeServiceStatus.IN_PROGRESS },
            }),
            this.prisma.homeService.count({
                where: { ...where, status: HomeServiceStatus.COMPLETED },
            }),
            this.prisma.homeService.count({ where }),
        ]);

        return {
            scheduled,
            inProgress,
            completed,
            total,
        };
    }
}

