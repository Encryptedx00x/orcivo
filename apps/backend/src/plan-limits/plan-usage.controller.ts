import { Controller, Get, Req } from '@nestjs/common';
import { AllowPastDue } from '../billing/allow-past-due.decorator';
import type { TenantRequest } from '../common/interfaces/tenant-request.interface';
import { PlanLimitsService } from './plan-limits.service';

@Controller('company')
export class PlanUsageController {
  constructor(private readonly planLimitsService: PlanLimitsService) {}

  @AllowPastDue()
  @Get('me/usage')
  getUsage(@Req() req: TenantRequest) {
    return this.planLimitsService.getUsage(req.companyId);
  }
}
