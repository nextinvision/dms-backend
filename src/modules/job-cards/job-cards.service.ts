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

        const { part2AData, uploadedBy, ...jobCardData } = createJobCardDto;

        // Create Job Card in transaction
        const jobCard = await this.prisma.$transaction(async (tx) => {
            const card = await tx.jobCard.create({
                data: {
                    ...jobCardData,
                    jobCardNumber,
                    status: 'CREATED',
                    part2AData: part2AData ? {
                        issueDescription: part2AData.issueDescription,
                        numberOfObservations: part2AData.numberOfObservations,
                        symptom: part2AData.symptom,
                        defectPart: part2AData.defectPart,
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
        if (part2AData?.files) {
            const fileDtos = [];

            if (part2AData.files.videoEvidence) {
                fileDtos.push(...part2AData.files.videoEvidence.map(file => ({
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

            if (part2AData.files.vinImage) {
                fileDtos.push(...part2AData.files.vinImage.map(file => ({
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

            if (part2AData.files.odoImage) {
                fileDtos.push(...part2AData.files.odoImage.map(file => ({
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

            if (part2AData.files.damageImages) {
                fileDtos.push(...part2AData.files.damageImages.map(file => ({
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

        const [data, total] = await Promise.all([
            this.prisma.jobCard.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                include: {
                    // Include full customer data - single source of truth
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            whatsappNumber: true,
                            alternateNumber: true,
                            email: true,
                            address: true,
                            city: true,
                            state: true,
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
                    // Include full appointment data - single source of truth
                    appointment: {
                        select: {
                            id: true,
                            date: true,
                            time: true,
                            serviceType: true,
                            customerComplaintIssue: true,
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
