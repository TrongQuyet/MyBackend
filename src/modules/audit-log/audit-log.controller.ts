import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('admin/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (paginated, filterable)' })
  findAll(@Query() queryDto: QueryAuditLogsDto) {
    return this.auditLogService.findAll(queryDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  getStats() {
    return this.auditLogService.getStats();
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit logs for a specific entity' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogService.findOne(id);
  }

  @Delete('clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean old audit logs' })
  async cleanLogs(@Query('olderThanDays') olderThanDays: number = 90) {
    const deleted = await this.auditLogService.cleanOldLogs(olderThanDays);
    return { deleted };
  }
}
