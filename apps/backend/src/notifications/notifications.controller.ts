import { Controller, Get, Header, Param, ParseUUIDPipe, Patch, Query, Req } from '@nestjs/common';
import { NotificationQuerySchema, type NotificationQuery } from '@orcivo/shared-types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(NotificationQuerySchema)) query: NotificationQuery,
  ) {
    return this.notificationsService.findAll(req.companyId, req.user.userId, query);
  }

  @Patch('read-all')
  @Header('Cache-Control', 'private, no-store')
  markAllRead(@Req() req: TenantRequest) {
    return this.notificationsService.markAllRead(req.companyId, req.user.userId);
  }

  @Patch(':auditLogId/read')
  @Header('Cache-Control', 'private, no-store')
  markRead(
    @Req() req: TenantRequest,
    @Param('auditLogId', new ParseUUIDPipe()) auditLogId: string,
  ) {
    return this.notificationsService.markRead(req.companyId, req.user.userId, auditLogId);
  }
}
