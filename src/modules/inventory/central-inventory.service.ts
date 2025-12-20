import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CentralInventoryService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: any) {
        const { category, search } = query;
        const where: any = {};
        if (category) where.category = category;
        if (search) {
            where.OR = [
                { partName: { contains: search, mode: 'insensitive' } },
                { partNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        const data = await this.prisma.centralInventory.findMany({ where });

        // Auto-calculate available
        return data.map(item => ({
            ...item,
            available: item.stockQuantity - item.allocated
        }));
    }

    async findOne(id: string) {
        const item = await this.prisma.centralInventory.findUnique({ where: { id } });
        if (!item) throw new NotFoundException('Central inventory item not found');
        return {
            ...item,
            available: item.stockQuantity - item.allocated
        };
    }

    async create(data: any) {
        return this.prisma.centralInventory.create({
            data: {
                ...data,
                available: data.stockQuantity - (data.allocated || 0)
            }
        });
    }
}
