import { Global, Module } from '@nestjs/common';
import { CheckPlanLimitGuard } from './check-plan-limit.guard';
import { PlanLimitsService } from './plan-limits.service';
import { PlanUsageController } from './plan-usage.controller';

@Global()
@Module({
  controllers: [PlanUsageController],
  providers: [PlanLimitsService, CheckPlanLimitGuard],
  exports: [PlanLimitsService, CheckPlanLimitGuard],
})
export class PlanLimitsModule {}
