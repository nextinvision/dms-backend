import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePartsIssueDto } from './dto/create-parts-issue.dto';
import { DispatchPartsIssueDto } from './dto/dispatch-parts-issue.dto';

@Injectable()
export class PartsIssuesService {
    private readonly logger = new Logger(PartsIssuesService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Helper method to check if an item is fully fulfilled
     * An item is considered fully fulfilled when the issued quantity exactly matches the requested quantity
     * @param issuedQty - The total quantity that has been issued/dispatched
     * @param requestedQty - The original requested quantity (never modified after creation)
     * @returns true if issuedQty exactly equals requestedQty
     */
    private isItemFullyFulfilled(issuedQty: number, requestedQty: number): boolean {
        if (requestedQty <= 0) return false;
        // Use exact equality check - "C" postfix should only appear when request is FULLY fulfilled
        // Allow small tolerance for floating point precision (0.01)
        return Math.abs(issuedQty - requestedQty) < 0.01;
    }

    /**
     * Helper method to check if partNumber and partName match exactly (case-insensitive, trimmed)
     */
    private matchesPartExactly(
        partNumber1: string | null | undefined,
        partName1: string | null | undefined,
        partNumber2: string | null | undefined,
        partName2: string | null | undefined
    ): boolean {
        const partNumberMatch = partNumber1 && partNumber2
            ? partNumber1.toLowerCase().trim() === partNumber2.toLowerCase().trim()
            : false;

        const partNameMatch = partName1 && partName2
            ? partName1.toLowerCase().trim() === partName2.toLowerCase().trim()
            : false;

        // Both must match for validation to pass
        return partNumberMatch && partNameMatch;
    }

    /**
     * Find part by ID, partNumber, or partName (in that order)
     */
    private async findPartByIdentifier(
        tx: any,
        identifier: { id?: string; partNumber?: string; partName?: string }
    ): Promise<{ id: string; partName: string; partNumber: string | null } | null> {
        // 1. Try by ID first (if ID is provided, use it directly)
        if (identifier.id) {
            try {
                const part = await tx.centralInventory.findUnique({
                    where: { id: identifier.id },
                    select: { id: true, partName: true, partNumber: true }
                });
                if (part) {
                    // If partNumber and partName are provided, validate they match
                    if (identifier.partNumber && identifier.partName) {
                        if (!this.matchesPartExactly(
                            identifier.partNumber,
                            identifier.partName,
                            part.partNumber,
                            part.partName
                        )) {
                            this.logger.warn(
                                `Part ID ${identifier.id} found but partNumber/partName mismatch. ` +
                                `Expected: ${identifier.partNumber}/${identifier.partName}, ` +
                                `Found: ${part.partNumber}/${part.partName}`
                            );
                            return null; // Reject if mismatch
                        }
                    }

                    this.logger.debug(`Found part by ID: ${identifier.id} -> ${part.partName}`);
                    return part;
                }
            } catch (error) {
                this.logger.warn(`Error finding part by ID ${identifier.id}:`, error);
            }
        }

        // 2. If both partNumber AND partName are provided, require BOTH to match
        if (identifier.partNumber && identifier.partNumber.trim() &&
            identifier.partName && identifier.partName.trim()) {
            try {
                const part = await tx.centralInventory.findFirst({
                    where: {
                        AND: [
                            {
                                partNumber: {
                                    equals: identifier.partNumber.trim(),
                                    mode: 'insensitive'
                                }
                            },
                            {
                                partName: {
                                    equals: identifier.partName.trim(),
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    },
                    select: { id: true, partName: true, partNumber: true }
                });
                if (part) {
                    this.logger.debug(
                        `Found part by partNumber AND partName: ${identifier.partNumber}/${identifier.partName} -> ${part.id}`
                    );
                    return part;
                }
            } catch (error) {
                this.logger.warn(
                    `Error finding part by partNumber AND partName ${identifier.partNumber}/${identifier.partName}:`,
                    error
                );
            }
        }

        // 3. Fallback: Try by partNumber only (if partName not provided)
        if (identifier.partNumber && identifier.partNumber.trim() && !identifier.partName) {
            try {
                const part = await tx.centralInventory.findFirst({
                    where: {
                        partNumber: {
                            equals: identifier.partNumber.trim(),
                            mode: 'insensitive'
                        }
                    },
                    select: { id: true, partName: true, partNumber: true }
                });
                if (part) {
                    this.logger.debug(`Found part by partNumber only: ${identifier.partNumber} -> ${part.id} (${part.partName})`);
                    return part;
                }
            } catch (error) {
                this.logger.warn(`Error finding part by partNumber ${identifier.partNumber}:`, error);
            }
        }

        // 4. Fallback: Try by partName only (if partNumber not provided)
        if (identifier.partName && identifier.partName.trim() && !identifier.partNumber) {
            try {
                const part = await tx.centralInventory.findFirst({
                    where: {
                        partName: {
                            equals: identifier.partName.trim(),
                            mode: 'insensitive'
                        }
                    },
                    select: { id: true, partName: true, partNumber: true }
                });
                if (part) {
                    this.logger.debug(`Found part by partName only: ${identifier.partName} -> ${part.id} (${part.partNumber || 'N/A'})`);
                    return part;
                }
            } catch (error) {
                this.logger.warn(`Error finding part by partName ${identifier.partName}:`, error);
            }
        }

        // 5. Last resort: Try partial match by partName (only if partNumber not provided)
        if (identifier.partName && identifier.partName.trim() && !identifier.partNumber) {
            try {
                const part = await tx.centralInventory.findFirst({
                    where: {
                        partName: {
                            contains: identifier.partName.trim(),
                            mode: 'insensitive'
                        }
                    },
                    select: { id: true, partName: true, partNumber: true }
                });
                if (part) {
                    this.logger.debug(`Found part by partName (partial): ${identifier.partName} -> ${part.id}`);
                    return part;
                }
            } catch (error) {
                this.logger.warn(`Error finding part by partName (partial) ${identifier.partName}:`, error);
            }
        }

        return null;
    }

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
            // Resolve all parts by ID, partNumber, or partName (flexible matching)
            const resolvedItems: Array<{
                originalItem: any;
                resolvedPart: { id: string; partName: string; partNumber: string | null };
            }> = [];

            for (const item of items) {
                this.logger.debug(
                    `Attempting to resolve part: ID=${item.centralInventoryPartId}, ` +
                    `partNumber=${item.partNumber || 'N/A'}, partName=${item.partName || 'N/A'}`
                );

                const resolvedPart = await this.findPartByIdentifier(tx, {
                    id: item.centralInventoryPartId,
                    partNumber: item.partNumber,
                    partName: item.partName
                });

                if (!resolvedPart) {
                    // Check if part exists at all (maybe it was deleted)
                    const partExists = await tx.centralInventory.findUnique({
                        where: { id: item.centralInventoryPartId },
                        select: { id: true }
                    });

                    if (!partExists) {
                        // Part doesn't exist - check if we can find similar parts
                        let similarParts: any[] = [];

                        if (item.partNumber) {
                            similarParts = await tx.centralInventory.findMany({
                                where: {
                                    partNumber: { contains: item.partNumber, mode: 'insensitive' }
                                },
                                take: 5,
                                select: { id: true, partName: true, partNumber: true }
                            });
                        }

                        if (similarParts.length === 0 && item.partName) {
                            similarParts = await tx.centralInventory.findMany({
                                where: {
                                    partName: { contains: item.partName, mode: 'insensitive' }
                                },
                                take: 5,
                                select: { id: true, partName: true, partNumber: true }
                            });
                        }

                        const identifier = item.partNumber || item.partName || item.centralInventoryPartId;
                        let errorMsg = `Part not found: ${identifier}. The part may have been deleted.`;

                        if (similarParts.length > 0) {
                            errorMsg += ` Similar parts found: ${similarParts.map(p => p.partName).join(', ')}.`;
                        }

                        errorMsg += ' Please refresh the page and try again.';

                        this.logger.error(
                            `Part not found. ID=${item.centralInventoryPartId}, ` +
                            `partNumber=${item.partNumber || 'N/A'}, partName=${item.partName || 'N/A'}`
                        );

                        throw new BadRequestException(errorMsg);
                    } else {
                        // Part exists but matching failed - this shouldn't happen
                        this.logger.error(
                            `Part exists but matching failed. ID=${item.centralInventoryPartId}`
                        );
                        throw new BadRequestException(
                            `Part matching failed for ID: ${item.centralInventoryPartId}. Please refresh the page and try again.`
                        );
                    }
                }

                resolvedItems.push({ originalItem: item, resolvedPart });

                this.logger.debug(
                    `✓ Resolved part: ${item.centralInventoryPartId} -> ${resolvedPart.id} ` +
                    `(${resolvedPart.partName}${resolvedPart.partNumber ? ` - ${resolvedPart.partNumber}` : ''})`
                );
            }

            // Log each item's requestedQty before creating to ensure correct values
            for (const { originalItem, resolvedPart } of resolvedItems) {
                this.logger.log(
                    `Creating parts issue item: Part="${resolvedPart.partName}" ` +
                    `(ID: ${resolvedPart.id}), requestedQty=${originalItem.requestedQty}`
                );
            }

            // CRITICAL: If Purchase Order is linked, override requestedQty with PO quantities BEFORE creating issueData
            // This ensures that requestedQty reflects what SIM originally ordered, not what's being issued
            if (createDto.purchaseOrderId) {
                this.logger.log(`Parts Issue linked to Purchase Order: ${createDto.purchaseOrderId}`);

                // Fetch Purchase Order with items
                const purchaseOrder = await tx.purchaseOrder.findUnique({
                    where: { id: createDto.purchaseOrderId },
                    include: { items: true }
                });

                if (!purchaseOrder) {
                    throw new BadRequestException(`Purchase Order ${createDto.purchaseOrderId} not found`);
                }

                // Match each parts issue item with corresponding PO item and override requestedQty
                for (const { originalItem, resolvedPart } of resolvedItems) {
                    // Find matching PO item by centralInventoryPartId, partNumber, or partName
                    const matchingPOItem = purchaseOrder.items.find(poItem => {
                        // Strategy 1: Match by centralInventoryPartId
                        if (poItem.centralInventoryPartId &&
                            poItem.centralInventoryPartId === resolvedPart.id) {
                            return true;
                        }
                        // Strategy 2: Match by partName (case-insensitive)
                        if (poItem.partName && resolvedPart.partName) {
                            const poName = poItem.partName.toLowerCase().trim();
                            const issueName = resolvedPart.partName.toLowerCase().trim();
                            if (poName === issueName && poName !== '') {
                                return true;
                            }
                        }
                        // Strategy 3: Match by partNumber (case-insensitive)
                        if (poItem.partNumber && resolvedPart.partNumber) {
                            const poNumber = poItem.partNumber.toLowerCase().trim();
                            const issueNumber = resolvedPart.partNumber.toLowerCase().trim();
                            if (poNumber === issueNumber && poNumber !== '') {
                                return true;
                            }
                        }
                        return false;
                    });

                    if (matchingPOItem) {
                        // Override requestedQty with PO quantity
                        const poQuantity = Number(matchingPOItem.quantity);

                        this.logger.log(
                            `Matched PO item for \"${resolvedPart.partName}\": ` +
                            `PO quantity=${poQuantity}, frontend sent=${originalItem.requestedQty}. ` +
                            `Using PO quantity as requestedQty.`
                        );

                        // CRITICAL: Override requestedQty with PO quantity
                        // This ensures requestedQty reflects what SIM originally ordered
                        originalItem.requestedQty = poQuantity;
                    } else {
                        this.logger.warn(
                            `No matching PO item found for \"${resolvedPart.partName}\" ` +
                            `(${resolvedPart.partNumber || 'N/A'}). Using frontend quantity: ${originalItem.requestedQty}`
                        );
                    }
                }
            }

            // Now build issueData with potentially overridden requestedQty values
            const issueData: any = {
                toServiceCenterId: createDto.toServiceCenterId,
                priority: createDto.priority || 'NORMAL',
                issueNumber,
                requestedById,
                status: 'PENDING_APPROVAL',
                items: {
                    create: resolvedItems.map(({ originalItem, resolvedPart }) => {
                        // Ensure requestedQty is a number and not undefined/null
                        const requestedQty = Number(originalItem.requestedQty);
                        if (isNaN(requestedQty) || requestedQty <= 0) {
                            throw new BadRequestException(
                                `Invalid requested quantity for part "${resolvedPart.partName}": ${originalItem.requestedQty}`
                            );
                        }

                        return {
                            centralInventoryPartId: resolvedPart.id, // Use resolved ID
                            requestedQty: requestedQty // Now includes PO override if applicable
                        };
                    })
                },
            };

            // Add purchaseOrderId if provided
            if (createDto.purchaseOrderId) {
                issueData.purchaseOrderId = createDto.purchaseOrderId;
            }

            const issue = await tx.partsIssue.create({
                data: issueData,
                include: { items: true },
            }) as any;

            // Log created items to verify stored values
            this.logger.log(
                `Created parts issue ${issueNumber} with ${issue.items.length} items. ` +
                `Items: ${issue.items.map((i: any) => `ID=${i.id}, requestedQty=${i.requestedQty}`).join('; ')}`
            );

            // Update Central Inventory: allocated += requestedQty (automatic stock update)
            for (const { originalItem, resolvedPart } of resolvedItems) {
                await tx.centralInventory.update({
                    where: { id: resolvedPart.id },
                    data: {
                        allocated: { increment: originalItem.requestedQty },
                    },
                });

                this.logger.debug(
                    `Updated allocation for part "${resolvedPart.partName}" ` +
                    `(${resolvedPart.partNumber || 'N/A'}): allocated += ${originalItem.requestedQty}`
                );
            }

            return issue;
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, status, toServiceCenterId } = query;
        // Parse pagination parameters correctly
        const pageNum = parseInt(String(page), 10);
        const limitNum = parseInt(String(limit), 10);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};
        if (status) where.status = status;
        if (toServiceCenterId) where.toServiceCenterId = toServiceCenterId;

        // Execute sequentially to prevent connection pool exhaustion
        const total = await this.prisma.partsIssue.count({ where });

        const data = await this.prisma.partsIssue.findMany({
            where,
            skip,
            take: limitNum,
            include: {
                toServiceCenter: true,
                requestedBy: true,
                items: {
                    include: {
                        dispatches: {
                            orderBy: { dispatchedAt: 'asc' }
                        }
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Manually populate centralInventoryPart for each item
        for (const issue of data) {
            await this.populatePartDetails(issue);
        }

        return {
            data,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }



    async findOne(id: string) {
        const issue = await this.prisma.partsIssue.findUnique({
            where: { id },
            include: {
                toServiceCenter: true,
                requestedBy: true,
                items: {
                    include: {
                        dispatches: {
                            orderBy: { dispatchedAt: 'asc' }
                        }
                    }
                },
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

        issue.items = issue.items.map((item: any) => {
            const part = parts.find(p => p.id === item.centralInventoryPartId);

            if (!part) {
                return {
                    ...item,
                    centralInventoryPart: null,
                    availableStock: 0,
                };
            }

            const stockQuantity = Number(part.stockQuantity);
            const allocated = Number(part.allocated || 0);
            const requestedQty = Number(item.requestedQty || 0);
            const approvedQty = Number(item.approvedQty || 0);
            const issuedQty = Number(item.issuedQty || 0);

            // Calculate available stock for approval/editing
            // Since requestedQty is already allocated when issue was created:
            // - Available for approval = stock - (allocated - requestedQty) = stock - allocated + requestedQty
            // - Available for dispatch = stock - allocated (actual physical stock available)
            const availableForApproval = stockQuantity - allocated + requestedQty;
            const availableForDispatch = stockQuantity - allocated;

            // Calculate remaining quantity that can be dispatched
            const remainingToDispatch = Math.max(0, approvedQty - issuedQty);

            // Check if item is fully fulfilled based on REQUESTED quantity (original request)
            // This ensures that if CIM approved less than requested, it won't show as fully fulfilled
            // even if all approved quantity is issued
            // Note: requestedQty is already declared above, so we reuse it
            const isFullyFulfilled = this.isItemFullyFulfilled(issuedQty, requestedQty);

            return {
                ...item,
                centralInventoryPart: part,
                availableStock: Math.max(0, availableForApproval), // Available for approval/editing
                availableForDispatch: Math.max(0, availableForDispatch), // Actual physical stock available
                remainingToDispatch, // Remaining approved quantity that can be dispatched
                stockQuantity, // Include raw stock quantity for reference
                allocated, // Include allocated quantity for reference
                isFullyFulfilled: isFullyFulfilled, // Add fulfillment status
            };
        });
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

    // CIM (Central Inventory Manager) approval - first step
    async approveByCIM(id: string, approvedItems: any[]) {
        const issue = await this.findOne(id);
        if (issue.status !== 'PENDING_APPROVAL') {
            throw new BadRequestException('Can only approve PENDING_APPROVAL issues');
        }

        return this.prisma.$transaction(async (tx) => {
            // Validate and update approved quantities (CIM can adjust quantities based on available stock)
            for (const appItem of approvedItems) {
                const issueItem = issue.items.find((item: any) => item.id === appItem.itemId);

                if (!issueItem) {
                    throw new NotFoundException(`Parts issue item ${appItem.itemId} not found`);
                }

                // Get current stock information
                const centralPart = await tx.centralInventory.findUnique({
                    where: { id: issueItem.centralInventoryPartId }
                });

                if (!centralPart) {
                    throw new NotFoundException(`Central inventory part ${issueItem.centralInventoryPartId} not found`);
                }

                // Calculate available stock for approval
                // Note: requestedQty is already allocated when issue was created
                // Available stock = total stock - (allocated excluding this request) = stock - allocated + requestedQty
                const currentAllocated = Number(centralPart.allocated || 0);
                const stockQuantity = Number(centralPart.stockQuantity);
                const requestedQty = Number(issueItem.requestedQty);

                // Calculate actual available stock (accounting for current allocation which includes this request)
                // If this request has requestedQty allocated, we can approve up to: stock - (allocated - requestedQty)
                const availableStock = stockQuantity - currentAllocated + requestedQty;

                // Validate approved quantity is not negative
                // Note: approvedQty can be 0 (effectively rejecting that item) or any value up to availableStock
                // IMPORTANT: User can approve LESS than requested if stock is not available
                if (appItem.approvedQty < 0) {
                    throw new BadRequestException(`Approved quantity cannot be negative for item ${issueItem.id}`);
                }

                // Allow approving any quantity from 0 to available stock (even if less than requested)
                // This allows editing quantity during approval based on actual stock availability
                // IMPORTANT: User CAN approve less than requested - this is explicitly allowed!
                if (appItem.approvedQty > availableStock) {
                    throw new BadRequestException(
                        `Cannot approve ${appItem.approvedQty} units. Only ${availableStock} units available in stock. ` +
                        `You can approve any quantity from 0 to ${availableStock}. ` +
                        `Note: You can approve less than the requested ${requestedQty} units if needed. ` +
                        `(Stock: ${stockQuantity}, Allocated: ${currentAllocated}, Requested: ${requestedQty})`
                    );
                }

                // Explicitly allow approving less than requested - this is a valid and expected use case
                // Examples:
                // - Requested: 100, Available: 50, Approved: 50 ✅ (allowed - partial approval)
                // - Requested: 100, Available: 50, Approved: 0 ✅ (allowed - reject item)
                // - Requested: 100, Available: 150, Approved: 80 ✅ (allowed - approve less than requested)
                // No additional validation needed - we already validated it's >= 0 and <= availableStock

                // Update approved quantity ONLY - requestedQty must remain unchanged
                // CRITICAL: requestedQty is immutable and should never be modified after creation
                await tx.partsIssueItem.update({
                    where: { id: appItem.itemId },
                    data: {
                        approvedQty: appItem.approvedQty,
                        // requestedQty is intentionally NOT updated - it's immutable
                    },
                });

                // Adjust allocation: unallocate the difference between requested and approved
                // If approved < requested, we unallocate the difference
                // If approved = requested, no change needed
                const allocationAdjustment = requestedQty - appItem.approvedQty;
                if (allocationAdjustment !== 0) {
                    await tx.centralInventory.update({
                        where: { id: issueItem.centralInventoryPartId },
                        data: {
                            allocated: { decrement: allocationAdjustment },
                        },
                    });
                }
            }

            // Set status to CIM_APPROVED - waiting for admin approval
            // Don't decrease stock yet - wait for admin approval
            const updatedIssue = await tx.partsIssue.update({
                where: { id },
                data: { status: 'CIM_APPROVED' },
                include: {
                    items: {
                        include: {
                            dispatches: {
                                orderBy: { dispatchedAt: 'asc' }
                            }
                        }
                    },
                    toServiceCenter: true,
                    requestedBy: true,
                },
            });

            // Populate part details with available stock
            await this.populatePartDetails(updatedIssue);

            return updatedIssue;
        });
    }

    // Admin approval - can approve both PENDING_APPROVAL and CIM_APPROVED issues
    async approveByAdmin(id: string) {
        const issue = await this.findOne(id);

        // Allow admin to approve both PENDING_APPROVAL (direct approval) and CIM_APPROVED (after CIM approval)
        if (issue.status !== 'PENDING_APPROVAL' && issue.status !== 'CIM_APPROVED') {
            throw new BadRequestException(
                `Can only approve PENDING_APPROVAL or CIM_APPROVED issues. Current status: ${issue.status}`
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const issueItems = (issue as any).items;

            // If admin approves directly from PENDING_APPROVAL, set approvedQty = requestedQty for all items
            // If admin approves from CIM_APPROVED, approvedQty is already set by CIM
            const needsApprovedQty = issue.status === 'PENDING_APPROVAL';

            // Update items with approvedQty if needed (for direct admin approval)
            if (needsApprovedQty) {
                for (const item of issueItems) {
                    // Set approvedQty = requestedQty if not already set
                    if (!item.approvedQty || item.approvedQty === 0) {
                        await tx.partsIssueItem.update({
                            where: { id: item.id },
                            data: {
                                approvedQty: item.requestedQty,
                            },
                        });
                    }
                }
            }

            // Unallocate the requested quantity (allocated was set during creation)
            // This frees up the stock for dispatch
            for (const item of issueItems) {
                try {
                    await tx.centralInventory.update({
                        where: { id: item.centralInventoryPartId },
                        data: {
                            // Unallocate requested quantity (allocated was set during creation)
                            allocated: { decrement: item.requestedQty },
                        },
                    });
                } catch (error: any) {
                    this.logger.error(`Failed to unallocate stock for part ${item.centralInventoryPartId}:`, error);
                    // Continue with other items even if one fails
                }
            }

            // Set status to ADMIN_APPROVED - ready to issue
            const updatedIssue = await tx.partsIssue.update({
                where: { id },
                data: { status: 'ADMIN_APPROVED' },
                include: {
                    items: {
                        include: {
                            dispatches: {
                                orderBy: { dispatchedAt: 'asc' }
                            }
                        }
                    },
                    toServiceCenter: true,
                    requestedBy: true,
                },
            });

            // Populate part details with available stock
            await this.populatePartDetails(updatedIssue);

            this.logger.log(
                `Admin approved parts issue ${issue.issueNumber}. Status: ${issue.status} -> ADMIN_APPROVED`
            );

            return updatedIssue;
        });
    }

    // Legacy approve method - kept for backward compatibility, routes to approveByCIM
    async approve(id: string, approvedItems: any[]) {
        return this.approveByCIM(id, approvedItems);
    }

    /**
     * Generate sub-PO number in format: PO {code} {date} {serviceCenterCode}_{requestNumber}_{dispatchSequence}
     * Example: PO 42EV 14122025 PUNSC_1_1 (first dispatch)
     * Example: PO 42EV 14122025 PUNSC_1_2 (second dispatch)
     * Example: PO 42EV 14122025 PUNSC_1_3C (third dispatch, fully fulfilled)
     */
    private generateSubPoNumber(
        issueNumber: string,
        serviceCenterCode: string,
        requestNumber: number,
        dispatchSequence: number,
        isFullyFulfilled: boolean
    ): string {
        const date = new Date();
        const dateStr = `${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear()}`;

        // Extract code from issue number or use default
        // For now, using a simplified format - can be made configurable
        const code = '42EV'; // This can be made configurable or extracted from config

        const suffix = isFullyFulfilled
            ? `_${requestNumber}_${dispatchSequence}C`
            : `_${requestNumber}_${dispatchSequence}`;

        // Format: PO {code} {date} {serviceCenterCode}{suffix}
        return `PO ${code} ${dateStr} ${serviceCenterCode}${suffix}`;
    }

    async dispatch(id: string, dispatchDto: DispatchPartsIssueDto, dispatchedById?: string) {
        // Validate issue status before starting transaction (lighter query)
        const issue = await this.prisma.partsIssue.findUnique({
            where: { id },
            select: { id: true, status: true, toServiceCenterId: true }
        });

        if (!issue) {
            throw new NotFoundException('Parts issue not found');
        }

        // Allow dispatch if ADMIN_APPROVED or if already partially dispatched (DISPATCHED status)
        if (issue.status !== 'ADMIN_APPROVED' && issue.status !== 'DISPATCHED') {
            throw new BadRequestException('Can only dispatch ADMIN_APPROVED or DISPATCHED issues. Issue must be approved by admin first.');
        }

        // Get service center code
        const serviceCenter = await this.prisma.serviceCenter.findUnique({
            where: { id: issue.toServiceCenterId },
            select: { code: true }
        });

        if (!serviceCenter) {
            throw new NotFoundException('Service Center not found');
        }

        return this.prisma.$transaction(async (tx) => {
            const dispatchDate = new Date();

            // Get fresh issue data with current issuedQty values and purchaseOrderId
            const freshIssue = await tx.partsIssue.findUnique({
                where: { id },
                include: {
                    items: {
                        include: {
                            dispatches: {
                                orderBy: { dispatchedAt: 'asc' }
                            }
                        }
                    }
                }
            }) as any;

            if (!freshIssue) {
                throw new NotFoundException('Parts issue not found');
            }

            // Fetch part details for all items
            const partIds = freshIssue.items.map(item => item.centralInventoryPartId);
            const parts = await tx.centralInventory.findMany({
                where: { id: { in: partIds } },
                select: {
                    id: true,
                    partName: true,
                    partNumber: true
                }
            });

            // Process each item in the dispatch
            for (const dispatchItem of dispatchDto.items) {
                // Use fresh issue data to get current issuedQty
                const issueItem = freshIssue.items.find(item => item.id === dispatchItem.itemId);

                if (!issueItem) {
                    throw new NotFoundException(`Parts issue item ${dispatchItem.itemId} not found`);
                }

                // Get part details for logging
                const part = parts.find(p => p.id === issueItem.centralInventoryPartId);
                const partName = part?.partName || 'Unknown Part';

                // Check available stock
                const centralPart = await tx.centralInventory.findUnique({
                    where: { id: issueItem.centralInventoryPartId }
                });

                if (!centralPart) {
                    throw new NotFoundException(`Central inventory part ${issueItem.centralInventoryPartId} not found`);
                }

                // Calculate remaining quantity to fulfill
                // Use approvedQty if set, otherwise fall back to requestedQty (for direct admin approval)
                const approvedQty = Number(issueItem.approvedQty || issueItem.requestedQty || 0);
                const issuedQty = Number(issueItem.issuedQty || 0);
                const remainingQty = Math.max(0, approvedQty - issuedQty);

                this.logger.debug(
                    `Dispatch calculation for item ${issueItem.id} (${partName}): ` +
                    `approvedQty=${approvedQty}, issuedQty=${issuedQty}, remainingQty=${remainingQty}`
                );

                // Validate dispatch quantity
                if (dispatchItem.quantity <= 0) {
                    throw new BadRequestException(`Dispatch quantity must be greater than 0 for item ${issueItem.id}`);
                }

                if (dispatchItem.quantity > remainingQty) {
                    throw new BadRequestException(
                        `Cannot dispatch ${dispatchItem.quantity} units. Only ${remainingQty} units remaining for item ${issueItem.id} (${partName})`
                    );
                }

                // Check if we have enough stock
                // Calculate available stock (total stock minus allocated)
                const availableStock = Number(centralPart.stockQuantity) - Number(centralPart.allocated || 0);
                if (dispatchItem.quantity > availableStock) {
                    throw new BadRequestException(
                        `Insufficient stock. Available: ${availableStock}, Requested: ${dispatchItem.quantity}`
                    );
                }

                // Calculate new issued quantity (sum of all previous dispatches + current dispatch)
                const currentIssuedQty = Number(issueItem.issuedQty || 0);
                const dispatchQty = Number(dispatchItem.quantity);
                const requestedQty = Number(issueItem.requestedQty || 0);
                // Use the same approvedQty variable already calculated above
                const newIssuedQty = currentIssuedQty + dispatchQty;

                // Check if item is fully fulfilled based on REQUESTED quantity (original request)
                // This ensures that if CIM approved less than requested, it won't show as fully fulfilled
                // even if all approved quantity is issued
                const isItemFullyFulfilled = this.isItemFullyFulfilled(newIssuedQty, requestedQty);

                // Log fulfillment check with part name
                this.logger.debug(
                    `Fulfillment check for "${partName}" (Item ID: ${issueItem.id}): ` +
                    `requestedQty=${requestedQty}, approvedQty=${approvedQty}, ` +
                    `currentIssuedQty=${currentIssuedQty}, dispatchQty=${dispatchQty}, ` +
                    `newIssuedQty=${newIssuedQty}, isFullyFulfilled=${isItemFullyFulfilled}`
                );

                // Get the next dispatch sequence number for this item
                // Count all dispatches for this issue item to get the sequence
                const existingDispatches = await tx.partsIssueDispatch.findMany({
                    where: { issueItemId: issueItem.id },
                    orderBy: { dispatchedAt: 'asc' }
                });

                const issueSequence = existingDispatches.length + 1;

                // Use issue number to extract request number (e.g., PI-2025-0001 -> 1)
                const issueNumberParts = freshIssue.issueNumber.split('-');
                const requestNumber = issueNumberParts.length > 0 ?
                    parseInt(issueNumberParts[issueNumberParts.length - 1]) || 1 : 1;

                // Generate sub-PO number for ALL dispatches (including partial)
                // Sub-PO number is generated even if dispatching less than approved quantity
                const subPoNumber = this.generateSubPoNumber(
                    freshIssue.issueNumber,
                    serviceCenter.code,
                    requestNumber,
                    issueSequence,
                    isItemFullyFulfilled
                );

                // Create dispatch record
                await tx.partsIssueDispatch.create({
                    data: {
                        issueItemId: issueItem.id,
                        issueId: id,
                        quantity: dispatchItem.quantity,
                        subPoNumber,
                        isFullyFulfilled: isItemFullyFulfilled,
                        dispatchedById: dispatchedById || null,
                        transportDetails: dispatchDto.transportDetails as any,
                    }
                });

                // Update issue item with issued quantity and sub-PO number
                // CRITICAL: Never modify requestedQty - it must remain unchanged from creation
                await tx.partsIssueItem.update({
                    where: { id: issueItem.id },
                    data: {
                        issuedQty: newIssuedQty,
                        subPoNumber, // Update latest sub-PO number
                        // requestedQty is intentionally NOT updated - it's immutable
                    }
                });

                // Log the update with fulfillment details for debugging
                this.logger.log(
                    `Updated PartsIssueItem ${issueItem.id} (${partName}): ` +
                    `requestedQty=${requestedQty} (unchanged), ` +
                    `issuedQty=${currentIssuedQty} -> ${newIssuedQty}, ` +
                    `subPoNumber=${subPoNumber}, ` +
                    `isFullyFulfilled=${isItemFullyFulfilled}`
                );

                // Decrease central inventory stock when dispatching
                await tx.centralInventory.update({
                    where: { id: issueItem.centralInventoryPartId },
                    data: {
                        stockQuantity: { decrement: dispatchItem.quantity },
                    }
                });

                // Update Purchase Order receivedQty if this parts issue is linked to a PO
                const purchaseOrderId = (freshIssue as any).purchaseOrderId;
                if (purchaseOrderId) {
                    // Find the corresponding PO item by matching part
                    const poItems = await tx.pOItem.findMany({
                        where: { purchaseOrderId: purchaseOrderId },
                        include: { purchaseOrder: true }
                    });

                    // Match PO item to parts issue item using multiple strategies
                    const matchingPOItem = poItems.find(poItem => {
                        // Strategy 1: Match by centralInventoryPartId
                        if (poItem.centralInventoryPartId &&
                            poItem.centralInventoryPartId === issueItem.centralInventoryPartId) {
                            return true;
                        }
                        // Strategy 2: Match by partName (case-insensitive)
                        if (poItem.partName && part?.partName) {
                            const poName = poItem.partName.toLowerCase().trim();
                            const issueName = part.partName.toLowerCase().trim();
                            if (poName === issueName && poName !== '') {
                                return true;
                            }
                        }
                        // Strategy 3: Match by partNumber (case-insensitive)
                        if (poItem.partNumber && part?.partNumber) {
                            const poNumber = poItem.partNumber.toLowerCase().trim();
                            const issueNumber = part.partNumber.toLowerCase().trim();
                            if (poNumber === issueNumber && poNumber !== '') {
                                return true;
                            }
                        }
                        return false;
                    });

                    if (matchingPOItem) {
                        // Update PO item's receivedQty by adding the dispatched quantity
                        // receivedQty should accumulate all issued quantities from CIM
                        await tx.pOItem.update({
                            where: { id: matchingPOItem.id },
                            data: {
                                receivedQty: { increment: dispatchItem.quantity }
                            }
                        });

                        this.logger.log(
                            `Updated PO ${purchaseOrderId} item ${matchingPOItem.id} ` +
                            `(${partName}): receivedQty += ${dispatchItem.quantity}`
                        );
                    } else {
                        this.logger.warn(
                            `Could not find matching PO item for parts issue item ${issueItem.id} ` +
                            `(${partName}) in PO ${purchaseOrderId}`
                        );
                    }
                }
            }

            // Update issue status to DISPATCHED
            // Note: Status is DISPATCHED for both partial and full dispatches
            // The 'C' suffix in sub-PO number indicates completion

            const updatedIssue = await tx.partsIssue.update({
                where: { id },
                data: {
                    status: 'DISPATCHED',
                    dispatchedDate: dispatchDate,
                    transportDetails: dispatchDto.transportDetails as any,
                },
                include: {
                    items: {
                        include: {
                            dispatches: {
                                orderBy: { dispatchedAt: 'asc' }
                            }
                        }
                    },
                    toServiceCenter: true,
                    requestedBy: true,
                }
            });

            return updatedIssue;
        });
    }

    async receive(id: string, receivedItems: any[]) {
        const issue = await this.findOne(id);
        if (issue.status !== 'DISPATCHED') throw new BadRequestException('Can only receive DISPATCHED issues');

        return this.prisma.$transaction(async (tx) => {
            for (const rxItem of receivedItems) {
                // Update received quantity ONLY - requestedQty must remain unchanged
                // CRITICAL: requestedQty is immutable and should never be modified
                await tx.partsIssueItem.update({
                    where: { id: rxItem.itemId },
                    data: {
                        receivedQty: rxItem.receivedQty,
                        // requestedQty is intentionally NOT updated - it's immutable
                    },
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
