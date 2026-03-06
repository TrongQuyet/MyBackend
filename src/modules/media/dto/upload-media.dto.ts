import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadMediaDto {
  @ApiPropertyOptional({ example: 'avatar', description: 'Media category' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
