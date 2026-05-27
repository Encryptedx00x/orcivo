import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { WebhookAsaasProcessor } from './webhook-asaas.processor';
import { ASAAS_QUEUE } from './webhook-asaas.processor';

@Module({
  imports: [BullModule.registerQueue({ name: ASAAS_QUEUE })],
  controllers: [WebhookController],
  providers: [WebhookAsaasProcessor],
})
export class WebhookModule {}
