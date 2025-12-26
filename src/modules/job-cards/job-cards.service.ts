import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobCardDto } from './dto/create-job-card.dto';
import { AssignEngineerDto } from './dto/assign-engineer.dto';
import { UpdateJobCardStatusDto } from './dto/update-status.dto';
import { FilesService } from '../files/files.service';
import { FileCategory, RelatedEntityType } from '../files/dto/create-file.dto';

@Injectable()
export class JobCardsService {
    constructor(
        private prisma: PrismaService,
        private filesService: FilesService,
    ) { }

    async create(createJobCardDto: CreateJobCardDto) {
        const { serviceCenterId, vehicleId } = createJobCardDto;

        // Get SC Code
        const sc = await this.prisma.serviceCenter.findUnique({
            where: { id: serviceCenterId },
        });
        if (!sc) throw new NotFoundException('Service Center not found');

        // Generate jobCardNumber: {scCode}-{YYYY}-{MM}-{SEQ}
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `${sc.code}-${year}-${month}-`;

        const lastJobCard = await this.prisma.jobCard.findFirst({
            where: { jobCardNumber: { startsWith: prefix } },
            orderBy: { jobCardNumber: 'desc' },
        });

        let seq = 1;
        if (lastJobCard) {
            const parts = lastJobCard.jobCardNumber.split('-');
            const lastSeq = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const jobCardNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

        const { part2A, uploadedBy, items, ...jobCardData } = createJobCardDto;

        // Create Job Card in transaction
        const jobCard = await this.prisma.$transaction(async (tx) => {
            const card = await tx.jobCard.create({
                data: {
                    serviceType: jobCardData.serviceType,
                    priority: jobCardData.priority,
                    location: jobCardData.location,
                    isTemporary: jobCardData.isTemporary ?? true,
                    jobCardNumber,
                    status: 'CREATED',
                    serviceCenter: { connect: { id: jobCardData.serviceCenterId } },
                    customer: { connect: { id: jobCardData.customerId } },
                    vehicle: { connect: { id: jobCardData.vehicleId } },
                    appointment: jobCardData.appointmentId ? { connect: { id: jobCardData.appointmentId } } : undefined,
                    part2A: part2A ? {
                        issueDescription: part2A.issueDescription,
                        numberOfObservations: part2A.numberOfObservations,
                        symptom: part2A.symptom,
                        defectPart: part2A.defectPart,
                    } : undefined,
                    part1: jobCardData.part1 as any,
                    items: items ? {
                        create: items.map(item => ({
                            srNo: item.srNo,
                            partWarrantyTag: item.partWarrantyTag,
                            partName: item.partName,
                            partCode: item.partCode,
                            qty: item.qty,
                            amount: item.amount,
                            technician: item.technician,
                            labourCode: item.labourCode,
                            itemType: item.itemType,
                        }))
                    } : undefined,
                },
            });

            // Update vehicle status
            await tx.vehicle.update({
                where: { id: vehicleId },
                data: {
                    currentStatus: 'ACTIVE_JOB_CARD',
                    activeJobCardId: card.id,
                },
            });

            return card;
        });

        // Save warranty documentation file metadata if provided
        if (part2A?.files) {
            const fileDtos = [];

            if (part2A.files.videoEvidence) {
                fileDtos.push(...part2A.files.videoEvidence.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    duration: file.duration,
                    category: FileCategory.WARRANTY_VIDEO,
                    relatedEntityId: jobCard.id,
                    relatedEntityType: RelatedEntityType.JOB_CARD,
                    uploadedBy,
                })));
            }

