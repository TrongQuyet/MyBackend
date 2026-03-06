import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { StorageProvider } from '../interfaces/storage-provider.interface';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('upload.s3Region', 'us-east-1');
    this.bucket = this.configService.get<string>('upload.s3Bucket', '');

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('upload.s3AccessKey', ''),
        secretAccessKey: this.configService.get<string>('upload.s3SecretKey', ''),
      },
    });
  }

  async save(file: Express.Multer.File, filename: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const key = `${year}/${month}/${filename}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  async delete(filePath: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      }),
    );
  }

  async getFile(filePath: string): Promise<Buffer> {
    const response = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      }),
    );

    if (!response.Body) {
      throw new Error('Empty response from S3');
    }
    return Buffer.from(await response.Body.transformToByteArray());
  }
}
