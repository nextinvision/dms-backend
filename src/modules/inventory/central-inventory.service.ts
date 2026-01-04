import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateCentralStockDto } from './dto/update-central-stock.dto';

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

    async updateStock(id: string, updateDto: UpdateCentralStockDto) {
        const item = await this.prisma.centralInventory.findUnique({ where: { id } });
        
        if (!item) {
            throw new NotFoundException('Central inventory item not found');
        }

        // Validate that new stock quantity is not less than allocated quantity
        if (updateDto.stockQuantity < item.allocated) {
            throw new BadRequestException(
                `Cannot set stock quantity to ${updateDto.stockQuantity}. ` +
                `There are ${item.allocated} units already allocated. ` +
                `Stock quantity must be at least ${item.allocated}.`
            );
        }

        // Update stock quantity
        const updated = await this.prisma.centralInventory.update({
            where: { id },
            data: {
                stockQuantity: updateDto.stockQuantity,
            },
        });

        return {
            ...updated,
            available: updated.stockQuantity - updated.allocated
        };
    }

    async addStock(id: string, quantity: number) {
        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than 0');
        }

        const item = await this.prisma.centralInventory.findUnique({ where: { id } });
        
        if (!item) {
            throw new NotFoundException('Central inventory item not found');
        }

        // Add to existing stock
        const updated = await this.prisma.centralInventory.update({
            where: { id },
            data: {
                stockQuantity: { increment: quantity },
            },
        });

        return {
            ...updated,
            available: updated.stockQuantity - updated.allocated
        };
    }
}
