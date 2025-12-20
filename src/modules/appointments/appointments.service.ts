import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService) { }

    async create(createAppointmentDto: CreateAppointmentDto) {
        // Generate appointment number: APT-YYYY-MM-XXXX
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `APT-${year}-${month}-`;

        const lastAppointment = await this.prisma.appointment.findFirst({
            where: { appointmentNumber: { startsWith: prefix } },
            orderBy: { appointmentNumber: 'desc' },
        });

        let seq = 1;
        if (lastAppointment) {
            const lastSeq = parseInt(lastAppointment.appointmentNumber.split('-')[3]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const appointmentNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        return this.prisma.appointment.create({
            data: {
                ...createAppointmentDto,
                appointmentNumber,
                appointmentDate: new Date(createAppointmentDto.appointmentDate),
            },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, serviceCenterId, status, customerId, vehicleId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (vehicleId) where.vehicleId = vehicleId;

        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true, vehicleModel: true } },
                    serviceCenter: { select: { name: true } },
                },
                orderBy: { appointmentDate: 'asc' },
            }),
            this.prisma.appointment.count({ where }),
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
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                serviceCenter: true,
            },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        return appointment;
    }

    async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
        await this.findOne(id);
        const data: any = { ...updateAppointmentDto };
        if (updateAppointmentDto.appointmentDate) {
            data.appointmentDate = new Date(updateAppointmentDto.appointmentDate);
        }

        return this.prisma.appointment.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.appointment.delete({
            where: { id },
        });
    }
}
