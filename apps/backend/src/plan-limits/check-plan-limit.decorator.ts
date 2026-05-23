import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '@orcivo/shared-types';

export const PLAN_LIMIT_KEY = 'plan_limit_feature';
export const CheckPlanLimit = (feature: PlanFeature) =>
  SetMetadata(PLAN_LIMIT_KEY, feature);
