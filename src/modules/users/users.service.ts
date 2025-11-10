import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async create(createDto: CreateUserDto, createdBy: string) {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: createDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if phone already exists (if provided)
    if (createDto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: createDto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Validate service centers exist (if provided)
    if (createDto.serviceCenterIds && createDto.serviceCenterIds.length > 0) {
      const serviceCenters = await this.prisma.serviceCenter.findMany({
        where: {
          id: { in: createDto.serviceCenterIds },
        },
      });

      if (serviceCenters.length !== createDto.serviceCenterIds.length) {
        const foundIds = serviceCenters.map((sc) => sc.id);
        const missingIds = createDto.serviceCenterIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new BadRequestException(
          `Service center(s) not found: ${missingIds.join(', ')}`,
        );
      }
    }

    // Hash password
    const saltRounds = parseInt(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12',
    );
    const hashedPassword = await bcrypt.hash(createDto.password, saltRounds);

    // Create user
    const { serviceCenterIds, ...userData } = createDto;
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        status: createDto.status || 'ACTIVE',
        createdBy,
        serviceCenters: serviceCenterIds && serviceCenterIds.length > 0
          ? {
              create: serviceCenterIds.map((scId) => ({
                serviceCenterId: scId,
                assignedBy: createdBy,
              })),
            }
          : undefined,
      },
      include: {
        serviceCenters: {
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

    // Log audit
    await this.logAudit(
      createdBy,
      'CREATE',
      'User',
      user.id,
      `Created user: ${user.email} with role ${user.role}`,
    );

    return this.sanitizeUser(user);
  }

  async findAll(filters?: {
    role?: string;
    status?: string;
    serviceCenterId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filters?.role) {
      where.role = filters.role as any;
    }

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.serviceCenterId) {
      where.serviceCenters = {
        some: {
          serviceCenterId: filters.serviceCenterId,
        },
      };
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          serviceCenters: {
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
          _count: {
            select: {
              serviceCenters: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => this.sanitizeUser(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        serviceCenters: {
          include: {
            serviceCenter: {
              select: {
                id: true,
                name: true,
                code: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(id: string, updateDto: UpdateUserDto, updatedBy: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Check email uniqueness if email is being updated
    if (updateDto.email && updateDto.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check phone uniqueness if phone is being updated
    if (updateDto.phone && updateDto.phone !== existing.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: updateDto.phone },
      });

      if (phoneExists) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Hash password if provided
    let hashedPassword = existing.password;
    if (updateDto.password) {
      const saltRounds = parseInt(
        this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12',
      );
      hashedPassword = await bcrypt.hash(updateDto.password, saltRounds);
    }

    // Handle service center assignments
    const { serviceCenterIds, ...userData } = updateDto;

    // Validate service centers exist (if provided)
    if (serviceCenterIds && serviceCenterIds.length > 0) {
      const serviceCenters = await this.prisma.serviceCenter.findMany({
        where: {
          id: { in: serviceCenterIds },
        },
      });

      if (serviceCenters.length !== serviceCenterIds.length) {
        const foundIds = serviceCenters.map((sc) => sc.id);
        const missingIds = serviceCenterIds.filter(
          (id) => !foundIds.includes(id),
        );
        throw new BadRequestException(
          `Service center(s) not found: ${missingIds.join(', ')}`,
        );
      }
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        password: hashedPassword,
        updatedBy,
        serviceCenters: serviceCenterIds && serviceCenterIds.length > 0
          ? {
              deleteMany: {},
              create: serviceCenterIds.map((scId) => ({
                serviceCenterId: scId,
                assignedBy: updatedBy,
              })),
            }
          : undefined,
      },
      include: {
        serviceCenters: {
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

    // Log audit
    await this.logAudit(
      updatedBy,
      'UPDATE',
      'User',
      id,
      `Updated user: ${user.email}`,
    );

    return this.sanitizeUser(user);
  }

  async remove(id: string, deletedBy: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting yourself
    if (id === deletedBy) {
      throw new BadRequestException('Cannot delete your own account');
    }

    // Delete user (cascade will handle related records)
    await this.prisma.user.delete({
      where: { id },
    });

    // Log audit
    await this.logAudit(
      deletedBy,
      'DELETE',
      'User',
      id,
      `Deleted user: ${user.email}`,
    );

    return { message: 'User deleted successfully' };
  }

  async getActivityLog(userId: string, limit: number = 50) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return logs;
  }

  private sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
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