            if (part2A.files.vinImage) {
                fileDtos.push(...part2A.files.vinImage.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.WARRANTY_VIN,
                    relatedEntityId: jobCard.id,
                    relatedEntityType: RelatedEntityType.JOB_CARD,
                    uploadedBy,
                })));
            }

            if (part2A.files.odoImage) {
                fileDtos.push(...part2A.files.odoImage.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.WARRANTY_ODO,
                    relatedEntityId: jobCard.id,
                    relatedEntityType: RelatedEntityType.JOB_CARD,
                    uploadedBy,
                })));
            }

            if (part2A.files.damageImages) {
                fileDtos.push(...part2A.files.damageImages.map(file => ({
                    url: file.url,
                    publicId: file.publicId,
                    filename: file.filename,
                    format: file.format,
                    bytes: file.bytes,
                    width: file.width,
                    height: file.height,
                    category: FileCategory.WARRANTY_DAMAGE,
                    relatedEntityId: jobCard.id,
                    relatedEntityType: RelatedEntityType.JOB_CARD,
                    uploadedBy,
                })));
            }

            if (fileDtos.length > 0) {
                await this.filesService.createMultipleFiles(fileDtos);
            }
        }

        return jobCard;
    }

    async passToManager(id: string, managerId: string) {
        const jobCard = await this.findOne(id);
        if (!jobCard.isTemporary) {
            throw new BadRequestException('Only temporary job cards can be sent for manager approval');
        }

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                passedToManager: true,
                passedToManagerAt: new Date(),
                managerId,
                managerReviewStatus: 'PENDING',
            },
        });
    }

    async managerReview(id: string, data: { status: 'APPROVED' | 'REJECTED'; notes?: string }) {
        const jobCard = await this.findOne(id);
        if (!jobCard.passedToManager) {
            throw new BadRequestException('Job card has not been passed to manager for review');
        }

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                managerReviewStatus: data.status,
                managerReviewNotes: data.notes,
                managerReviewedAt: new Date(),
            },
        });
    }

    async convertToActual(id: string) {
        const jobCard = await this.findOne(id);
        if (!jobCard.isTemporary) {
            throw new BadRequestException('Job card is already an actual job card');
        }
        if (jobCard.managerReviewStatus !== 'APPROVED') {
            throw new BadRequestException('Job card must be approved by a manager before conversion');
        }

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                isTemporary: false,
                convertedToFinal: true,
            },
        });
    }


    async assignEngineer(id: string, assignEngineerDto: AssignEngineerDto) {
        const jobCard = await this.prisma.jobCard.findUnique({ where: { id } });
        if (!jobCard) throw new NotFoundException('Job Card not found');

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                assignedEngineerId: assignEngineerDto.engineerId,
                status: 'ASSIGNED',
            },
        });
    }

    async updateStatus(id: string, updateStatusDto: UpdateJobCardStatusDto) {
        const jobCard = await this.prisma.jobCard.findUnique({ where: { id } });
        if (!jobCard) throw new NotFoundException('Job Card not found');

        return this.prisma.jobCard.update({
            where: { id },
            data: {
                status: updateStatusDto.status,
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

        // Manager Approval Filters
        if (query.passedToManager === 'true') where.passedToManager = true;
        if (query.managerReviewStatus) where.managerReviewStatus = query.managerReviewStatus;

        const [data, total] = await Promise.all([
            this.prisma.jobCard.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            whatsappNumber: true,
                            alternateNumber: true,
                            email: true,
                            address: true,
                            cityState: true,
                            pincode: true,
                            customerType: true,
                        }
                    },
                    // Include full vehicle data - single source of truth
                    vehicle: {
                        select: {
                            id: true,
                            registration: true,
                            vehicleMake: true,
                            vehicleModel: true,
                            vehicleYear: true,
                            vin: true,
                            variant: true,
                            motorNumber: true,
                            chargerSerialNumber: true,
                            purchaseDate: true,
                            warrantyStatus: true,
                            insuranceStartDate: true,
                            insuranceEndDate: true,
                            insuranceCompanyName: true,
                            vehicleColor: true,
                        }
                    },
                    appointment: {
                        select: {
                            id: true,
                            appointmentDate: true,
                            appointmentTime: true,
                            serviceType: true,
                            customerComplaint: true,
                            previousServiceHistory: true,
                            estimatedServiceTime: true,
                            estimatedCost: true,
                            odometerReading: true,
                            estimatedDeliveryDate: true,
                            assignedServiceAdvisor: true,
                            assignedTechnician: true,
                            pickupDropRequired: true,
                            pickupAddress: true,
                            pickupState: true,
                            pickupCity: true,
                            pickupPincode: true,
                            dropAddress: true,
                            dropState: true,
                            dropCity: true,
                            dropPincode: true,
                            preferredCommunicationMode: true,
                            arrivalMode: true,
                            checkInNotes: true,
                            checkInSlipNumber: true,
                            checkInDate: true,
                            checkInTime: true,
                        }
                    },
                    assignedEngineer: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.jobCard.count({ where }),
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
        const jobCard = await this.prisma.jobCard.findUnique({
            where: { id },
            include: {
                customer: true,
                vehicle: true,
                assignedEngineer: true,
                items: true,
                partsRequests: {
                    include: { items: true }
                }
            },
        });

        if (!jobCard) throw new NotFoundException('Job Card not found');

        // Fetch associated files
        const files = await this.filesService.getFiles(
            RelatedEntityType.JOB_CARD,
            id,
        );

        return {
            ...jobCard,
            files,
        };
    }
}
