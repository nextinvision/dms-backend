import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobCardDto } from './dto/create-job-card.dto';
import { AssignEngineerDto } from './dto/assign-engineer.dto';
import { UpdateJobCardStatusDto } from './dto/update-status.dto';
import { FilesService } from '../files/files.service';
import { FileCategory, RelatedEntityType } from '../files/dto/create-file.dto';
import { paginate, calculateSkip, buildOrderBy } from '../../common/utils/pagination.util';

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

        const { part2AData, part1Data, uploadedBy, items, ...jobCardData } = createJobCardDto;

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
                    part2AData: part2AData ? {
                        issueDescription: part2AData.issueDescription,
                        numberOfObservations: part2AData.numberOfObservations,
                        symptom: part2AData.symptom,
                        defectPart: part2AData.defectPart,
                    } : undefined,
                    part1Data: part1Data as any,
                    part2: items as any, // Store items as part2 JSON for persistence
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
                    // Audit trail
                    createdBy: uploadedBy ? { connect: { id: uploadedBy } } : undefined,
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
        if (part2AData?.files) {
            const fileDtos = [];
            const files = part2AData.files;

            // Helper to process file array
            const processFiles = (fileArray: any[], category: FileCategory) => {
                if (!fileArray) return;
                fileArray.forEach(file => {
                    fileDtos.push({
                        ...file,
                        category,
                        relatedEntityId: jobCard.id,
                        relatedEntityType: RelatedEntityType.JOB_CARD,
                        uploadedBy: uploadedBy,
                    });
                });
            };

            processFiles(files.videoEvidence, FileCategory.WARRANTY_VIDEO);
            processFiles(files.vinImage, FileCategory.VEHICLE_VIN_IMAGE);
            processFiles(files.odoImage, FileCategory.VEHICLE_ODO_IMAGE);
            processFiles(files.damageImages, FileCategory.VEHICLE_DAMAGE_IMAGE);

            if (fileDtos.length > 0) {
                // Assuming createMany is the correct service method as per previous context
                await this.filesService.createMany(fileDtos);
            }
        }

        return jobCard;
    }

    async update(id: string, updateJobCardDto: Partial<CreateJobCardDto>) {
        const existingJobCard = await this.prisma.jobCard.findUnique({
            where: { id },
        });

        if (!existingJobCard) {
            throw new NotFoundException('Job Card not found');
        }

        const { part2AData, part1Data, uploadedBy, items, ...jobCardData } = updateJobCardDto;

        // Update Job Card
        const jobCard = await this.prisma.jobCard.update({
            where: { id },
            data: {
                ...(jobCardData.serviceType && { serviceType: jobCardData.serviceType }),
                ...(jobCardData.priority && { priority: jobCardData.priority }),
                ...(jobCardData.location && { location: jobCardData.location }),
                ...(jobCardData.isTemporary !== undefined && { isTemporary: jobCardData.isTemporary }),
                ...(jobCardData.serviceCenterId && { serviceCenter: { connect: { id: jobCardData.serviceCenterId } } }),
                ...(jobCardData.customerId && { customer: { connect: { id: jobCardData.customerId } } }),
                ...(jobCardData.vehicleId && { vehicle: { connect: { id: jobCardData.vehicleId } } }),
                ...(jobCardData.appointmentId && { appointment: { connect: { id: jobCardData.appointmentId } } }),
                ...(part2AData && {
                    part2AData: {
                        issueDescription: part2AData.issueDescription,
                        numberOfObservations: part2AData.numberOfObservations,
                        symptom: part2AData.symptom,
                        defectPart: part2AData.defectPart,
                    }
                }),
                ...(part1Data && { part1Data: part1Data as any }),
                ...(items && { part2: items as any }), // Store items as part2 JSON
                // Update audit trail
                ...(uploadedBy && { updatedBy: { connect: { id: uploadedBy } } }),
            },
        });

        // Update warranty documentation file metadata if provided
        if (part2AData?.files) {
            const fileDtos = [];
            const files = part2AData.files;

            // Helper to process file array
            const processFiles = (fileArray: any[], category: FileCategory) => {
                if (!fileArray) return;
                fileArray.forEach(file => {
                    fileDtos.push({
                        ...file,
                        category,
                        relatedEntityId: jobCard.id,
                        relatedEntityType: RelatedEntityType.JOB_CARD,
                        uploadedBy: uploadedBy,
                    });
                });
            };

            processFiles(files.videoEvidence, FileCategory.WARRANTY_VIDEO);
            processFiles(files.vinImage, FileCategory.VEHICLE_VIN_IMAGE);
            processFiles(files.odoImage, FileCategory.VEHICLE_ODO_IMAGE);
            processFiles(files.damageImages, FileCategory.VEHICLE_DAMAGE_IMAGE);

            if (fileDtos.length > 0) {
                await this.filesService.createMany(fileDtos);
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
        const { page = 1, limit = 20, sortBy, sortOrder, serviceCenterId, status, customerId, vehicleId, passedToManager, managerReviewStatus } = query;
        const skip = calculateSkip(page, limit);

        const where: any = {};
        if (serviceCenterId) where.serviceCenterId = serviceCenterId;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (vehicleId) where.vehicleId = vehicleId;

        // Manager Approval Filters
        if (passedToManager === 'true') where.passedToManager = true;
        if (managerReviewStatus) where.managerReviewStatus = managerReviewStatus;

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
                    createdBy: { select: { id: true, name: true } },
                    updatedBy: { select: { id: true, name: true } },
                    quotation: true,
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
                appointment: true,
                assignedEngineer: true,
                items: true,
                partsRequests: {
                    include: { items: true }
                },
                createdBy: { select: { id: true, name: true } },
                updatedBy: { select: { id: true, name: true } },
                quotation: true,
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
