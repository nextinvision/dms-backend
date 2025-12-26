import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
    constructor(private prisma: PrismaService) { }

    async create(createVehicleDto: CreateVehicleDto) {
        // Check if registration or vin already exists
        const existing = await this.prisma.vehicle.findFirst({
            where: {
                OR: [
                    { registration: createVehicleDto.registration },
                    { vin: createVehicleDto.vin },
                ],
            },
        });

        if (existing) {
            throw new BadRequestException('Vehicle with this registration or VIN already exists');
        }

        // Verify customer exists
        const customer = await this.prisma.customer.findUnique({
            where: { id: createVehicleDto.customerId },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        return this.prisma.vehicle.create({
            data: {
                ...createVehicleDto,
                purchaseDate: createVehicleDto.purchaseDate ? new Date(createVehicleDto.purchaseDate) : null,
                insuranceStartDate: createVehicleDto.insuranceStartDate ? new Date(createVehicleDto.insuranceStartDate) : null,
                insuranceEndDate: createVehicleDto.insuranceEndDate ? new Date(createVehicleDto.insuranceEndDate) : null,
                currentStatus: 'AVAILABLE',
                totalServices: 0,
                totalSpent: 0,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, search, customerId, ...filters } = query;
        const skip = (page - 1) * limit;

        const where: any = { ...filters };

        if (customerId) {
            where.customerId = customerId;
        }

        if (search) {
            where.OR = [
                { registration: { contains: search, mode: 'insensitive' } },
                { vin: { contains: search, mode: 'insensitive' } },
                { vehicleMake: { contains: search, mode: 'insensitive' } },
                { vehicleModel: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.prisma.vehicle.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    customer: {
                        select: { name: true, phone: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.vehicle.count({ where }),
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
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                customer: true,
                jobCards: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found');
        }

        return vehicle;
    }

    async update(id: string, updateVehicleDto: UpdateVehicleDto) {
        await this.findOne(id);
        const data: any = { ...updateVehicleDto };

        if (updateVehicleDto.purchaseDate) data.purchaseDate = new Date(updateVehicleDto.purchaseDate);
        if (updateVehicleDto.insuranceStartDate) data.insuranceStartDate = new Date(updateVehicleDto.insuranceStartDate);
        if (updateVehicleDto.insuranceEndDate) data.insuranceEndDate = new Date(updateVehicleDto.insuranceEndDate);

        return this.prisma.vehicle.update({
            where: { id },
            data,
        });
    }

    async getServiceHistory(id: string, query: any) {
        const { page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.jobCard.findMany({
                where: { vehicleId: id },
                skip: Number(skip),
                take: Number(limit),
                include: {
                    assignedEngineer: { select: { name: true } },
                    items: true,
                    invoices: {
                        where: { status: 'PAID' },
                        select: { invoiceNumber: true, grandTotal: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.jobCard.count({ where: { vehicleId: id } }),
        ]);

        // Format as per spec
        const history = data.map((jc) => ({
            jobCardNumber: jc.jobCardNumber,
            date: jc.createdAt,
            serviceType: jc.part1 ? (jc.part1 as any).serviceType : 'General',
            engineerName: jc.assignedEngineer?.name || 'Unassigned',
            parts: jc.items.filter(i => i.itemType === 'part').map(i => i.partName),
            totalCost: jc.invoices[0]?.grandTotal || 0,
            invoiceNumber: jc.invoices[0]?.invoiceNumber || 'N/A',
            customerFeedback: jc.part1 ? (jc.part1 as any).customerFeedback : '',
            feedbackRating: jc.part1 ? (jc.part1 as any).feedbackRating : 0,
        }));

        return {
            data: history,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
