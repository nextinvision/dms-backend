import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { paginate, calculateSkip } from '../../common/utils/pagination.util';
import { generateDocumentNumber } from '../../common/utils/document-number.util';

@Injectable()
export class PurchaseOrdersService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePurchaseOrderDto) {
        const { items } = createDto;

        // Validate items - must have either centralInventoryPartId or inventoryPartId
        for (const item of items) {
            if (!item.centralInventoryPartId && !item.inventoryPartId) {
                throw new BadRequestException('Each item must have either centralInventoryPartId or inventoryPartId');
            }
            
            // If inventoryPartId is provided, fetch the part to get all details if not provided
            if (item.inventoryPartId) {
                const inventoryPart = await this.prisma.inventory.findUnique({
                    where: { id: item.inventoryPartId },
                });
                if (!inventoryPart) {
                    throw new NotFoundException(`Inventory part ${item.inventoryPartId} not found`);
                }
                // Populate all part fields from inventory if not provided
                if (!item.partName) item.partName = inventoryPart.partName;
                if (!item.partNumber) item.partNumber = inventoryPart.partNumber;
                if (!item.oemPartNumber) item.oemPartNumber = inventoryPart.oemPartNumber || null;
                if (!item.category) item.category = inventoryPart.category;
                if (!item.originType) item.originType = inventoryPart.originType || null;
                if (!item.description) item.description = inventoryPart.description || null;
                if (!item.brandName) item.brandName = inventoryPart.brandName || null;
                if (!item.variant) item.variant = inventoryPart.variant || null;
                if (!item.partType) item.partType = inventoryPart.partType || null;
                if (!item.color) item.color = inventoryPart.color || null;
                if (!item.unit) item.unit = inventoryPart.unit || null;
                // Use inventory part pricing if not provided
                if (!item.unitPrice) {
                    item.unitPrice = Number(inventoryPart.costPrice); // Use costPrice for purchase orders
                }
                if (!item.gstRate) {
                    item.gstRate = inventoryPart.gstRate;
                }
            }
        }

        // Generate PO Number: PO-{YYYY}-{SEQ}
        const poNumber = await generateDocumentNumber(this.prisma, {
            prefix: 'PO',
            fieldName: 'poNumber',
            model: this.prisma.purchaseOrder,
        });

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
                poNumber,
                supplierId: createDto.supplierId,
                fromServiceCenterId: createDto.fromServiceCenterId,
                requestedById: createDto.requestedById,
                subtotal,
                cgst,
                sgst,
                totalAmount,
                status: 'DRAFT',
                orderDate: new Date(createDto.orderDate),
                expectedDeliveryDate: createDto.expectedDeliveryDate ? new Date(createDto.expectedDeliveryDate) : null,
                paymentTerms: createDto.paymentTerms,
                orderNotes: createDto.orderNotes,
                items: {
                    create: items.map(item => ({
                        centralInventoryPartId: item.centralInventoryPartId,
                        inventoryPartId: item.inventoryPartId,
                        // Part Information
                        partName: item.partName,
                        partNumber: item.partNumber,
                        oemPartNumber: item.oemPartNumber,
                        category: item.category,
                        originType: item.originType,
                        description: item.description,
                        brandName: item.brandName,
                        variant: item.variant,
                        partType: item.partType,
                        color: item.color,
                        unit: item.unit,
                        // Quantity and Pricing
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        gstRate: item.gstRate,
                        // Additional Information
                        urgency: item.urgency,
                        notes: item.notes,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        inventoryPart: true,
                    },
                },
                supplier: true,
                fromServiceCenter: true,
                requestedBy: true,
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, status, supplierId, fromServiceCenterId, onlyServiceCenterOrders } = query;
        const skip = calculateSkip(page, limit);

        const where: any = {};
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;
        
        // Filter to only show purchase orders from service centers (not supplier orders)
        // If onlyServiceCenterOrders is true or not specified, show only SC orders
        if (onlyServiceCenterOrders !== false && !fromServiceCenterId) {
            where.fromServiceCenterId = { not: null };
        } else if (fromServiceCenterId) {
            // If specific service center ID is provided, use it
            where.fromServiceCenterId = fromServiceCenterId;
        }

        const [data, total] = await Promise.all([
            this.prisma.purchaseOrder.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: { 
                    supplier: true,
                    fromServiceCenter: true,
                    requestedBy: true,
                    items: {
                        include: {
                            inventoryPart: true,
                        },
                    },
                    partsIssues: {
                        include: {
                            items: {
                                include: {
                                    dispatches: {
                                        orderBy: { dispatchedAt: 'desc' }
                                    }
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.purchaseOrder.count({ where }),
        ]);

        return paginate(data, total, Number(page), Number(limit));
    }

    async findOne(id: string) {
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                fromServiceCenter: true,
                requestedBy: true,
                items: {
                    include: {
                        inventoryPart: true,
                    },
                },
                partsIssues: {
                    include: {
                        items: {
                            include: {
                                dispatches: {
                                    orderBy: { dispatchedAt: 'desc' }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
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
            include: {
                items: {
                    include: {
                        inventoryPart: true,
                    },
                },
                supplier: true,
                fromServiceCenter: true,
                requestedBy: true,
            },
        });
    }

    async approve(id: string) {
        const po = await this.findOne(id);
        if (po.status !== 'PENDING_APPROVAL') throw new BadRequestException('Can only approve PENDING_APPROVAL orders');
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'APPROVED' },
            include: {
                items: {
                    include: {
                        inventoryPart: true,
                    },
                },
                supplier: true,
                fromServiceCenter: true,
                requestedBy: true,
            },
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

                // Get the PO item to check which inventory to update
                const poItem = await tx.pOItem.findUnique({
                    where: { id: rxItem.itemId },
                });

                if (poItem) {
                    if (poItem.centralInventoryPartId) {
                        // Update Central Inventory
                        await tx.centralInventory.update({
                            where: { id: poItem.centralInventoryPartId },
                            data: {
                                stockQuantity: { increment: rxItem.acceptedQty },
                            },
                        });
                    } else if (poItem.inventoryPartId) {
                        // Update Service Center Inventory
                        await tx.inventory.update({
                            where: { id: poItem.inventoryPartId },
                            data: {
                                stockQuantity: { increment: rxItem.acceptedQty },
                            },
                        });
                    }
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
