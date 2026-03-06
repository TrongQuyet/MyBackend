import { registerAs } from '@nestjs/config';

export default registerAs('upload', () => ({
  dir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: Number.parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '5242880', 10),
  allowedMimeTypes: (
    process.env.UPLOAD_ALLOWED_MIME_TYPES ||
    'image/jpeg,image/png,image/gif,image/webp,application/pdf'
  ).split(','),
  storageProvider: process.env.UPLOAD_STORAGE_PROVIDER || 'local',
  s3Bucket: process.env.AWS_S3_BUCKET || '',
  s3Region: process.env.AWS_S3_REGION || 'us-east-1',
  s3AccessKey: process.env.AWS_S3_ACCESS_KEY || '',
  s3SecretKey: process.env.AWS_S3_SECRET_KEY || '',
}));
