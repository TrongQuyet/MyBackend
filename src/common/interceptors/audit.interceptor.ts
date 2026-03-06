import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import {
  AUDIT_METADATA_KEY,
} from '../../modules/audit-log/constants/audit.constants';
import type { AuditMetadata } from '../../modules/audit-log/constants/audit.constants';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditMetadata>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const user = request.user;
          const entityId =
            request.params?.id || response?.id || response?.data?.id;

          await this.auditLogService.log({
            userId: user?.id,
            userEmail: user?.email,
            action: metadata.action,
            entityType: metadata.entityType,
            entityId: entityId ? String(entityId) : undefined,
            description:
              metadata.description ||
              `${metadata.action} ${metadata.entityType}`,
            ipAddress: request.ip || request.connection?.remoteAddress,
            userAgent: request.headers?.['user-agent'],
            method: request.method,
            path: request.url,
          });
        } catch (error) {
          this.logger.warn(
            `Failed to create audit log: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );
  }
}
