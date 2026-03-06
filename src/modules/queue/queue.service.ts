import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { JobRecord, JobStatus } from './entities/job-record.entity';
import { AddJobOptions } from './interfaces/job-options.interface';
import { QueryJobsDto } from './dto/query-jobs.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    @InjectRepository(JobRecord)
    private readonly jobRecordRepository: Repository<JobRecord>,
    private readonly configService: ConfigService,
  ) {}

  registerQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
    this.logger.log(`Queue registered: ${name}`);
  }

  getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new NotFoundException(`Queue '${name}' is not registered`);
    }
    return queue;
  }

  async addJob(options: AddJobOptions): Promise<JobRecord> {
    const queue = this.getQueue(options.queueName);

    const defaultAttempts = this.configService.get<number>(
      'queue.defaultJobOptions.attempts',
      3,
    );
    const maxAttempts = options.attempts || defaultAttempts;

    // Save to DB first
    const jobRecord = this.jobRecordRepository.create({
      queueName: options.queueName,
      jobId: '',
      jobName: options.jobName,
      status: JobStatus.WAITING,
      payload: options.payload,
      maxAttempts,
      initiatedBy: options.initiatedBy ?? undefined,
    });
    const saved = await this.jobRecordRepository.save(jobRecord) as JobRecord;

    try {
      const bullJob = await queue.add(options.jobName, options.payload, {
        delay: options.delay,
        priority: options.priority,
        attempts: maxAttempts,
      });

      saved.jobId = bullJob.id ?? '';
      return this.jobRecordRepository.save(saved) as Promise<JobRecord>;
    } catch (error) {
      saved.status = JobStatus.FAILED;
      saved.errorMessage =
        error instanceof Error ? error.message : 'Failed to dispatch job';
      saved.failedAt = new Date();
      await this.jobRecordRepository.save(saved);
      throw error;
    }
  }

  async findAll(queryDto: QueryJobsDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const where: any = {};

    if (queryDto.queueName) {
      where.queueName = queryDto.queueName;
    }
    if (queryDto.jobName) {
      where.jobName = queryDto.jobName;
    }
    if (queryDto.status) {
      where.status = queryDto.status;
    }

    const [data, total] = await this.jobRecordRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<JobRecord> {
    const record = await this.jobRecordRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Job record not found');
    }
    return record;
  }

  async retryJob(id: string): Promise<JobRecord> {
    const record = await this.findOne(id);

    if (record.status !== JobStatus.FAILED) {
      throw new BadRequestException('Only failed jobs can be retried');
    }

    const queue = this.getQueue(record.queueName);

    const bullJob = await queue.add(record.jobName, record.payload, {
      attempts: record.maxAttempts,
    });

    record.jobId = bullJob.id ?? '';
    record.status = JobStatus.WAITING;
    record.errorMessage = undefined as any;
    record.failedAt = undefined as any;
    record.attemptCount = 0;

    return this.jobRecordRepository.save(record) as Promise<JobRecord>;
  }

  async cleanOldJobs(olderThanDays: number = 30): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);

    const result = await this.jobRecordRepository
      .createQueryBuilder()
      .delete()
      .where('status IN (:...statuses)', {
        statuses: [JobStatus.COMPLETED, JobStatus.FAILED],
      })
      .andWhere('created_at < :date', { date })
      .execute();

    return result.affected || 0;
  }

  async getQueueStats(
    queueName: string,
  ): Promise<Record<string, number>> {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  // --- Internal methods called by BaseProcessor ---

  async markJobActive(
    queueName: string,
    bullJobId: string,
    attempt: number,
  ): Promise<void> {
    await this.jobRecordRepository.update(
      { queueName, jobId: bullJobId },
      {
        status: JobStatus.ACTIVE,
        attemptCount: attempt + 1,
        startedAt: new Date(),
      },
    );
  }

  async markJobCompleted(
    queueName: string,
    bullJobId: string,
    result: any,
  ): Promise<void> {
    await this.jobRecordRepository.update(
      { queueName, jobId: bullJobId },
      {
        status: JobStatus.COMPLETED,
        result: result || null,
        completedAt: new Date(),
      },
    );
  }

  async markJobFailed(
    queueName: string,
    bullJobId: string,
    errorMessage: string,
    attempt: number,
  ): Promise<void> {
    await this.jobRecordRepository.update(
      { queueName, jobId: bullJobId },
      {
        status: JobStatus.FAILED,
        errorMessage,
        attemptCount: attempt + 1,
        failedAt: new Date(),
      },
    );
  }
}
