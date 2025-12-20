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

        const hashedPassword = await bcrypt.hash(createDto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                ...createDto,
                password: hashedPassword,
            },
        });

        const { password, ...result } = user;
        return result;
    }

    async findAll(query: any) {
        const { serviceCenterId, role } = query;
        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
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
            },
        });

        return users;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

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
