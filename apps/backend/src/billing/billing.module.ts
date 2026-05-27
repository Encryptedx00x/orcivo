import { Module } from '@nestjs/common';
import { AsaasClient } from './asaas.client';
import { SubscriptionService } from './subscription.service';
import { BillingController } from './billing.controller';

@Module({
  providers: [AsaasClient, SubscriptionService],
  controllers: [BillingController],
  exports: [SubscriptionService],
})
export class BillingModule {}
