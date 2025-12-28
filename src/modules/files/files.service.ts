import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFileDto, FileCategory, RelatedEntityType } from './dto/create-file.dto';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {
    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async createFileMetadata(createFileDto: CreateFileDto) {
    const isTemp = createFileDto.relatedEntityId.startsWith('TEMP_');

    // Prepare foreign keys
    let appointmentId: string | undefined;
    let jobCardId: string | undefined;
    let vehicleId: string | undefined;
    let customerId: string | undefined;

    if (!isTemp) {
      const type = createFileDto.relatedEntityType?.toString().toLowerCase();
      console.log(`[FilesService] Processing File. EntityType: ${type}, ID: ${createFileDto.relatedEntityId}`);

      if (type === 'appointment') appointmentId = createFileDto.relatedEntityId;
      else if (type === 'job_card') jobCardId = createFileDto.relatedEntityId;
      else if (type === 'vehicle') vehicleId = createFileDto.relatedEntityId;
      else if (type === 'customer') customerId = createFileDto.relatedEntityId;
    }

    try {
      return await this.prisma.file.create({
        data: {
          url: createFileDto.url,
          publicId: createFileDto.publicId,
          filename: createFileDto.filename,
          format: createFileDto.format,
          bytes: createFileDto.bytes,
          width: createFileDto.width,
          height: createFileDto.height,
          duration: createFileDto.duration,
          category: createFileDto.category,
          relatedEntityId: createFileDto.relatedEntityId,
          relatedEntityType: createFileDto.relatedEntityType,
          uploadedBy: createFileDto.uploadedBy,
          metadata: createFileDto.metadata || {},

          // Map foreign keys
          appointmentId,
          jobCardId,
          vehicleId,
          customerId,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation (publicId already exists)
        // This likely means we are linking a previously uploaded 'temp' file to a real entity
        // So we update the existing file record
        try {
          return await this.prisma.file.update({
            where: { publicId: createFileDto.publicId },
            data: {
              relatedEntityId: createFileDto.relatedEntityId,
              relatedEntityType: createFileDto.relatedEntityType,

              // Update FKs explicitly
              appointmentId,
              jobCardId,
              vehicleId,
              customerId,
            }
          });
        } catch (updateError) {
          console.error('Error updating existing file metadata:', updateError);
          throw new BadRequestException(`Failed to update existing file: ${updateError.message}`);
        }
      }

      console.error('Error in createFileMetadata:', error);
      // Re-throw with more detail for debugging (in development)
      throw new BadRequestException(`Database Error: ${error.message}`);
    }
  }

  async createMultipleFiles(createFileDtos: CreateFileDto[]) {
    return Promise.all(
      createFileDtos.map((dto) => this.createFileMetadata(dto))
    );
  }

  // Alias for compatibility with JobCardsService
  async createMany(createFileDtos: CreateFileDto[]) {
    return this.createMultipleFiles(createFileDtos);
  }

  async getFiles(
    entityType: string,
    entityId: string,
    category?: string,
  ) {
    const where: any = {
      relatedEntityType: entityType,
      relatedEntityId: entityId,
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.file.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async uploadAndSave(file: any, body: any) {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: body.folder || 'dms-uploads',
          resource_type: 'auto',
        },
        async (error, result) => {
          if (error) return reject(error);

          try {
            // Save metadata using existing method to handle FKs
            const dto: CreateFileDto = {
              url: result.secure_url,
              publicId: result.public_id,
              filename: file.originalname,
              format: result.format || 'unknown',
              bytes: result.bytes || file.size,
              width: result.width,
              height: result.height,
              duration: result.duration,
              category: body.category as FileCategory,
              relatedEntityId: body.entityId,
              relatedEntityType: body.entityType as RelatedEntityType,
              uploadedBy: body.uploadedBy,
              metadata: {},
            };
            const saved = await this.createFileMetadata(dto);
            resolve(saved);
          } catch (err) {
            reject(err);
          }
        }
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async getFileById(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async updateEntityAssociation(
    tempEntityId: string,
    actualEntityId: string,
    entityType: string,
  ) {
    // Prepare update data including FKs
    const updateData: any = {
      relatedEntityId: actualEntityId,
      relatedEntityType: entityType,
    };

    // Set FKs
    const type = entityType?.toString().toLowerCase();
    console.log(`[FilesService] Updating Association. Type: ${type}, ActualID: ${actualEntityId}`);

    if (type === 'appointment') updateData.appointmentId = actualEntityId;
    else if (type === 'job_card') updateData.jobCardId = actualEntityId;
    else if (type === 'vehicle') updateData.vehicleId = actualEntityId;
    else if (type === 'customer') updateData.customerId = actualEntityId;

    return this.prisma.file.updateMany({
      where: {
        relatedEntityId: tempEntityId,
        relatedEntityType: entityType,
      },
      data: updateData,
    });
  }

  async deleteFile(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');

    // Delete from Cloudinary
    if (file.publicId) {
      await cloudinary.uploader.destroy(file.publicId);
    }

    return this.prisma.file.delete({ where: { id } });
  }

  async deleteFilesByEntity(entityType: string, entityId: string) {
    const files = await this.prisma.file.findMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId },
    });

    // Delete from Cloudinary
    for (const file of files) {
      if (file.publicId) {
        await cloudinary.uploader.destroy(file.publicId);
      }
    }

    return this.prisma.file.deleteMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId },
    });
  }

  async deleteFilesByCategory(entityType: string, entityId: string, category: string) {
    const files = await this.prisma.file.findMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId, category: category as FileCategory },
    });

    // Delete from Cloudinary
    for (const file of files) {
      if (file.publicId) {
        await cloudinary.uploader.destroy(file.publicId);
      }
    }

    return this.prisma.file.deleteMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId, category: category as FileCategory },
    });
  }
}
