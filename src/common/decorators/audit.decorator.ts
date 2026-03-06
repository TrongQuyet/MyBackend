import { SetMetadata } from '@nestjs/common';
import {
  AUDIT_METADATA_KEY,
  AuditAction,
} from '../../modules/audit-log/constants/audit.constants';
import type { AuditMetadata } from '../../modules/audit-log/constants/audit.constants';

export const Audit = (
  action: AuditAction,
  entityType: string,
  description?: string,
) =>
  SetMetadata(AUDIT_METADATA_KEY, {
    action,
    entityType,
    description,
  } as AuditMetadata);
