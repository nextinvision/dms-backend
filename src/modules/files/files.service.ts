import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFileDto, FileCategory } from './dto/create-file.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Saves file metadata to the database.
   * Note: The physical file is already saved to disk by the Controller's Multer interceptor.
   */
  async createFileMetadata(createFileDto: CreateFileDto) {
    const isTemp = createFileDto.relatedEntityId?.startsWith('TEMP_');

    // Prepare foreign keys for the database relations
    let appointmentId: string | undefined;
    let jobCardId: string | undefined;
    let vehicleId: string | undefined;
    let customerId: string | undefined;

    if (!isTemp && createFileDto.relatedEntityId) {
      const type = createFileDto.relatedEntityType?.toString().toLowerCase();
      
      if (type === 'appointment') appointmentId = createFileDto.relatedEntityId;
      else if (type === 'job_card') jobCardId = createFileDto.relatedEntityId;
      else if (type === 'vehicle') vehicleId = createFileDto.relatedEntityId;
      else if (type === 'customer') customerId = createFileDto.relatedEntityId;
    }

    try {
      return await this.prisma.file.create({
        data: {
          url: createFileDto.url,
          filename: createFileDto.filename,
          format: createFileDto.format,
          bytes: createFileDto.bytes,
          category: createFileDto.category,
          relatedEntityId: createFileDto.relatedEntityId,
          relatedEntityType: createFileDto.relatedEntityType,
          uploadedBy: createFileDto.uploadedBy,
          metadata: createFileDto.metadata || {},
          publicId: null, // Explicitly null as we no longer use Cloudinary
          
          // Map relations
          appointmentId,
          jobCardId,
          vehicleId,
          customerId,
        },
      });
    } catch (error) {
      console.error('Error in createFileMetadata:', error);
      throw new BadRequestException(`Database Error: ${error.message}`);
    }
  }

  async createMultipleFiles(createFileDtos: CreateFileDto[]) {
    return Promise.all(
      createFileDtos.map((dto) => this.createFileMetadata(dto))
    );
  }

  async createMany(createFileDtos: CreateFileDto[]) {
    return this.createMultipleFiles(createFileDtos);
  }

  async getFiles(entityType: string, entityId: string, category?: string) {
    const where: any = {
      relatedEntityType: entityType,
      relatedEntityId: entityId,
    };

    if (category) where.category = category;

    return this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
    const updateData: any = {
      relatedEntityId: actualEntityId,
      relatedEntityType: entityType,
    };

    const type = entityType?.toString().toLowerCase();
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

  // --- DELETE LOGIC (UPDATED FOR LOCAL DISK) ---
  
  async deleteFile(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');

    // Delete the physical file from the VPS disk
    this.deleteFromDisk(file.url);

    // Delete the record from the database
    return this.prisma.file.delete({ where: { id } });
  }

  async deleteFilesByEntity(entityType: string, entityId: string) {
    const files = await this.prisma.file.findMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId },
    });

    files.forEach(file => this.deleteFromDisk(file.url));

    return this.prisma.file.deleteMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId },
    });
  }

  async deleteFilesByCategory(entityType: string, entityId: string, category: string) {
    const files = await this.prisma.file.findMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId, category: category as FileCategory },
    });

    files.forEach(file => this.deleteFromDisk(file.url));

    return this.prisma.file.deleteMany({
      where: { relatedEntityType: entityType, relatedEntityId: entityId, category: category as FileCategory },
    });
  }

  /**
   * Helper: Deletes a physical file from the VPS based on its URL
   */
  private deleteFromDisk(fileUrl: string) {
    try {
      // Determine base directory based on environment (Dev vs Prod)
      const isDev = __dirname.includes('dms-dev');
      const baseDir = isDev 
          ? '/home/fortytwoev/dms-data/uploads/dev' 
          : '/home/fortytwoev/dms-data/uploads/prod';

      // Extract filename from URL (e.g., /uploads/file-123.jpg -> file-123.jpg)
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        const filePath = path.join(baseDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (err) {
      console.error(`Failed to delete local file: ${fileUrl}`, err);
    }
  }
}