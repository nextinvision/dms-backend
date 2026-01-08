import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInventoryPartDto } from './dto/create-inventory-part.dto';
import { AdjustStockDto, AdjustmentType } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateInventoryPartDto) {
        return this.prisma.inventory.create({
            data: createDto,
        });
    }

    async findAll(query: any) {
        const { serviceCenterId, category, search, lowStock } = query;
        const where: any = {};

        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (category) where.category = category;

        if (search) {
            where.OR = [
                { partName: { contains: search, mode: 'insensitive' } },
                { partNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        let parts = await this.prisma.inventory.findMany({
            where,
            orderBy: { partName: 'asc' },
        });

        // Filter lowStock in memory since Prisma doesn't support field-to-field comparison
        if (lowStock === 'true') {
            parts = parts.filter(p => p.stockQuantity <= p.minStockLevel);
        }

        return parts;
    }

    async adjustStock(id: string, adjustDto: AdjustStockDto) {
        const part = await this.prisma.inventory.findUnique({ where: { id } });
        if (!part) throw new NotFoundException('Part not found');

        let newQuantity = part.stockQuantity;
        if (adjustDto.adjustmentType === AdjustmentType.ADD) {
            newQuantity += adjustDto.quantity;
        } else if (adjustDto.adjustmentType === AdjustmentType.SUBTRACT) {
            newQuantity -= adjustDto.quantity;
        } else if (adjustDto.adjustmentType === AdjustmentType.SET) {
            newQuantity = adjustDto.quantity;
        }

        return this.prisma.inventory.update({
            where: { id },
            data: { stockQuantity: newQuantity },
        });
    }

    async update(id: string, updateDto: any) {
        const part = await this.prisma.inventory.findUnique({ where: { id } });
        if (!part) throw new NotFoundException('Part not found');

        return this.prisma.inventory.update({
            where: { id },
            data: updateDto,
        });
    }

    async remove(id: string) {
        return this.prisma.inventory.delete({ where: { id } });
    }

    async getLowStock(serviceCenterId: string) {
        // We need to find parts where stockQuantity <= minStockLevel
        // Since Prisma doesn't support comparing columns in `findMany` easily, we can use raw query or fetch and filter
        // For now, I'll fetch and filter or just use a dummy implementation if the count is small
        const allParts = await this.prisma.inventory.findMany({
            where: { serviceCenterId },
        });
        return allParts.filter(p => p.stockQuantity <= p.minStockLevel);
    }
}
