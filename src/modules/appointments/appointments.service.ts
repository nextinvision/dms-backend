import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilesService } from '../files/files.service';
import { FileCategory, RelatedEntityType } from '../files/dto/create-file.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';
import { generateDocumentNumber } from '../../common/utils/document-number.util';

@Injectable()
export class AppointmentsService {
    constructor(
        private prisma: PrismaService,
        private filesService: FilesService,
    ) { }

    /**
     * Helper method to process documentation files and create file DTOs
     */
    private processDocumentationFiles(
        documentationFiles: any,
        relatedEntityId: string,
        uploadedBy?: string
    ): any[] {
        const fileDtos = [];

        if (documentationFiles.customerIdProof) {
            fileDtos.push(...documentationFiles.customerIdProof
                .filter((file: any) => file.filename)
                .map((file: any) => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.CUSTOMER_ID_PROOF,
                    relatedEntityId,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
        }

        if (documentationFiles.vehicleRCCopy) {
            fileDtos.push(...documentationFiles.vehicleRCCopy
                .filter((file: any) => file.filename)
                .map((file: any) => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.VEHICLE_RC,
                    relatedEntityId,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
        }

        if (documentationFiles.warrantyCardServiceBook) {
            fileDtos.push(...documentationFiles.warrantyCardServiceBook
                .filter((file: any) => file.filename)
                .map((file: any) => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.WARRANTY_CARD,
                    relatedEntityId,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
        }

        if (documentationFiles.photosVideos) {
            fileDtos.push(...documentationFiles.photosVideos
                .filter((file: any) => file.filename)
                .map((file: any) => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    duration: file.duration,
                    category: FileCategory.PHOTOS_VIDEOS,
                    relatedEntityId,
                    relatedEntityType: RelatedEntityType.APPOINTMENT,
                    uploadedBy,
                })));
        }

        return fileDtos;
    }

    async create(createAppointmentDto: CreateAppointmentDto) {
        // Check if vehicle has an active job card
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: createAppointmentDto.vehicleId },
            select: {
                currentStatus: true,
                activeJobCardId: true,
                registration: true
            }
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found');
        }

        if (vehicle.currentStatus === 'ACTIVE_JOB_CARD' || vehicle.activeJobCardId) {
            throw new BadRequestException(
                `Cannot schedule appointment for vehicle ${vehicle.registration}. ` +
                `This vehicle has an active job card. Please complete or close the existing job card first.`
            );
        }

        // Check for existing active appointment to prevent redundancy
        const existingActiveAppointment = await this.prisma.appointment.findFirst({
            where: {
                vehicleId: createAppointmentDto.vehicleId,
                status: {
                    notIn: ['CANCELLED', 'COMPLETED']
                }
            },
            select: { appointmentNumber: true }
        });

        if (existingActiveAppointment) {
            throw new BadRequestException(
                `Vehicle ${vehicle.registration} already has an active appointment (${existingActiveAppointment.appointmentNumber}). Please complete or cancel existing appointment before scheduling a new one.`
            );
        }

        // Generate appointment number: APT-YYYY-MM-XXXX
        const appointmentNumber = await generateDocumentNumber(this.prisma, {
            prefix: 'APT',
            fieldName: 'appointmentNumber',
            model: this.prisma.appointment,
            includeMonth: true,
        });

        const { documentationFiles, uploadedBy, ...appointmentData } = createAppointmentDto;

        // Create appointment
        const appointment = await this.prisma.appointment.create({
            data: {
                ...appointmentData,
                appointmentNumber,
                appointmentDate: new Date(createAppointmentDto.appointmentDate),
                ...(createAppointmentDto.estimatedDeliveryDate && {
                    estimatedDeliveryDate: new Date(createAppointmentDto.estimatedDeliveryDate),
                }),
                // Audit trail
                ...(uploadedBy && { createdById: uploadedBy }),
            },
        });

        // Save file metadata if provided
        if (documentationFiles) {
            const fileDtos = this.processDocumentationFiles(
                documentationFiles,
                appointment.id,
                uploadedBy
            );

            if (fileDtos.length > 0) {
                await this.filesService.createMultipleFiles(fileDtos);
            }
        }

        return appointment;
    }

    async findAll(query: any) {
        const { page = 1, limit = 20, sortBy, sortOrder, serviceCenterId, status, customerId, vehicleId } = query;
        const skip = calculateSkip(page, parseInt(limit));

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (vehicleId) where.vehicleId = vehicleId;
        if (query.customerArrived !== undefined) {
            where.customerArrived = query.customerArrived === 'true';
        }
        if (query.excludeActiveJobCards === 'true') {
            where.jobCards = {
                none: {
                    status: {
                        notIn: ['INVOICED']
                    }
                }
            };
        }

        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip,
                take: parseInt(limit),
                include: {
                    customer: { select: { name: true, phone: true } },
                    vehicle: { select: { registration: true, vehicleModel: true } },
                    serviceCenter: { select: { name: true } },
                    createdBy: { select: { id: true, name: true } },
                    updatedBy: { select: { id: true, name: true } },
                },
                orderBy: buildOrderBy(sortBy || 'appointmentDate', sortOrder || 'asc'),
            }),
            this.prisma.appointment.count({ where }),
        ]);

        return paginate(data, total, page, parseInt(limit));
    }

    async findOne(id: string) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                serviceCenter: true,
                createdBy: { select: { id: true, name: true } },
                updatedBy: { select: { id: true, name: true } },
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
        const existingAppointment = await this.findOne(id);

        // Exclude non-Prisma fields
        const { documentationFiles, uploadedBy, ...rest } = updateAppointmentDto;

        const data: any = { ...rest };

        if (updateAppointmentDto.appointmentDate) {
            data.appointmentDate = new Date(updateAppointmentDto.appointmentDate);
        }

        if (updateAppointmentDto.estimatedDeliveryDate) {
            data.estimatedDeliveryDate = new Date(updateAppointmentDto.estimatedDeliveryDate);
        }

        // If vehicleId is being updated, check for duplicate active appointments (excluding current appointment)
        if (updateAppointmentDto.vehicleId && updateAppointmentDto.vehicleId !== existingAppointment.vehicleId) {
            const vehicle = await this.prisma.vehicle.findUnique({
                where: { id: updateAppointmentDto.vehicleId },
                select: { registration: true }
            });

            if (!vehicle) {
                throw new NotFoundException(`Vehicle with ID ${updateAppointmentDto.vehicleId} not found`);
            }

            // Check for existing active appointment with this vehicle (excluding current appointment)
            const existingActiveAppointment = await this.prisma.appointment.findFirst({
                where: {
                    vehicleId: updateAppointmentDto.vehicleId,
                    id: { not: id }, // Exclude current appointment
                    status: {
                        notIn: ['CANCELLED', 'COMPLETED']
                    }
                },
                select: { appointmentNumber: true }
            });

            if (existingActiveAppointment) {
                throw new BadRequestException(
                    `Vehicle ${vehicle.registration} already has an active appointment (${existingActiveAppointment.appointmentNumber}). Please complete or cancel existing appointment before scheduling a new one.`
                );
            }
        }

        // Audit trail - track who updated
        if (uploadedBy) {
            data.updatedById = uploadedBy;
        }

        // Update appointment details
        const updatedAppointment = await this.prisma.appointment.update({
            where: { id },
            data,
        });

        // Handle file synchronization if documentationFiles provided
        if (documentationFiles) {
            // 1. Get existing files linked to this appointment
            const existingFiles = await this.filesService.getFiles(
                RelatedEntityType.APPOINTMENT,
                id
            );

            // 2. Identify which files are kept based on the incoming payload
            // We use publicId as the unique identifier if available, otherwise fallback to URL or ID
            const keptPublicIds = new Set<string>();
            const keptUrls = new Set<string>();

            const categories = ['customerIdProof', 'vehicleRCCopy', 'warrantyCardServiceBook', 'photosVideos'];

            categories.forEach(category => {
                if (documentationFiles[category] && Array.isArray(documentationFiles[category])) {
                    documentationFiles[category].forEach((file: any) => {
                        if (file.publicId) keptPublicIds.add(file.publicId);
                        if (file.url) keptUrls.add(file.url);
                    });
                }
            });

            // 3. Delete files that are no longer in the payload
            const filesToDelete = existingFiles.filter(file => {
                // If file has publicId, check against kept publicIds
                if (file.publicId) {
                    return !keptPublicIds.has(file.publicId);
                }
                // Fallback to checking URL
                return !keptUrls.has(file.url);
            });

            if (filesToDelete.length > 0) {
                console.log(`[Appointment Update] Deleting ${filesToDelete.length} removed files`);
                await Promise.all(
                    filesToDelete.map(file =>
                        this.filesService.deleteFile(file.id).catch(e =>
                            console.warn(`Failed to delete file ${file.id}`, e)
                        )
                    )
                );
            }

            // 4. Create new files (idempotent due to logic in FilesService or just add new ones)
            const fileDtos = this.processDocumentationFiles(
                documentationFiles,
                id,
                uploadedBy
            );

            if (fileDtos.length > 0) {
                // We use try-catch here to silently ignore unique constraint violations if files already exist
                try {
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
