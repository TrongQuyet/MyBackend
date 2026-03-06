import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { CreateJobDto } from './dto/create-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Queue')
@ApiBearerAuth()
@Controller('admin/jobs')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @ApiOperation({ summary: 'List all jobs (paginated, filterable)' })
  findAll(@Query() queryDto: QueryJobsDto) {
    return this.queueService.findAll(queryDto);
  }

  @Get('stats/:queueName')
  @ApiOperation({ summary: 'Get queue statistics' })
  getStats(@Param('queueName') queueName: string) {
    return this.queueService.getQueueStats(queueName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Manually dispatch a job' })
  createJob(@Body() createJobDto: CreateJobDto, @CurrentUser() user: any) {
    return this.queueService.addJob({
      ...createJobDto,
      initiatedBy: user.id,
    });
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  retryJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.queueService.retryJob(id);
  }

  @Delete('clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean old completed/failed jobs' })
  async cleanJobs(@Query('olderThanDays') olderThanDays: number = 30) {
    const deleted = await this.queueService.cleanOldJobs(olderThanDays);
    return { deleted };
  }
}
