import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CompanyService } from './company.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { SubscriptionService } from '../billing/subscription.service';
import { AllowPastDue } from '../billing/allow-past-due.decorator';

interface TenantRequest {
  companyId: string;
}

@Controller('company')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('me')
  getMe(@Req() req: TenantRequest) {
    return this.companyService.findCurrent(req.companyId);
  }

  @Patch('approval-methods')
  updateApprovalMethods(
    @Req() req: TenantRequest,
    @Body() body: { methods: ('APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE')[] },
  ) {
    return this.companyService.updateApprovalMethods(req.companyId, body.methods);
  }

  @Get('me/plan-limits')
  getPlanLimits(@Req() req: TenantRequest) {
    return this.planLimitsService.getLimits(req.companyId);
  }

  @Get('me/dashboard')
  getDashboard(@Req() req: TenantRequest) {
    return this.companyService.getDashboard(req.companyId);
  }

  @AllowPastDue()
  @Get('me/subscription-status')
  getSubscriptionStatus(@Req() req: TenantRequest) {
    return this.subscriptionService.getSubscriptionStatus(req.companyId);
  }
}
