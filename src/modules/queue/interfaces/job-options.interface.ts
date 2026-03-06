export interface AddJobOptions {
  queueName: string;
  jobName: string;
  payload: Record<string, any>;
  initiatedBy?: string;
  delay?: number;
  priority?: number;
  attempts?: number;
}
