export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
}

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  action: AuditAction;
  entityType: string;
  description?: string;
}
