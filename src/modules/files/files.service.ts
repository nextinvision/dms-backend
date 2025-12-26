import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFileDto, FileCategory } from './dto/create-file.dto';
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

          // Map foreign keys based on entity type for relation consistency
          appointmentId: createFileDto.relatedEntityType === 'appointment' ? createFileDto.relatedEntityId : undefined,
          jobCardId: createFileDto.relatedEntityType === 'job_card' ? createFileDto.relatedEntityId : undefined,
          vehicleId: createFileDto.relatedEntityType === 'vehicle' ? createFileDto.relatedEntityId : undefined,
          customerId: createFileDto.relatedEntityType === 'customer' ? createFileDto.relatedEntityId : undefined,
        },
      });
    } catch (error) {
      console.error('Error in createFileMetadata:', error);
      if (error.code === 'P2002') {
        // Unique constraint violation (publicId already exists)
        throw new BadRequestException('File with this public ID already exists');
      }
      // Re-throw with more detail for debugging (in development)
      throw new BadRequestException(`Database Error: ${error.message}`);
    }
  }

  async createMultipleFiles(createFileDtos: CreateFileDto[]) {
    return Promise.all(
      createFileDtos.map((dto) => this.createFileMetadata(dto))
    );
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFileById(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async deleteFile(id: string) {
    const file = await this.getFileById(id);

    try {
      // Delete from Cloudinary
      if (file.publicId) {
        await cloudinary.uploader.destroy(file.publicId);
      }
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Delete from database
    await this.prisma.file.delete({
      where: { id },
    });

    return { message: 'File deleted successfully' };
  }

  async deleteFilesByEntity(entityType: string, entityId: string) {
    const files = await this.getFiles(entityType, entityId);

    // Delete all files from Cloudinary and database
    await Promise.all(
      files.map((file) => this.deleteFile(file.id))
    );

    return { message: `${files.length} file(s) deleted successfully` };
  }

  async deleteFilesByCategory(
    entityType: string,
    entityId: string,
    category: string,
  ) {
    const files = await this.getFiles(entityType, entityId, category);

    await Promise.all(
      files.map((file) => this.deleteFile(file.id))
    );

    return { message: `${files.length} file(s) deleted successfully` };
  }
  async uploadFile(file: Express.Multer.File, folder: string = 'dms_uploads'): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      // Convert buffer to stream
      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  async uploadAndSave(file: Express.Multer.File, metadata: Partial<CreateFileDto>) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // 1. Upload to Cloudinary
    // Use category as subfolder if present
    const folder = `dms/${metadata.relatedEntityType || 'misc'}/${metadata.category || 'general'}`;
    const cloudRes = await this.uploadFile(file, folder);

    // 2. Prepare DTO
    const fileDto: CreateFileDto = {
      url: cloudRes.secure_url,
      publicId: cloudRes.public_id,
      filename: file.originalname, // Original name from user
      format: cloudRes.format,
      bytes: cloudRes.bytes,
      width: cloudRes.width, // Optional, from Cloudinary
      height: cloudRes.height,
      duration: cloudRes.duration, // For videos
      category: (metadata.category as FileCategory) || FileCategory.PHOTOS_VIDEOS,
      relatedEntityId: metadata.relatedEntityId,
      relatedEntityType: metadata.relatedEntityType,
      uploadedBy: metadata.uploadedBy,
      metadata: cloudRes, // Store full Cloudinary response as metadata
    };

    // 3. Save to Database
    return this.createFileMetadata(fileDto);
  }
}

