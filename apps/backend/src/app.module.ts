import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { CatalogModule } from './catalog/catalog.module';
import { CustomerModule } from './customer/customer.module';
import { QuoteModule } from './quote/quote.module';
import { WorkOrderModule } from './work-order/work-order.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantGuard } from './auth/guards/tenant.guard';
import { RoleGuard } from './auth/guards/role.guard';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { PlanLimitsModule } from './plan-limits/plan-limits.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TenantModule } from './common/tenant/tenant.module';
import { StorageModule } from './storage/storage.module';
import { BillingModule } from './billing/billing.module';
import { WebhookModule } from './webhook/webhook.module';
import { InviteModule } from './invite/invite.module';
import { PaymentModule } from './payment/payment.module';
import { AppointmentModule } from './appointment/appointment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { SubscriptionStatusGuard } from './billing/subscription-status.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    RedisModule,
    TenantModule,
    StorageModule,
    MailModule,
    PlanLimitsModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    HealthModule,
    AuthModule,
    CompanyModule,
    CustomerModule,
    CatalogModule,
    QuoteModule,
    WorkOrderModule,
    BillingModule,
    WebhookModule,
    InviteModule,
    PaymentModule,
    AppointmentModule,
    DashboardModule,
  ],
  providers: [
    // Order matters (guards run top-to-bottom). See ADR-014.
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // identity; honours @Public()
    { provide: APP_GUARD, useClass: TenantGuard }, // req.companyId + req.role; fail-closed
    { provide: APP_GUARD, useClass: SubscriptionStatusGuard }, // past-due block (now sees companyId)
    { provide: APP_GUARD, useClass: RoleGuard }, // enforces @Roles(...)
    // Runs after guards, so req.companyId is set. Dedupes mobile mutations that
    // carry X-Client-Request-Id. See 03.1-P02-SUMMARY.md § T11.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
