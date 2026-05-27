import { z } from 'zod';

export const SubscriptionStatusEnum = z.enum([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'BLOCKED',
  'CANCELLED',
  'EXPIRED',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

// PlanCode local ref (sem re-exportar — o PlanCodeEnum principal está em index.ts)
const PlanCodeRef = z.enum(['LIVRE', 'SOLO', 'MAIS', 'EQUIPE']);

export const PlanLimitsResponseSchema = z.object({
  plan_code: PlanCodeRef,
  customers_max: z.number().nullable(),
  quotes_per_month: z.number().nullable(),
  work_orders_per_month: z.number().nullable(),
  members_max: z.number(),
  has_logo: z.boolean(),
  pdf_watermark: z.boolean(),
  has_reports: z.boolean(),
  has_contracts: z.boolean(),
  subscription_status: SubscriptionStatusEnum.nullable(),
  is_blocked: z.boolean(),
});
export type PlanLimitsResponse = z.infer<typeof PlanLimitsResponseSchema>;

export const SubscriptionStatusResponseSchema = z.object({
  status: SubscriptionStatusEnum.nullable(),
  plan_code: PlanCodeRef,
  is_blocked: z.boolean(),
  is_past_due: z.boolean(),
  message: z.string().nullable(),
});
export type SubscriptionStatusResponse = z.infer<typeof SubscriptionStatusResponseSchema>;

export const CreateCheckoutSessionSchema = z.object({
  plan_code: z.enum(['SOLO', 'MAIS', 'EQUIPE']),
  billing_cycle: z.enum(['MONTHLY', 'YEARLY']),
});
export type CreateCheckoutSessionDto = z.infer<typeof CreateCheckoutSessionSchema>;
