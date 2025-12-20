import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePurchaseOrderDto) {
        const { items } = createDto;

        // Generate PO Number: PO-{YYYY}-{SEQ}
        const year = new Date().getFullYear();
        const prefix = `PO-${year}-`;
        const lastPO = await this.prisma.purchaseOrder.findFirst({
            where: { poNumber: { startsWith: prefix } },
            orderBy: { poNumber: 'desc' },
        });

        let seq = 1;
        if (lastPO) {
            const parts = lastPO.poNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const poNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        // Calculate totals
        const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
        const gstTotal = items.reduce((acc, item) => {
            const itemSubtotal = item.unitPrice * item.quantity;
            return acc + (itemSubtotal * item.gstRate) / 100;
        }, 0);

        const cgst = gstTotal / 2;
        const sgst = gstTotal / 2;
        const totalAmount = subtotal + gstTotal;

        return this.prisma.purchaseOrder.create({
            data: {
                ...createDto,
                poNumber,
                subtotal,
                cgst,
                sgst,
                totalAmount,
                status: 'DRAFT',
                orderDate: new Date(createDto.orderDate),
                expectedDeliveryDate: createDto.expectedDeliveryDate ? new Date(createDto.expectedDeliveryDate) : null,
                items: {
                    create: items,
                },
            },
            include: {
                items: true,
                supplier: true,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, status, supplierId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        const [data, total] = await Promise.all([
            this.prisma.purchaseOrder.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: { supplier: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.purchaseOrder.count({ where }),
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
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                items: true,
            },
        });

        if (!po) throw new NotFoundException('Purchase Order not found');
        return po;
    }

    async submit(id: string) {
        const po = await this.findOne(id);
        if (po.status !== 'DRAFT') throw new BadRequestException('Can only submit DRAFT orders');
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'PENDING_APPROVAL' },
        });
    }

    async approve(id: string) {
        const po = await this.findOne(id);
        if (po.status !== 'PENDING_APPROVAL') throw new BadRequestException('Can only approve PENDING_APPROVAL orders');
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'APPROVED' },
        });
    }

    async receive(id: string, receivedData: any) {
        const po = await this.findOne(id);
        if (po.status !== 'APPROVED') throw new BadRequestException('Can only receive APPROVED orders');

        return this.prisma.$transaction(async (tx) => {
            // Update PO item received quantities
            for (const rxItem of receivedData.receivedItems) {
                await tx.pOItem.update({
                    where: { id: rxItem.itemId },
                    data: { receivedQty: rxItem.acceptedQty },
                });

                // Update Central Inventory
                const poItem = po.items.find(i => i.id === rxItem.itemId);
                if (poItem) {
                    await tx.centralInventory.update({
                        where: { id: poItem.centralInventoryPartId },
                        data: {
                            stockQuantity: { increment: rxItem.acceptedQty },
                        },
                    });
                }
            }

            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });
        });
    }
}
