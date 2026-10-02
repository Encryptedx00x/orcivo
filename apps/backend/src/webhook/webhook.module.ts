import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { MercadoPagoWebhookController } from './mercadopago-webhook.controller';
import { MercadoPagoWebhookService } from './mercadopago-webhook.service';

@Module({
  imports: [BillingModule],
  controllers: [MercadoPagoWebhookController],
  providers: [MercadoPagoWebhookService],
})
export class WebhookModule {}
