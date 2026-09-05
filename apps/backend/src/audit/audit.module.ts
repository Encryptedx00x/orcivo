import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

// Not @Global(): consuming feature modules (quote, work-order, payment,
// customer, company, invite, appointment, ...) import this module explicitly
// to inject AuditService. PrismaService is already global (PrismaModule), so
// no extra imports are needed here.
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
