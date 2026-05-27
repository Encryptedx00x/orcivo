import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { ASAAS_QUEUE } from './webhook-asaas.processor';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookToken: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
    @InjectQueue(ASAAS_QUEUE) private readonly queue: Queue,
  ) {
    this.webhookToken = configService.get<string>('ASAAS_WEBHOOK_TOKEN', '');
  }

  @Public()
  @Post('asaas')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleAsaas(@Headers('asaas-access-token') token: string, @Body() payload: any) {
    // Validar token se configurado
    if (this.webhookToken && token !== this.webhookToken) {
      throw new UnauthorizedException('Token de webhook inválido');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payment = payload?.payment as Record<string, unknown> | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const subscription = payload?.subscription as Record<string, unknown> | undefined;

    const eventId =
      (payment?.id as string) ??
      (subscription?.id as string) ??
      (payload?.id as string) ??
      String(Date.now());
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const eventType = (payload?.event as string) ?? 'UNKNOWN';
    const provider = 'ASAAS';

    // Idempotency key
    const idempotencyKey = createHash('sha256')
      .update(`${provider}:${eventId}:${eventType}`)
      .digest('hex');

    let webhookEvent: { id: string } | null = null;
    try {
      webhookEvent = await this.prisma.webhookEvent.create({
        data: {
          provider,
          event_id: eventId,
          event_type: eventType,
          idempotency_key: idempotencyKey,
          status: 'PENDING',
          raw_payload_json: payload,
        },
      });
    } catch (e: unknown) {
      // Prisma unique constraint violation = duplicata
      if ((e as { code?: string }).code === 'P2002') {
        this.logger.log(`WebhookEvent duplicado (idempotent): ${idempotencyKey}`);
        return { received: true, duplicate: true };
      }
      throw e;
    }

    // Enfileirar processamento assíncrono
    await this.queue.add('process', { webhookEventId: webhookEvent.id, payload });

    return { received: true };
  }
}
