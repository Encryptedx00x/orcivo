import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { PlanLimitsModule } from './plan-limits/plan-limits.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { BillingModule } from './billing/billing.module';
import { WebhookModule } from './webhook/webhook.module';
import { InviteModule } from './invite/invite.module';
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
    RedisModule,
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: SubscriptionStatusGuard },
  ],
})
export class AppModule {}
