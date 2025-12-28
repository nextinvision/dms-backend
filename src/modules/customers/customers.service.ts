import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }

    async create(createCustomerDto: CreateCustomerDto) {
        // Check if phone already exists
        const existing = await this.prisma.customer.findFirst({
            where: { phone: createCustomerDto.phone, deletedAt: null },
        });

        if (existing) {
            throw new BadRequestException('Customer with this phone number already exists');
        }

        // Generate customer number
        const lastCustomer = await this.prisma.customer.findFirst({
            orderBy: { customerNumber: 'desc' },
        });

        let nextNumber = 1;
        if (lastCustomer && lastCustomer.customerNumber.startsWith('CUST-')) {
            const lastCount = parseInt(lastCustomer.customerNumber.split('-')[1]);
            if (!isNaN(lastCount)) {
                nextNumber = lastCount + 1;
            }
        }

        const customerNumber = `CUST-${nextNumber.toString().padStart(4, '0')}`;

        // Extract createdById if provided
        const { createdById, ...customerData } = createCustomerDto as any;

        return this.prisma.customer.create({
            data: {
                ...customerData,
                customerNumber,
                ...(createdById && { createdById }),
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, search, sort, type, ...filters } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            deletedAt: null,
            ...filters,
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { customerNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    vehicles: true,
                    _count: {
                        select: { vehicles: true }
                    },
                    createdBy: { select: { id: true, name: true } },
                    updatedBy: { select: { id: true, name: true } },
                }
            }),
            this.prisma.customer.count({ where }),
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
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                vehicles: true,
                lastServiceCenter: true,
                createdBy: { select: { id: true, name: true } },
                updatedBy: { select: { id: true, name: true } },
            },
        });

        if (!customer || customer.deletedAt) {
            throw new NotFoundException('Customer not found');
        }

        return customer;
    }

    async update(id: string, updateCustomerDto: UpdateCustomerDto) {
        await this.findOne(id);

        // If phone is being updated, check if it's already taken by another customer
        if (updateCustomerDto.phone) {
            const existing = await this.prisma.customer.findFirst({
                where: {
                    phone: updateCustomerDto.phone,
                    id: { not: id },
                    deletedAt: null
                },
            });

            if (existing) {
                throw new BadRequestException('Phone number is already in use by another customer');
            }
        }

        // Extract updatedById if provided
        const { updatedById, ...customerData } = updateCustomerDto as any;

        return this.prisma.customer.update({
            where: { id },
            data: {
                ...customerData,
                ...(updatedById && { updatedById }),
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.customer.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async search(query: string, type: string = 'auto') {
        const where: any = { deletedAt: null };

        if (type === 'phone' || (type === 'auto' && /^\+?\d+$/.test(query))) {
            where.phone = { contains: query };
        } else if (type === 'email' || (type === 'auto' && query.includes('@'))) {
            where.email = { contains: query, mode: 'insensitive' };
        } else if (type === 'customerNumber' || (type === 'auto' && query.startsWith('CUST-'))) {
            where.customerNumber = { contains: query, mode: 'insensitive' };
        } else {
            where.name = { contains: query, mode: 'insensitive' };
        }

        return this.prisma.customer.findMany({
            where,
            include: { vehicles: true },
            take: 10,
        });
    }

    async bulkCreate(customers: CreateCustomerDto[]) {
        const results = [];
        for (const customerDto of customers) {
            try {
                const result = await this.create(customerDto);
                results.push({ success: true, data: result });
            } catch (error) {
                results.push({ success: false, error: error.message, data: customerDto });
            }
        }

        const created = results.filter(r => r.success).length;
        const failed = results.length - created;

        return { created, failed, results };
    }
}
