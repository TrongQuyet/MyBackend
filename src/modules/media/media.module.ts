import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { Media } from './entities/media.entity';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import {
  MEDIA_QUEUE,
  ImageProcessingProcessor,
} from './processors/image-processing.processor';
import { QueueService } from '../queue/queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    BullModule.registerQueue({ name: MEDIA_QUEUE }),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    ImageProcessingProcessor,
    LocalStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (
        config: ConfigService,
        local: LocalStorageProvider,
        s3: S3StorageProvider,
      ) => {
        const provider = config.get<string>('upload.storageProvider', 'local');
        switch (provider) {
          case 's3':
            return s3;
          case 'local':
          default:
            return local;
        }
      },
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
    },
  ],
  exports: [MediaService],
})
export class MediaModule implements OnModuleInit {
  constructor(
    @InjectQueue(MEDIA_QUEUE) private readonly mediaQueue: Queue,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    this.queueService.registerQueue(MEDIA_QUEUE, this.mediaQueue);
  }
}
