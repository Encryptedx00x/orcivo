import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditReadService } from './audit-read.service';
import { AuditController } from './audit.controller';

// @Global(): the audit trail (ADR-015) is cross-cutting — quote, work-order,
// payment, customer, company, invite and appointment services all inject
// AuditService to record their mutations in-transaction. Registered once in
// AppModule. PrismaService is already global (PrismaModule).
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditReadService],
  exports: [AuditService],
})
export class AuditModule {}
