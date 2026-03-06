import { IsString, IsOptional, IsObject, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'media-processing' })
  @IsString()
  queueName: string;

  @ApiProperty({ example: 'generate-thumbnail' })
  @IsString()
  jobName: string;

  @ApiProperty({ example: { mediaId: 'uuid-here' } })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({ example: 0, description: 'Delay in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  delay?: number;

  @ApiPropertyOptional({ example: 0, description: 'Job priority (lower = higher priority)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
