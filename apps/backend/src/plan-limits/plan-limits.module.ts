import { Global, Module } from '@nestjs/common';
import { CheckPlanLimitGuard } from './check-plan-limit.guard';
import { PlanLimitsService } from './plan-limits.service';

@Global()
@Module({
  providers: [PlanLimitsService, CheckPlanLimitGuard],
  exports: [PlanLimitsService, CheckPlanLimitGuard],
})
export class PlanLimitsModule {}
