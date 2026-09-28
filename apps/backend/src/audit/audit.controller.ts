import { Controller, Get, Header, Query, Req } from '@nestjs/common';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import type { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuditQuerySchema, type AuditQuery } from './audit-query.dto';
import { AuditReadService } from './audit-read.service';

// Global JWT, tenant and role guards enforce ADR-015 §4 before any read.
@AdminOnly()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditReadService: AuditReadService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  findAll(
    @Req() req: TenantRequest,
    @Query(new ZodValidationPipe(AuditQuerySchema)) query: AuditQuery,
  ) {
    return this.auditReadService.findAll(req.companyId, query);
  }
}
