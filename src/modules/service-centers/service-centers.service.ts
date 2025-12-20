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
                    select: { users: true }
                }
            }
        });
    }

    async findOne(id: string) {
        const sc = await this.prisma.serviceCenter.findUnique({
            where: { id },
            include: { users: true },
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
}
