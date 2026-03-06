import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './constants/audit.constants';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

export interface CreateAuditLogOptions {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  path: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(options: CreateAuditLogOptions): Promise<AuditLog> {
    const record = this.auditLogRepository.create({
      userId: options.userId ?? undefined,
      userEmail: options.userEmail ?? undefined,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId ?? undefined,
      description: options.description,
      oldValue: options.oldValue ?? undefined,
      newValue: options.newValue ?? undefined,
      ipAddress: options.ipAddress ?? undefined,
      userAgent: options.userAgent ?? undefined,
      method: options.method,
      path: options.path,
    });

    const saved = await this.auditLogRepository.save(record);
    this.logger.debug(
      `Audit: ${options.action} ${options.entityType} by ${options.userEmail || 'anonymous'}`,
    );
    return saved as AuditLog;
  }

  async findAll(queryDto: QueryAuditLogsDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;

    const qb = this.auditLogRepository.createQueryBuilder('log');

    if (queryDto.userId) {
      qb.andWhere('log.user_id = :userId', { userId: queryDto.userId });
    }
    if (queryDto.action) {
      qb.andWhere('log.action = :action', { action: queryDto.action });
    }
    if (queryDto.entityType) {
      qb.andWhere('log.entity_type = :entityType', {
        entityType: queryDto.entityType,
      });
    }
    if (queryDto.entityId) {
      qb.andWhere('log.entity_id = :entityId', {
        entityId: queryDto.entityId,
      });
    }
    if (queryDto.startDate) {
      qb.andWhere('log.created_at >= :startDate', {
        startDate: queryDto.startDate,
      });
    }
    if (queryDto.endDate) {
      qb.andWhere('log.created_at <= :endDate', {
        endDate: queryDto.endDate,
      });
    }

    qb.orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

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

  async findOne(id: string): Promise<AuditLog> {
    const record = await this.auditLogRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('Audit log not found');
    }
    return record;
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStats() {
    const byAction = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.action')
      .getRawMany();

    const byEntityType = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.entity_type', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.entity_type')
      .getRawMany();

    return { byAction, byEntityType };
  }

  async cleanOldLogs(olderThanDays: number = 90): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - olderThanDays);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date })
      .execute();

    return result.affected || 0;
  }
}
