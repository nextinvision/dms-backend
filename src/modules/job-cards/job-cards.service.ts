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
            // Check if any item is a warranty item or if part2AData has warranty info (optional check)
            const hasWarrantyItems = items?.some(i => i.isWarranty || i.partWarrantyTag) || false;

            const card = await tx.jobCard.create({
                data: {
                    serviceType: jobCardData.serviceType,
                    priority: jobCardData.priority,
                    location: jobCardData.location,
                    isTemporary: jobCardData.isTemporary ?? true,
                    jobCardNumber,
                    status: 'CREATED',
                    // Auto-pass to manager if warranty items exist
                    // passedToManager: hasWarrantyItems,
                    // managerReviewStatus: hasWarrantyItems ? 'PENDING' : null,
                    // passedToManagerAt: hasWarrantyItems ? new Date() : null,
                    passedToManager: false,
                    managerReviewStatus: null,
                    passedToManagerAt: null,
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
                            isWarranty: item.isWarranty, // Ensure isWarranty is saved to Item level
                            inventoryPartId: item.inventoryPartId,
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
            select: { id: true, managerReviewStatus: true }
        });

        if (!existingJobCard) {
            throw new NotFoundException('Job Card not found');
        }

        const { part2AData, part1Data, uploadedBy, items, ...jobCardData } = updateJobCardDto;

        // Create Job Card in transaction
        const jobCard = await this.prisma.$transaction(async (tx) => {
            // Check if any item is a warranty item or if part2AData has warranty info (optional check)
            const hasWarrantyItems = items?.some(i => i.isWarranty || i.partWarrantyTag) || false;

            // Prepare update data
            const updateData: any = {
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
            };

            // Auto-pass to manager if warranty items exist
            // if (hasWarrantyItems && existingJobCard.managerReviewStatus !== 'APPROVED') {
            //     updateData.passedToManager = true;
            //     updateData.managerReviewStatus = 'PENDING';
            //     updateData.passedToManagerAt = new Date();
            // }

            // Update items if provided
            if (items) {
                // Delete existing items and recreate
                await tx.jobCardItem.deleteMany({ where: { jobCardId: id } });

                updateData.items = {
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
                        isWarranty: item.isWarranty,
                        inventoryPartId: item.inventoryPartId,
                    }))
                };
            }

            return tx.jobCard.update({
                where: { id },
                data: updateData,
            });
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
        // if (!jobCard.isTemporary) {
        //     throw new BadRequestException('Only temporary job cards can be sent for manager approval');
        // }

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
        const jobCard = await this.prisma.jobCard.findUnique({
            where: { id },
            include: { items: true } // Include items to create parts request
        });

        if (!jobCard) throw new NotFoundException('Job Card not found');

        if (!jobCard.passedToManager) {
            throw new BadRequestException('Job card has not been passed to manager for review');
        }

        // Transactions to ensure consistency
        return this.prisma.$transaction(async (tx) => {
            const updatedJobCard = await tx.jobCard.update({
                where: { id },
                data: {
                    managerReviewStatus: data.status,
                    managerReviewNotes: data.notes,
                    managerReviewedAt: new Date(),
                },
            });

            return updatedJobCard;
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
        const jobCard = await this.prisma.jobCard.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!jobCard) throw new NotFoundException('Job Card not found');

        console.log('[AssignEngineer] Starting transaction...');
        try {
            // Execute in transaction to ensure atomicity
            const updatedJobCard = await this.prisma.$transaction(async (tx) => {
                // 1. Assign the engineer
                console.log('[AssignEngineer] Updating JobCard status...');
                const updated = await tx.jobCard.update({
                    where: { id },
                    data: {
                        assignedEngineerId: assignEngineerDto.engineerId,
                        status: 'ASSIGNED',
                    },
                });
                console.log('[AssignEngineer] JobCard updated.');

                // 2. Create Parts Request for SIM (Service Inventory Manager)

                // Fetch items again inside transaction or use jobCard.items from outer scope?
                // jobCard.items is from outer scope (findUnique). That's fine.
                console.log(`[AssignEngineer] JobCard ${id} has ${jobCard.items?.length || 0} items. Checking for parts...`);

                if (jobCard.items && jobCard.items.length > 0) {
                    // Case-insensitive check for 'part'
                    const partItems = jobCard.items.filter(item => item.itemType?.toLowerCase() === 'part');
                    console.log(`[AssignEngineer] Found ${partItems.length} items with itemType='part'.`);

                    if (partItems.length > 0) {
                        try {
                            // Check if a pending or approved request already exists to avoid duplicates
                            const existingRequest = await tx.partsRequest.findFirst({
                                where: {
                                    jobCardId: id,
                                    status: { in: ['PENDING', 'APPROVED'] }
                                }
                            });

                            if (existingRequest) {
                                console.log(`[AssignEngineer] Existing active parts request found (ID: ${existingRequest.id}). Skipping creation.`);
                            }

                            if (!existingRequest) {
                                console.log(`[AssignEngineer] Creating NEW parts request for ${partItems.length} items...`);
                                const newRequest = await tx.partsRequest.create({
                                    data: {
                                        jobCard: { connect: { id } },
                                        status: 'APPROVED', // Auto-approved by SC Manager upon assignment
                                        items: {
                                            create: partItems.map(item => ({
                                                partName: item.partName || "Unknown Part",
                                                partNumber: item.partCode || "N/A",
                                                requestedQty: item.qty || 1,
                                                isWarranty: item.isWarranty || false,
                                                inventoryPartId: item.inventoryPartId || null,
                                            }))
                                        }
                                    }
                                });
                                console.log(`[AssignEngineer] Parts Request Created Successfully! ID: ${newRequest.id}`);
                            }
                        } catch (innerError) {
                            console.error('[AssignEngineer] Error inside parts creation logic:', innerError);
                            throw innerError; // Re-throw to abort transaction
                        }
                    } else {
                        console.log(`[AssignEngineer] No items of type 'part' found. Skipping request creation.`);
                    }
                } else {
                    console.log(`[AssignEngineer] Job Card has no items. Skipping request creation.`);
                }

                return updated;
            });
            return updatedJobCard;

        } catch (error) {
            console.error('[AssignEngineer] Transaction failed:', error);
            throw error;
        }
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

    async createPartsRequest(jobCardId: string, items: any[]) {
        const jobCard = await this.prisma.jobCard.findUnique({ where: { id: jobCardId } });
        if (!jobCard) throw new NotFoundException('Job Card not found');

        return this.prisma.partsRequest.create({
            data: {
                jobCard: { connect: { id: jobCardId } },
                items: {
                    create: items.map(item => ({
                        partName: item.partName || "Unknown Part",
                        partNumber: item.partNumber || null,
                        requestedQty: item.quantity,
                        isWarranty: item.isWarranty || false,
                        inventoryPartId: item.inventoryPartId || null,
                    }))
                }
            },
            include: { items: true }
        });
    }

    async getPendingPartsRequests(serviceCenterId?: string) {
        return this.prisma.partsRequest.findMany({
            where: {
                status: { in: ['PENDING', 'APPROVED'] },
                ...(serviceCenterId && {
                    jobCard: {
                        serviceCenterId: serviceCenterId
                    }
                })
            },
            include: {
                jobCard: {
                    include: {
                        vehicle: true,
                        customer: true,
                        assignedEngineer: true
                    }
                },
                items: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updatePartsRequestStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED', notes?: string) {
        return this.prisma.partsRequest.update({
            where: { id },
            data: { status },
        });
    }

    async deletePartsRequest(id: string) {
        return this.prisma.$transaction(async (tx) => {
            // Delete related items first
            await tx.partsRequestItem.deleteMany({ where: { requestId: id } });
            // Then delete the request
            return tx.partsRequest.delete({ where: { id } });
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

        // Execute sequentially to prevent connection pool exhaustion on Supabase
        const total = await this.prisma.jobCard.count({ where });

        const data = await this.prisma.jobCard.findMany({

            where,
            skip: Number(skip),
            take: Number(limit),
            include: {
                partsRequests: {
                    include: { items: true },
                    orderBy: { createdAt: 'desc' }
                },
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

        });

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
