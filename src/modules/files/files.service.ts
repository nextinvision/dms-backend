import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFileDto, FileCategory, RelatedEntityType } from './dto/create-file.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) { }

  /**
   * Saves file metadata to the database.
   * Note: The physical file is already saved to disk by the Controller's Multer interceptor.
   */
  async createFileMetadata(createFileDto: CreateFileDto) {
    const isTemp = createFileDto.relatedEntityId?.startsWith('TEMP_');

    // Prepare foreign keys for the database relations
    // For temp entities, we DON'T set foreign keys to avoid constraint violations
    let appointmentId: string | undefined;
    let jobCardId: string | undefined;
    let vehicleId: string | undefined;
    let customerId: string | undefined;

    if (!isTemp && createFileDto.relatedEntityId) {
      const type = createFileDto.relatedEntityType?.toString().toLowerCase();

      // Only set foreign keys for non-temp entities
      // First check if explicitly provided
      appointmentId = createFileDto.appointmentId;
      jobCardId = createFileDto.jobCardId;
      vehicleId = createFileDto.vehicleId;
      customerId = createFileDto.customerId;

      // Then auto-map if not already explicitly provided
      if (type === 'appointment' && !appointmentId) appointmentId = createFileDto.relatedEntityId;
      else if (type === 'job_card' && !jobCardId) jobCardId = createFileDto.relatedEntityId;
      else if (type === 'vehicle' && !vehicleId) vehicleId = createFileDto.relatedEntityId;
      else if (type === 'customer' && !customerId) customerId = createFileDto.relatedEntityId;
    }

    try {
      // Check if file with this publicId already exists
      if (createFileDto.publicId) {
        const existingFile = await this.prisma.file.findUnique({
          where: { publicId: createFileDto.publicId },
        });

        if (existingFile) {
          // Update existing file with new relations if needed
          return await this.prisma.file.update({
            where: { id: existingFile.id },
            data: {
              appointmentId,
              jobCardId,
              vehicleId,
              customerId,
              relatedEntityId: createFileDto.relatedEntityId,
              relatedEntityType: createFileDto.relatedEntityType,
            },
          });
        }
      }

      let retries = 3;
      while (retries > 0) {
        try {
          return await this.prisma.file.create({
            data: {
              url: createFileDto.url,
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
              publicId: createFileDto.publicId || null,

              // Map relations
              appointmentId,
              jobCardId,
              vehicleId,
              customerId,
            },
          });
        } catch (error) {
          console.warn(`Attempt failed to create file metadata (remaining retries: ${retries - 1}):`, error.message);
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
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
      let baseDir = '/home/fortytwoev/dms-data/uploads/prod';

      if (__dirname.includes('dms-dev')) {
        baseDir = '/home/fortytwoev/dms-data/uploads/dev';
      }

      // Local Windows Development Override
      try {
        if (process.platform === 'win32') {
          baseDir = path.join(process.cwd(), '../dms-frontend/public/uploads');
        }
      } catch (e) {
        console.warn('Failed to detect Windows environment:', e);
      }

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

  /**
   * Upload a Buffer (e.g., generated PDF) directly to disk
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options: {
      category: FileCategory;
      relatedEntityType: RelatedEntityType;
      relatedEntityId: string;
      uploadedBy?: string;
    }
  ): Promise<{ url: string; file: any }> {
    try {
      // Determine base directory based on environment
      let baseDir = '/home/fortytwoev/dms-data/uploads/prod';

      if (__dirname.includes('dms-dev')) {
        baseDir = '/home/fortytwoev/dms-data/uploads/dev';
      }

      // Local Windows Development Override
      try {
        if (process.platform === 'win32') {
          // Save to frontend public/uploads for immediate serving
          baseDir = path.join(process.cwd(), '../dms-frontend/public/uploads');
        }
      } catch (e) {
        console.warn('Failed to detect Windows environment:', e);
      }

      // Ensure directory exists
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}`;
      const filePath = path.join(baseDir, uniqueFilename);

      // Write buffer to disk
      fs.writeFileSync(filePath, buffer);

      // Construct URL
      const url = `/uploads/${uniqueFilename}`;

      // Create database record
      const fileMetadata = await this.createFileMetadata({
        url,
        filename: uniqueFilename,
        format: path.extname(filename).substring(1), // Remove the leading dot
        bytes: buffer.length,
        category: options.category,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        uploadedBy: options.uploadedBy,
        publicId: null, // Local storage doesn't use publicId
      });

      return { url, file: fileMetadata };
    } catch (error) {
      console.error('Error uploading buffer:', error);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }
}