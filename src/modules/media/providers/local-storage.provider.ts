import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider } from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('upload.dir', './uploads');
  }

  async save(file: Express.Multer.File, filename: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const relativePath = path.join(year, month);
    const fullDir = path.join(this.uploadDir, relativePath);

    await fs.mkdir(fullDir, { recursive: true });

    const filePath = path.join(fullDir, filename);
    await fs.writeFile(filePath, file.buffer);

    return path.join(relativePath, filename);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.uploadDir, filePath);
    return fs.readFile(fullPath);
  }
}
