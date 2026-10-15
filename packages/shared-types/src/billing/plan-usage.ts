import { z } from 'zod';
import { SubscriptionStatusEnum } from './subscription.dto';

const PlanCodeRef = z.enum(['LIVRE', 'SOLO', 'MAIS', 'EQUIPE']);

export const PlanUsageResourceCodeSchema = z.enum([
  'CUSTOMERS',
  'QUOTES_MONTH',
  'WORK_ORDERS_MONTH',
  'MEMBERS',
]);
export type PlanUsageResourceCode = z.infer<typeof PlanUsageResourceCodeSchema>;

export const PlanUsageResourceStateSchema = z.enum([
  'NORMAL',
  'ATTENTION',
  'REACHED',
  'EXCEEDED',
  'FAIR_USE',
  'UNAVAILABLE',
]);
export type PlanUsageResourceState = z.infer<typeof PlanUsageResourceStateSchema>;

export const PlanUsageFeatureCodeSchema = z.enum([
  'LOGO',
  'PDF_WITHOUT_WATERMARK',
  'REPORTS',
  'CONTRACTS',
]);
export type PlanUsageFeatureCode = z.infer<typeof PlanUsageFeatureCodeSchema>;

export const PlanUsageFeatureStateSchema = z.enum(['AVAILABLE', 'LOCKED', 'NOT_IMPLEMENTED']);
export type PlanUsageFeatureState = z.infer<typeof PlanUsageFeatureStateSchema>;

export const PlanUsageResourceSchema = z.object({
  code: PlanUsageResourceCodeSchema,
  label: z.string().min(1),
  used: z.number().int().nonnegative().nullable(),
  limit: z.number().int().nonnegative().nullable(),
  remaining: z.number().int().nonnegative().nullable(),
  period: z.enum(['TOTAL', 'CALENDAR_MONTH']),
  state: PlanUsageResourceStateSchema,
});
export type PlanUsageResource = z.infer<typeof PlanUsageResourceSchema>;

export const PlanUsageFeatureSchema = z.object({
  code: PlanUsageFeatureCodeSchema,
  label: z.string().min(1),
  state: PlanUsageFeatureStateSchema,
});
export type PlanUsageFeature = z.infer<typeof PlanUsageFeatureSchema>;

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const PlanUsageResponseSchema = z.object({
  plan: z.object({
    code: PlanCodeRef,
    name: z.string().min(1),
    subscription_status: SubscriptionStatusEnum.nullable(),
    is_blocked: z.boolean(),
  }),
  billing_period: z
    .object({
      start: IsoDateTimeSchema.nullable(),
      end: IsoDateTimeSchema.nullable(),
      renews_at: IsoDateTimeSchema.nullable(),
    })
    .nullable(),
  usage_period: z.object({
    start: IsoDateTimeSchema,
    end: IsoDateTimeSchema,
    reset_at: IsoDateTimeSchema,
  }),
  resources: z.array(PlanUsageResourceSchema),
  features: z.array(PlanUsageFeatureSchema),
  generated_at: IsoDateTimeSchema,
});
export type PlanUsageResponse = z.infer<typeof PlanUsageResponseSchema>;

export function planUsageState(used: number | null, limit: number | null): PlanUsageResourceState {
  if (used === null) return 'UNAVAILABLE';
  if (limit === null) return 'FAIR_USE';
  if (used > limit) return 'EXCEEDED';
  if (used === limit) return 'REACHED';
  if (used * 100 >= limit * 80) return 'ATTENTION';
  return 'NORMAL';
}

export function planUsageRemaining(used: number | null, limit: number | null): number | null {
  if (used === null || limit === null) return null;
  return Math.max(limit - used, 0);
}
