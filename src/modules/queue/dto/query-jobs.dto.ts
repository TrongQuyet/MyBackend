import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JobStatus } from '../entities/job-record.entity';

export class QueryJobsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'media-processing' })
  @IsOptional()
  @IsString()
  queueName?: string;

  @ApiPropertyOptional({ example: 'generate-thumbnail' })
  @IsOptional()
  @IsString()
  jobName?: string;

  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
