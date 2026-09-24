import { Module } from '@nestjs/common';
import { AsaasPaymentProvider } from './asaas.payment-provider';
import { PAYMENT_PROVIDER } from './payment-provider.token';
import { SubscriptionService } from './subscription.service';
import { BillingController } from './billing.controller';

@Module({
  providers: [
    AsaasPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: AsaasPaymentProvider },
    SubscriptionService,
  ],
  controllers: [BillingController],
  exports: [SubscriptionService],
})
export class BillingModule {}
