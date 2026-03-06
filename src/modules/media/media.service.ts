import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { Media } from './entities/media.entity';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import type { StorageProvider } from './interfaces/storage-provider.interface';
import { QueryMediaDto } from './dto/query-media.dto';
import { Role } from '../../common/constants/app.constants';
import { QueueService } from '../queue/queue.service';
import { MEDIA_QUEUE } from './processors/image-processing.processor';

@Injectable()
export class MediaService {
  private readonly allowedMimeTypes: string[];
  private readonly maxFileSize: number;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {
    this.allowedMimeTypes = this.configService.get<string[]>(
      'upload.allowedMimeTypes',
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    );
    this.maxFileSize = this.configService.get<number>(
      'upload.maxFileSize',
      5242880,
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    category?: string,
  ): Promise<Media> {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the limit of ${this.maxFileSize} bytes`,
      );
    }

    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const storedPath = await this.storageProvider.save(file, filename);

    const media = this.mediaRepository.create({
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: storedPath,
      category: category || 'general',
      uploadedById: userId,
    });

    const saved = await this.mediaRepository.save(media);

    // Dispatch background processing for images
    if (file.mimetype.startsWith('image/')) {
      await this.queueService.addJob({
        queueName: MEDIA_QUEUE,
        jobName: 'generate-thumbnail',
        payload: { mediaId: saved.id },
        initiatedBy: userId,
      });
    }

    return saved;
  }

  async uploadFiles(
    files: Express.Multer.File[],
    userId: string,
    category?: string,
  ): Promise<Media[]> {
    const results: Media[] = [];
    for (const file of files) {
      const media = await this.uploadFile(file, userId, category);
      results.push(media);
    }
    return results;
  }

  async findAllByUser(userId: string, queryDto: QueryMediaDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const where: any = { uploadedById: userId };

    if (queryDto.category) {
      where.category = queryDto.category;
    }
    if (queryDto.mimeType) {
      where.mimeType = queryDto.mimeType;
    }

    const [data, total] = await this.mediaRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({ where: { id } });
    if (!media) {
      throw new NotFoundException('Media not found');
    }
    return media;
  }

  async getFileBuffer(
    id: string,
  ): Promise<{ buffer: Buffer; media: Media }> {
    const media = await this.findOne(id);
    const buffer = await this.storageProvider.getFile(media.path);
    return { buffer, media };
  }

  async remove(id: string, userId: string, userRole?: Role): Promise<void> {
    const media = await this.findOne(id);

    if (media.uploadedById !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own media');
    }

    await this.storageProvider.delete(media.path);
    await this.mediaRepository.remove(media);
  }
}
