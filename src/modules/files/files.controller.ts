import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFileMetadata(@Body() createFileDto: CreateFileDto) {
    return this.filesService.createFileMetadata(createFileDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async createMultipleFiles(@Body() createFileDtos: CreateFileDto[]) {
    return this.filesService.createMultipleFiles(createFileDtos);
  }

  @Get()
  async getFiles(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('category') category?: string,
  ) {
    if (!entityType || !entityId) {
      throw new Error('entityType and entityId are required');
    }
    return this.filesService.getFiles(entityType, entityId, category);
  }

  @Get(':id')
  async getFileById(@Param('id') id: string) {
    return this.filesService.getFileById(id);
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
    return this.filesService.deleteFilesByCategory(entityType, entityId, category);
  }
}

