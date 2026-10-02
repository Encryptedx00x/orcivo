import {
  Body,
  Controller,
  HttpCode,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { isValidMercadoPagoSignature } from './mercadopago-webhook.signature';
import { MercadoPagoWebhookResult, MercadoPagoWebhookService } from './mercadopago-webhook.service';

@Controller('webhooks')
export class MercadoPagoWebhookController {
  private readonly secret: string;

  constructor(
    configService: ConfigService,
    private readonly service: MercadoPagoWebhookService,
  ) {
    this.secret = configService.get<string>('MP_WEBHOOK_SECRET', '');
  }

  @Public()
  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query() query: Record<string, string | undefined>,
    @Body() body: Record<string, unknown> | undefined,
  ): Promise<MercadoPagoWebhookResult> {
    const dataId = query['data.id'];
    if (!isValidMercadoPagoSignature({ signature, requestId, dataId, secret: this.secret })) {
      throw new UnauthorizedException('Assinatura de webhook inválida');
    }

    const payload = body && typeof body === 'object' ? body : {};
    const topic =
      query['type'] ?? query['topic'] ?? (payload['type'] as string | undefined) ?? 'unknown';
    const signatureTs = /ts=([^,]+)/.exec(signature ?? '')?.[1] ?? '';

    return this.service.handle({ dataId: dataId as string, topic, body: payload, signatureTs });
  }
}
