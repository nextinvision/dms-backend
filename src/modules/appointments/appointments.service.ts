import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilesService } from '../files/files.service';
import { FileCategory, RelatedEntityType } from '../files/dto/create-file.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';

@Injectable()
export class AppointmentsService {
    constructor(
        private prisma: PrismaService,
        private filesService: FilesService,
    ) { }

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

        const { documentationFiles, uploadedBy, ...appointmentData } = createAppointmentDto;

        // Create appointment
        const appointment = await this.prisma.appointment.create({
            data: {
                ...appointmentData,
                appointmentNumber,
                appointmentDate: new Date(createAppointmentDto.appointmentDate),
            },
        });

        // Save file metadata if provided
        if (documentationFiles) {
            const fileDtos = [];

            if (documentationFiles.customerIdProof) {
                fileDtos.push(...documentationFiles.customerIdProof.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.CUSTOMER_ID_PROOF,
                    relatedEntityId: appointment.id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }

            if (documentationFiles.vehicleRCCopy) {
                fileDtos.push(...documentationFiles.vehicleRCCopy.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.VEHICLE_RC,
                    relatedEntityId: appointment.id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }

            if (documentationFiles.warrantyCardServiceBook) {
                fileDtos.push(...documentationFiles.warrantyCardServiceBook.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.WARRANTY_CARD,
                    relatedEntityId: appointment.id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }

            if (documentationFiles.photosVideos) {
                fileDtos.push(...documentationFiles.photosVideos.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    duration: file.duration,
                    category: FileCategory.PHOTOS_VIDEOS,
                    relatedEntityId: appointment.id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }

            if (fileDtos.length > 0) {
                await this.filesService.createMultipleFiles(fileDtos);
            }
        }

        return appointment;
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, sortBy, sortOrder, serviceCenterId, status, customerId, vehicleId } = query;
        const skip = calculateSkip(page, limit);

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (vehicleId) where.vehicleId = vehicleId;

        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true, vehicleModel: true } },
                    serviceCenter: { select: { name: true } },
                },
                orderBy: buildOrderBy(sortBy || 'appointmentDate', sortOrder || 'asc'),
            }),
            this.prisma.appointment.count({ where }),
        ]);

        return paginate(data, total, page, limit);
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

        // Fetch associated files
        const files = await this.filesService.getFiles(
            RelatedEntityType.APPOINTMENT,
            id,
        );

        return {
            ...appointment,
            files,
        };
    }

    async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
        await this.findOne(id);

        // Exclude non-Prisma fields
        const { documentationFiles, uploadedBy, ...rest } = updateAppointmentDto;

        const data: any = { ...rest };

        if (updateAppointmentDto.appointmentDate) {
            data.appointmentDate = new Date(updateAppointmentDto.appointmentDate);
        }

        // Update appointment details
        const updatedAppointment = await this.prisma.appointment.update({
            where: { id },
            data,
        });

        // Handle new file associations if provided
        if (documentationFiles) {
            const fileDtos = [];
            /* Reusing logic from create */
            if (documentationFiles.customerIdProof) {
                fileDtos.push(...documentationFiles.customerIdProof.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.CUSTOMER_ID_PROOF,
                    relatedEntityId: id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }
            if (documentationFiles.vehicleRCCopy) {
                fileDtos.push(...documentationFiles.vehicleRCCopy.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.VEHICLE_RC,
                    relatedEntityId: id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }
            if (documentationFiles.warrantyCardServiceBook) {
                fileDtos.push(...documentationFiles.warrantyCardServiceBook.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.WARRANTY_CARD,
                    relatedEntityId: id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }
            if (documentationFiles.photosVideos) {
                fileDtos.push(...documentationFiles.photosVideos.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    duration: file.duration,
                    category: FileCategory.PHOTOS_VIDEOS,
                    relatedEntityId: id,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
            }

            if (fileDtos.length > 0) {
                // We use try-catch here to silently ignore unique constraint violations if files already exist
                try {
                    // Filter out likely existing files? 
                    // To be safe, we just try to create. If DB constraint exists on publicId, it might fail.
                    // But usually, updating file metadata for existing files is better.
                    // For now, simplicity:
                    await this.filesService.createMultipleFiles(fileDtos);
                } catch (e) {
                    console.warn('Backend: Some files might already exist or failed to link.', e);
                }
            }
        }

        return updatedAppointment;
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.appointment.delete({
            where: { id },
        });
    }
}
