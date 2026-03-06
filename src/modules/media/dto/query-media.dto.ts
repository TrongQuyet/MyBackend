import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMediaDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'avatar' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string;
}
