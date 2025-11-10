import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ========== PARTS MANAGEMENT ==========

  async createPart(createDto: CreatePartDto, createdBy: string) {
    // Check if SKU already exists
    const existing = await this.prisma.part.findUnique({
      where: { sku: createDto.sku },
    });

    if (existing) {
      throw new ConflictException('Part with this SKU already exists');
    }

    const part = await this.prisma.part.create({
      data: {
        ...createDto,
        reorderLevel: createDto.reorderLevel || 0,
      },
    });

    await this.logAudit(
      createdBy,
      'CREATE',
      'Part',
      part.id,
      `Created part: ${part.name} (${part.sku})`,
    );

    return part;
  }

  async findAllParts(filters?: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PartWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.part.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.part.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePart(id: string) {
    const part = await this.prisma.part.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    return part;
  }

  async updatePart(id: string, updateDto: UpdatePartDto, updatedBy: string) {
    const existing = await this.prisma.part.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Part not found');
    }

    // Check SKU uniqueness if updating
    if (updateDto.sku && updateDto.sku !== existing.sku) {
      const skuExists = await this.prisma.part.findUnique({
        where: { sku: updateDto.sku },
      });

      if (skuExists) {
        throw new ConflictException('Part with this SKU already exists');
      }
    }

    const part = await this.prisma.part.update({
      where: { id },
      data: updateDto,
    });

    await this.logAudit(
      updatedBy,
      'UPDATE',
      'Part',
      id,
      `Updated part: ${part.name}`,
    );

    return part;
  }

  async deletePart(id: string, deletedBy: string) {
    const part = await this.prisma.part.findUnique({
      where: { id },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    // Check if part is used in inventory
    const inventoryCount = await this.prisma.inventory.count({
      where: { partId: id },
    });

    if (inventoryCount > 0) {
      throw new BadRequestException(
        'Cannot delete part that exists in inventory',
      );
    }

    await this.prisma.part.delete({
      where: { id },
    });

    await this.logAudit(
      deletedBy,
      'DELETE',
      'Part',
      id,
      `Deleted part: ${part.name}`,
    );

    return { message: 'Part deleted successfully' };
  }

  // ========== CENTRAL STOCK MANAGEMENT ==========

  async getCentralStock(filters?: {
    partId?: string;
    partName?: string;
    lowStock?: boolean;
    serviceCenterId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {};

    if (filters?.partId) {
      where.partId = filters.partId;
    }

    if (filters?.serviceCenterId) {
      where.serviceCenterId = filters.serviceCenterId;
    }

    // Search by part name
    if (filters?.partName) {
      where.part = {
        OR: [
          { name: { contains: filters.partName, mode: 'insensitive' } },
          { sku: { contains: filters.partName, mode: 'insensitive' } },
        ],
      };
    }

    // Note: Low stock filtering will be done in memory since Prisma
    // doesn't easily support comparing two fields in where clause

    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        include: {
          part: true,
          serviceCenter: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { quantity: 'asc' },
          { serviceCenter: { name: 'asc' } },
        ],
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Filter low stock in memory if needed
    const filteredData = filters?.lowStock
      ? data.filter((inv) => inv.quantity <= inv.minLevel)
      : data;

    return {
      data: filteredData,
      meta: {
        total: filters?.lowStock ? filteredData.length : total,
        page,
        limit,
        totalPages: Math.ceil(
          (filters?.lowStock ? filteredData.length : total) / limit,
        ),
      },
    };
  }

  async getLowStockAlerts() {
    const inventories = await this.prisma.inventory.findMany({
      include: {
        part: true,
        serviceCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Filter low stock items and sort by quantity (lowest first) to prioritize critical shortages
    const lowStockItems = inventories
      .filter((inv) => inv.quantity <= inv.minLevel)
      .sort((a, b) => a.quantity - b.quantity);

    return lowStockItems;
  }

  // ========== INVENTORY ITEM MANAGEMENT ==========

  async createInventoryItem(createDto: CreateInventoryDto, createdBy: string) {
    // Validate service center exists
    const serviceCenter = await this.prisma.serviceCenter.findUnique({
      where: { id: createDto.serviceCenterId },
    });

    if (!serviceCenter) {
      throw new NotFoundException('Service center not found');
    }

    // Validate part exists
    const part = await this.prisma.part.findUnique({
      where: { id: createDto.partId },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    // Check if inventory already exists
    const existing = await this.prisma.inventory.findUnique({
      where: {
        serviceCenterId_partId: {
          serviceCenterId: createDto.serviceCenterId,
          partId: createDto.partId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Inventory item already exists for this part and service center',
      );
    }

    // Use part's reorderLevel as default minLevel if not provided
    const minLevel = createDto.minLevel ?? part.reorderLevel ?? 0;

    const inventory = await this.prisma.inventory.create({
      data: {
        serviceCenterId: createDto.serviceCenterId,
        partId: createDto.partId,
        quantity: createDto.quantity,
        minLevel,
        maxLevel: createDto.maxLevel,
      },
      include: {
        part: true,
        serviceCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    await this.logAudit(
      createdBy,
      'CREATE',
      'Inventory',
      inventory.id,
      `Created inventory: ${part.name} at ${serviceCenter.name}`,
    );

    return inventory;
  }

  async updateInventoryItem(
    id: string,
    updateDto: UpdateInventoryDto,
    updatedBy: string,
  ) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        part: true,
        serviceCenter: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }

    const updated = await this.prisma.inventory.update({
      where: { id },
      data: updateDto,
      include: {
        part: true,
        serviceCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    await this.logAudit(
      updatedBy,
      'UPDATE',
      'Inventory',
      id,
      `Updated inventory: ${inventory.part.name} at ${inventory.serviceCenter.name}`,
    );

    return updated;
  }

  async updateInventoryByServiceCenterAndPart(
    serviceCenterId: string,
    partId: string,
    updateDto: UpdateInventoryDto,
    updatedBy: string,
  ) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        serviceCenterId_partId: {
          serviceCenterId,
          partId,
        },
      },
      include: {
        part: true,
        serviceCenter: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }

    return this.updateInventoryItem(inventory.id, updateDto, updatedBy);
  }

  // ========== STOCK TRANSFER MANAGEMENT ==========

  async createStockTransfer(
    createDto: CreateStockTransferDto,
    requestedBy: string,
  ) {
    // Validate service center exists
    const serviceCenter = await this.prisma.serviceCenter.findUnique({
      where: { id: createDto.toServiceCenterId },
    });

    if (!serviceCenter) {
      throw new NotFoundException('Service center not found');
    }

    // Validate all parts exist
    const partIds = createDto.items.map((item) => item.partId);
    const parts = await this.prisma.part.findMany({
      where: { id: { in: partIds } },
    });

    if (parts.length !== partIds.length) {
      const foundIds = parts.map((p) => p.id);
      const missingIds = partIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Part(s) not found: ${missingIds.join(', ')}`,
      );
    }

    // Generate transfer number
    const transferCount = await this.prisma.stockTransfer.count();
    const transferNumber = `TRF-${String(transferCount + 1).padStart(6, '0')}`;

    // Create transfer
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        toServiceCenterId: createDto.toServiceCenterId,
        fromServiceCenterId: createDto.fromServiceCenterId,
        status: 'pending',
        requestedBy,
        notes: createDto.notes,
        items: {
          create: createDto.items.map((item) => ({
            partId: item.partId,
            quantity: item.quantity,
            receivedQuantity: 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            part: true,
          },
        },
        serviceCenter: true,
      },
    });

    // Create approval for this transfer
    await this.prisma.approval.create({
      data: {
        type: 'STOCK_TRANSFER',
        status: 'PENDING',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        stockTransferId: transfer.id,
        requestedBy,
      },
    });

    await this.logAudit(
      requestedBy,
      'CREATE',
      'StockTransfer',
      transfer.id,
      `Created stock transfer: ${transferNumber}`,
    );

    // Fetch transfer with approval
    return this.prisma.stockTransfer.findUnique({
      where: { id: transfer.id },
      include: {
        items: {
          include: {
            part: true,
          },
        },
        serviceCenter: true,
        approval: true,
      },
    });
  }

  async findAllStockTransfers(filters?: {
    status?: string;
    toServiceCenterId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.StockTransferWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.toServiceCenterId) {
      where.toServiceCenterId = filters.toServiceCenterId;
    }

    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        include: {
          serviceCenter: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          items: {
            include: {
              part: true,
            },
          },
          approval: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneStockTransfer(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        serviceCenter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            part: true,
          },
        },
        approval: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    return transfer;
  }

  private async logAudit(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    description?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: action as any,
        entityType,
        entityId,
        description,
      },
    });
  }
}

