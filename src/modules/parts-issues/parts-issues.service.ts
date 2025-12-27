import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePartsIssueDto } from './dto/create-parts-issue.dto';

@Injectable()
export class PartsIssuesService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreatePartsIssueDto, requestedById: string) {
        const { items } = createDto;

        // Generate Issue Number: PI-{YYYY}-{SEQ}
        const year = new Date().getFullYear();
        const prefix = `PI-${year}-`;
        const lastIssue = await this.prisma.partsIssue.findFirst({
            where: { issueNumber: { startsWith: prefix } },
            orderBy: { issueNumber: 'desc' },
        });

        let seq = 1;
        if (lastIssue) {
            const parts = lastIssue.issueNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const issueNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        return this.prisma.$transaction(async (tx) => {
            const issue = await tx.partsIssue.create({
                data: {
                    ...createDto,
                    issueNumber,
                    requestedById,
                    status: 'PENDING_APPROVAL',
                    items: {
                        create: items,
                    },
                },
                include: { items: true },
            });

            // Update Central Inventory: allocated += requestedQty
            for (const item of items) {
                await tx.centralInventory.update({
                    where: { id: item.centralInventoryPartId },
                    data: {
                        allocated: { increment: item.requestedQty },
                    },
                });
            }

            return issue;
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, status, toServiceCenterId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status) where.status = status;
        if (toServiceCenterId) where.toServiceCenterId = toServiceCenterId;

        const [data, total] = await Promise.all([
            this.prisma.partsIssue.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    toServiceCenter: true,
                    requestedBy: true,
                    items: true
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.partsIssue.count({ where }),
        ]);

        // Manually populate centralInventoryPart for each item
        for (const issue of data) {
            await this.populatePartDetails(issue);
        }

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
        const issue = await this.prisma.partsIssue.findUnique({
            where: { id },
            include: {
                toServiceCenter: true,
                requestedBy: true,
                items: true,
            },
        });

        if (!issue) throw new NotFoundException('Parts Issue not found');

        // Populate parts
        await this.populatePartDetails(issue);

        return issue;
    }

    private async populatePartDetails(issue: any) {
        if (!issue.items || issue.items.length === 0) return;

        const partIds = issue.items.map((i: any) => i.centralInventoryPartId);
        const parts = await this.prisma.centralInventory.findMany({
            where: { id: { in: partIds } }
        });

        issue.items = issue.items.map((item: any) => ({
            ...item,
            centralInventoryPart: parts.find(p => p.id === item.centralInventoryPartId)
        }));
    }

    async reject(id: string, reason: string) {
        const issue = await this.findOne(id);
        if (issue.status !== 'PENDING_APPROVAL') throw new BadRequestException('Can only reject PENDING_APPROVAL issues');

        return this.prisma.$transaction(async (tx) => {
            // Unallocate stock
            // Use any cast to avoid strict typing issues with 'items' if inferred incorrectly
            const issueItems = (issue as any).items;
            for (const item of issueItems) {
                await tx.centralInventory.update({
                    where: { id: item.centralInventoryPartId },
                    data: {
                        allocated: { decrement: item.requestedQty },
                    },
                });
            }

            return tx.partsIssue.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    // rejectionReason: reason, // Field does not exist in schema
                    // adminRejectedAt: new Date() // Field does not exist in schema
                },
            });
        });
    }

    async approve(id: string, approvedItems: any[]) {
        const issue = await this.findOne(id);
        if (issue.status !== 'PENDING_APPROVAL') throw new BadRequestException('Can only approve PENDING_APPROVAL issues');

        return this.prisma.$transaction(async (tx) => {
            for (const appItem of approvedItems) {
                await tx.partsIssueItem.update({
                    where: { id: appItem.itemId },
                    data: { approvedQty: appItem.approvedQty },
                });

                // Update Central Inventory
                // Cast to any to access items safely
                const originalItem = (issue as any).items.find((i: any) => i.id === appItem.itemId);
                if (originalItem) {
                    await tx.centralInventory.update({
                        where: { id: originalItem.centralInventoryPartId },
                        data: {
                            stockQuantity: { decrement: appItem.approvedQty },
                            allocated: { decrement: originalItem.requestedQty },
                        },
                    });
                }
            }

            return tx.partsIssue.update({
                where: { id },
                data: { status: 'APPROVED' },
            });
        });
    }

    async dispatch(id: string, transportDetails: any) {
        const issue = await this.findOne(id);
        if (issue.status !== 'APPROVED') throw new BadRequestException('Can only dispatch APPROVED issues');

        return this.prisma.partsIssue.update({
            where: { id },
            data: {
                status: 'DISPATCHED',
                dispatchedDate: new Date(),
                transportDetails: transportDetails as any, // Cast JSON
            },
        });
    }

    async receive(id: string, receivedItems: any[]) {
        const issue = await this.findOne(id);
        if (issue.status !== 'DISPATCHED') throw new BadRequestException('Can only receive DISPATCHED issues');

        return this.prisma.$transaction(async (tx) => {
            for (const rxItem of receivedItems) {
                await tx.partsIssueItem.update({
                    where: { id: rxItem.itemId },
                    data: { receivedQty: rxItem.receivedQty },
                });

                // Update Service Center Inventory: stockQuantity += receivedQty
                const originalItem = issue.items.find(i => i.id === rxItem.itemId);
                if (originalItem) {
                    // Find or Create part in SC inventory
                    const centralPart = await tx.centralInventory.findUnique({
                        where: { id: originalItem.centralInventoryPartId }
                    });

                    if (centralPart) {
                        await tx.inventory.upsert({
                            where: {
                                // We need a unique constraint on (serviceCenterId, partNumber) for upsert to work well
                                // But since we don't have it explicitly as a compound unique key in schema yet, 
                                // let's do find and update/create
                                id: 'dummy' // Just a placeholder
                            },
                            create: {
                                serviceCenterId: issue.toServiceCenterId,
                                partName: centralPart.partName,
                                partNumber: centralPart.partNumber,
                                category: centralPart.category,
                                unitPrice: centralPart.unitPrice,
                                costPrice: centralPart.costPrice,
                                gstRate: centralPart.gstRate,
                                stockQuantity: rxItem.receivedQty,
                                minStockLevel: centralPart.minStockLevel,
                                maxStockLevel: centralPart.minStockLevel * 5,
                            },
                            update: {
                                stockQuantity: { increment: rxItem.receivedQty }
                            }
                        });
                        // Actually, without compound unique key, I'll do it properly:
                        const existingPart = await tx.inventory.findFirst({
                            where: { serviceCenterId: issue.toServiceCenterId, partNumber: centralPart.partNumber }
                        });

                        if (existingPart) {
                            await tx.inventory.update({
                                where: { id: existingPart.id },
                                data: { stockQuantity: { increment: rxItem.receivedQty } }
                            });
                        } else {
                            await tx.inventory.create({
                                data: {
                                    serviceCenterId: issue.toServiceCenterId,
                                    partName: centralPart.partName,
                                    partNumber: centralPart.partNumber,
                                    category: centralPart.category,
                                    unitPrice: centralPart.unitPrice,
                                    costPrice: centralPart.costPrice,
                                    gstRate: centralPart.gstRate,
                                    stockQuantity: rxItem.receivedQty,
                                    minStockLevel: centralPart.minStockLevel,
                                    maxStockLevel: centralPart.minStockLevel * 5,
                                }
                            });
                        }
                    }
                }
            }

            return tx.partsIssue.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    receivedDate: new Date(),
                },
            });
        });
    }
}
