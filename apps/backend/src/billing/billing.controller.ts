import { BadRequestException, Controller, Get, Post, Body, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { AdminOnly } from '../auth/decorators/roles.decorator';
import { AllowPastDue } from './allow-past-due.decorator';

const PAID_PLAN_CODES = ['SOLO', 'MAIS', 'EQUIPE'] as const;
const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;
const PAYMENT_METHODS = ['CREDIT_CARD', 'PIX'] as const;

interface CheckoutBody {
  plan_code: (typeof PAID_PLAN_CODES)[number];
  billing_cycle: (typeof BILLING_CYCLES)[number];
  payment_method?: (typeof PAYMENT_METHODS)[number];
  card_token_id?: string;
}

/**
 * plan_code é o código do plano SEM sufixo de ciclo (ex.: 'SOLO', nunca
 * 'SOLO_MONTHLY'); o ciclo vem separado em billing_cycle.
 */
function assertValidCheckoutBody(
  body: Partial<CheckoutBody> | undefined,
): asserts body is CheckoutBody {
  if (!body || !PAID_PLAN_CODES.includes(body.plan_code as CheckoutBody['plan_code'])) {
    throw new BadRequestException('plan_code inválido. Use: SOLO, MAIS ou EQUIPE');
  }
  if (!BILLING_CYCLES.includes(body.billing_cycle as CheckoutBody['billing_cycle'])) {
    throw new BadRequestException('billing_cycle inválido. Use: MONTHLY ou YEARLY');
  }
  if (
    body.payment_method !== undefined &&
    !PAYMENT_METHODS.includes(body.payment_method as NonNullable<CheckoutBody['payment_method']>)
  ) {
    throw new BadRequestException('payment_method inválido. Use: CREDIT_CARD ou PIX');
  }
}

@Controller('billing')
export class BillingController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('subscription')
  getSubscription(@Req() req: TenantRequest) {
    return this.subscriptionService.getOrCreate(req.companyId);
  }

  @Get('subscription-status')
  getSubscriptionStatus(@Req() req: TenantRequest) {
    return this.subscriptionService.getSubscriptionStatus(req.companyId);
  }

  @Get('payments')
  getPayments(@Req() req: TenantRequest) {
    return this.subscriptionService.getPayments(req.companyId);
  }

  @Get('pending-pix')
  getPendingPix(@Req() req: TenantRequest) {
    return this.subscriptionService.getPendingPix(req.companyId);
  }

  // AllowPastDue: quem está inadimplente/bloqueado precisa conseguir contratar
  // de novo para regularizar a assinatura.
  @AllowPastDue()
  @AdminOnly()
  @Post('checkout')
  async createCheckout(@Req() req: TenantRequest, @Body() body: Partial<CheckoutBody>) {
    assertValidCheckoutBody(body);
    return this.subscriptionService.createCheckout(
      req.companyId,
      body.plan_code,
      body.billing_cycle,
      { paymentMethod: body.payment_method, cardTokenId: body.card_token_id },
    );
  }

  @AllowPastDue()
  @AdminOnly()
  @Post('cancel')
  cancelSubscription(@Req() req: TenantRequest) {
    return this.subscriptionService.cancelSubscription(req.companyId);
  }
}
