import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsObject } from 'class-validator';

export enum RelatedEntityType {
  APPOINTMENT = 'appointment',
  JOB_CARD = 'job_card',
  VEHICLE = 'vehicle',
  CUSTOMER = 'customer',
}

export enum FileCategory {
  CUSTOMER_ID_PROOF = 'customer_id_proof',
  VEHICLE_RC = 'vehicle_rc',
  WARRANTY_CARD = 'warranty_card',
  PHOTOS_VIDEOS = 'photos_videos',
  WARRANTY_VIDEO = 'warranty_video',
  WARRANTY_VIN = 'warranty_vin',
  WARRANTY_ODO = 'warranty_odo',
  WARRANTY_DAMAGE = 'warranty_damage',
  VEHICLE_CONDITION = 'vehicle_condition',
  VEHICLE_PHOTOS = 'vehicle_photos',
}

export class CreateFileDto {
  @IsString()
  @IsNotEmpty()
  url: string; // Cloudinary secure URL

  @IsString()
  @IsNotEmpty()
  publicId: string; // Cloudinary public ID

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  format: string; // jpg, png, pdf, mp4, etc.

  @IsInt()
  @IsNotEmpty()
  bytes: number; // File size in bytes

  @IsInt()
  @IsOptional()
  width?: number; // Image width

  @IsInt()
  @IsOptional()
  height?: number; // Image height

  @IsInt()
  @IsOptional()
  duration?: number; // Video duration in seconds

  @IsEnum(FileCategory)
  @IsNotEmpty()
  category: FileCategory;

  @IsString()
  @IsNotEmpty()
  relatedEntityId: string;

  @IsEnum(RelatedEntityType)
  @IsNotEmpty()
  relatedEntityType: RelatedEntityType;

  @IsString()
  @IsOptional()
  uploadedBy?: string; // User ID

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>; // Additional Cloudinary metadata
}

