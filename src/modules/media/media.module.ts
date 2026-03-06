import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { Media } from './entities/media.entity';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [
    MediaService,
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
export class MediaModule {}
