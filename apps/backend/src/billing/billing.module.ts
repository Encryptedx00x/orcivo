import { Module } from '@nestjs/common';
import { MercadoPagoPaymentProvider } from './mercadopago.payment-provider';
import { PAYMENT_PROVIDER } from './payment-provider.token';
import { SubscriptionService } from './subscription.service';
import { BillingController } from './billing.controller';

@Module({
  providers: [
    MercadoPagoPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MercadoPagoPaymentProvider },
    SubscriptionService,
  ],
  controllers: [BillingController],
  exports: [SubscriptionService, MercadoPagoPaymentProvider],
})
export class BillingModule {}
