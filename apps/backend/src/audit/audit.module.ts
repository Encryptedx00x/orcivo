import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

// @Global(): the audit trail (ADR-015) is cross-cutting — quote, work-order,
// payment, customer, company, invite and appointment services all inject
// AuditService to record their mutations in-transaction. Registered once in
// AppModule. PrismaService is already global (PrismaModule).
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
