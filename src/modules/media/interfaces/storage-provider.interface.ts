export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  save(file: Express.Multer.File, filename: string): Promise<string>;
  delete(filePath: string): Promise<void>;
  getFile(filePath: string): Promise<Buffer>;
}
