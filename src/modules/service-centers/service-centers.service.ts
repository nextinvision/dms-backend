import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateServiceCenterDto } from './dto/create-service-center.dto';

@Injectable()
export class ServiceCentersService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateServiceCenterDto) {
        const existing = await this.prisma.serviceCenter.findUnique({
            where: { code: createDto.code },
        });

        if (existing) {
            throw new BadRequestException('Service Center with this code already exists');
        }

        return this.prisma.serviceCenter.create({
            data: createDto,
        });
    }

    async findAll() {
        return this.prisma.serviceCenter.findMany({
            include: {
                _count: {
                    select: { users: true, jobCards: true }
                }
            }
        });
    }

    async findOne(id: string) {
        const sc = await this.prisma.serviceCenter.findUnique({
            where: { id },
            include: {
                users: true,
                _count: {
                    select: {
                        users: true,
                        jobCards: {
                            where: { status: { not: 'COMPLETED' } }
                        }
                    }
                }
            },
        });

        if (!sc) throw new NotFoundException('Service Center not found');
        return sc;
    }

    async update(id: string, data: any) {
        await this.findOne(id);
        return this.prisma.serviceCenter.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        // Check existence
        await this.findOne(id);

        // Check for constraints manually if needed, or rely on Prisma/DB constraints
        // We know Users have SetNull, but JobCards likely restrict. 
        // We will try to delete, if it fails due to FK violation, it throws.

        try {
            return await this.prisma.serviceCenter.delete({
                where: { id },
            });
        } catch (error) {
            // Basic error handling for now, let global filter handle generic DB errors 
            // or specialized handling if code is P2003
            throw new BadRequestException('Cannot delete service center. It may have associated records (Job Cards, Inventory, etc.)');
        }
    }
}
