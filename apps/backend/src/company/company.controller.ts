import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { CompanyService } from './company.service';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { SubscriptionService } from '../billing/subscription.service';
import { AllowPastDue } from '../billing/allow-past-due.decorator';
import { AdminOnly } from '../auth/decorators/roles.decorator';

// Tenant context set by the global TenantGuard — see ADR-014.
interface TenantRequest {
  companyId: string;
}

@Controller('company')
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

  @AdminOnly()
  @Get('members')
  getMembers(@Req() req: TenantRequest) {
    return this.companyService.getMembers(req.companyId);
  }

  @AdminOnly()
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
