import { Module } from '@nestjs/common';
import { MercadoPagoPaymentProvider } from './mercadopago.payment-provider';
import { PAYMENT_PROVIDER } from './payment-provider.token';
import { SubscriptionService } from './subscription.service';
import { BillingController } from './billing.controller';

@Module({
  providers: [
    { provide: PAYMENT_PROVIDER, useClass: MercadoPagoPaymentProvider },
    SubscriptionService,
  ],
  controllers: [BillingController],
  exports: [SubscriptionService],
})
export class BillingModule {}
