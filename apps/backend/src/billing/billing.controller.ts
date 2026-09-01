import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { AdminOnly } from '../auth/decorators/roles.decorator';

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

  @AdminOnly()
  @Post('checkout')
  createCheckout(
    @Req() req: TenantRequest,
    @Body() body: { plan_code: 'SOLO' | 'MAIS' | 'EQUIPE'; billing_cycle: 'MONTHLY' | 'YEARLY' },
  ) {
    return this.subscriptionService.createCheckout(
      req.companyId,
      body.plan_code,
      body.billing_cycle,
    );
  }
}
