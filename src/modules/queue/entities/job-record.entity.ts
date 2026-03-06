import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
}

@Entity('job_records')
export class JobRecord extends BaseEntity {
  @Index()
  @Column({ name: 'queue_name', length: 100 })
  queueName: string;

  @Column({ name: 'job_id', length: 255 })
  jobId: string;

  @Column({ name: 'job_name', length: 255 })
  jobName: string;

  @Index()
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.WAITING })
  status: JobStatus;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  result: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', default: 3 })
  maxAttempts: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ name: 'initiated_by', type: 'varchar', nullable: true })
  initiatedBy: string;
}
