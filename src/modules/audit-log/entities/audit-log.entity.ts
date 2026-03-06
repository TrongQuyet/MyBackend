import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuditAction } from '../constants/audit.constants';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId: string;

  @Column({ name: 'user_email', type: 'varchar', nullable: true })
  userEmail: string;

  @Index()
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Index()
  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue: Record<string, any>;

  @Column({ name: 'new_value', type: 'json', nullable: true })
  newValue: Record<string, any>;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 500 })
  path: string;
}
