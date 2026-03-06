import { WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueService } from '../queue.service';

export abstract class BaseProcessor extends WorkerHost {
  protected abstract readonly logger: Logger;

  constructor(protected readonly queueService: QueueService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const queueName = job.queueName;
    const jobId = job.id ?? '';

    await this.queueService.markJobActive(queueName, jobId, job.attemptsMade);

    try {
      const result = await this.handleJob(job);
      await this.queueService.markJobCompleted(queueName, jobId, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.queueService.markJobFailed(
        queueName,
        jobId,
        message,
        job.attemptsMade,
      );
      throw error;
    }
  }

  protected abstract handleJob(job: Job): Promise<any>;
}
