import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseArrayPipe,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // 1. Detect Environment (Dev vs Prod)
          // We check if the current directory path contains 'dms-dev'
          const isDev = __dirname.includes('dms-dev');

          const uploadPath = isDev
            ? '/home/fortytwoev/dms-data/uploads/dev'
            : '/home/fortytwoev/dms-data/uploads/prod';

          // 2. Ensure folder exists before saving
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // 3. Generate Unique Filename (random-number.ext)
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `file-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) {
      throw new HttpException('File not provided', HttpStatus.BAD_REQUEST);
    }

    // 4. Construct the Public URL
    // Nginx is configured to map /uploads/ -> ~/dms-data/uploads/...
    const publicUrl = `/uploads/${file.filename}`;

    // Return the data your Frontend expects
    return {
      url: publicUrl,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  // --- EXISTING METHODS (KEPT AS IS) ---

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFileMetadata(@Body() createFileDto: CreateFileDto) {
    return this.filesService.createFileMetadata(createFileDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createMultipleFiles(
    @Body(new ParseArrayPipe({ items: CreateFileDto }))
    createFileDtos: CreateFileDto[],
  ) {
    console.log(
      'Received bulk create request:',
      JSON.stringify(createFileDtos),
    );
    return this.filesService.createMultipleFiles(createFileDtos);
  }

  @Get()
  async getFiles(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('category') category?: string,
  ) {
    if (!entityType && !entityId) {
      return [];
    }
    if (!entityType || !entityId) {
      throw new Error(
        'Both entityType and entityId are required when filtering',
      );
    }
    return this.filesService.getFiles(entityType, entityId, category);
  }

  @Get(':id')
  async getFileById(@Param('id') id: string) {
    return this.filesService.getFileById(id);
  }

  @Patch('update-entity')
  @HttpCode(HttpStatus.OK)
  async updateEntityAssociation(
    @Body()
    body: { tempEntityId: string; actualEntityId: string; entityType: string },
  ) {
    return this.filesService.updateEntityAssociation(
      body.tempEntityId,
      body.actualEntityId,
      body.entityType,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }

  @Delete('entity/:entityType/:entityId')
  @HttpCode(HttpStatus.OK)
  async deleteFilesByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.filesService.deleteFilesByEntity(entityType, entityId);
  }

  @Delete('category/:entityType/:entityId/:category')
  @HttpCode(HttpStatus.OK)
  async deleteFilesByCategory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('category') category: string,
  ) {
    return this.filesService.deleteFilesByCategory(
      entityType,
      entityId,
      category,
    );
  }
}