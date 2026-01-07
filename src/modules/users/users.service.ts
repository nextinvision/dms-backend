import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: createDto.email },
        });

        if (existing) {
            throw new BadRequestException('User with this email already exists');
        }

        // Validate that global roles are not assigned to a service center
        const globalRoles = ['admin', 'call_center', 'central_inventory_manager', 'inventory_manager'];
        // @ts-ignore - Check if role string is in globalRoles array even if types don't perfectly overlap yet
        if (globalRoles.includes(createDto.role) && createDto.serviceCenterId) {
            throw new BadRequestException(`Users with role ${createDto.role} cannot be assigned to a service center`);
        }

        const hashedPassword = await bcrypt.hash(createDto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                ...createDto,
                // Ensure serviceCenterId is null for global roles (double safety)
                // @ts-ignore
                serviceCenterId: globalRoles.includes(createDto.role) ? null : createDto.serviceCenterId,
                password: hashedPassword,
            },
        });

        const { password, ...result } = user;
        return result;
    }

    async findAll(query: any) {
        const { serviceCenterId, role, includeJobCards } = query;
        const where: any = {};
        if (serviceCenterId) {
            const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(serviceCenterId);
            if (isUuid) {
                where.serviceCenterId = serviceCenterId;
            } else {
                where.serviceCenter = { code: serviceCenterId };
            }
        }
        if (role) where.role = role;

        const users = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                serviceCenterId: true,
                phone: true,
                createdAt: true,
                jobCards: includeJobCards === 'true' ? {
                    select: {
                        id: true,
                        jobCardNumber: true,
                        status: true,
                        updatedAt: true,
                        createdAt: true,
                        vehicle: {
                            select: {
                                registration: true,
                                vehicleMake: true,
                                vehicleModel: true,
                            }
                        }
                    }
                } : undefined,
            },
        });

        return users;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async update(id: string, updateDto: any) { // Using any for now or explicit type if imported
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        const globalRoles = ['admin', 'call_center', 'central_inventory_manager', 'inventory_manager'];

        // Determine new role
        const newRole = updateDto.role || user.role;
        // Determine new SC (if being updated to null, it's null, otherwise current)
        // Note: updateDto might set serviceCenterId to null.
        const newServiceCenterId = updateDto.serviceCenterId !== undefined ? updateDto.serviceCenterId : user.serviceCenterId;

        // @ts-ignore
        if (globalRoles.includes(newRole) && newServiceCenterId) {
            throw new BadRequestException(`Users with role ${newRole} cannot be assigned to a service center`);
        }

        // If password is being updated, hash it
        if (updateDto.password) {
            updateDto.password = await bcrypt.hash(updateDto.password, 10);
        }

        // Force serviceCenterId to null if global role (double safety)
        if (globalRoles.includes(newRole)) {
            updateDto.serviceCenterId = null;
        }

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateDto,
        });

        const { password, ...result } = updatedUser;
        return result;
    }

    async remove(id: string) {
        // Prevent deleting self? Maybe.
        return this.prisma.user.delete({
            where: { id },
        });
    }

    /* Existing findOne... */
    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { serviceCenter: true },
        });

        if (!user) throw new NotFoundException('User not found');
        const { password, ...result } = user;
        return result;
    }
}
