import { z } from 'zod';

const MONEY = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Valor monetário inválido (use string decimal, ex: "180.00")');

export const PaymentMethodEnum = z.enum([
  'PIX',
  'BOLETO',
  'CARTAO',
  'DINHEIRO',
  'TRANSFERENCIA',
  'OUTRO',
]);

export const PaymentStatusEnum = z.enum([
  'PENDING',
  'PAID',
  'OVERDUE',
  'PARTIAL',
  'CANCELLED',
]);

export const PaymentCreateSchema = z.object({
  customer_id: z.string().uuid(),
  work_order_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  description: z.string().max(200).optional(),
  amount: MONEY,
  method: PaymentMethodEnum.optional(),
  status: PaymentStatusEnum.optional(),
  due_date: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
});
export type PaymentCreateDto = z.infer<typeof PaymentCreateSchema>;

export const PaymentSettleSchema = z.object({
  method: PaymentMethodEnum.optional(),
  paid_at: z.string().datetime().optional(),
});
export type PaymentSettleDto = z.infer<typeof PaymentSettleSchema>;

export const PaymentListQuerySchema = z.object({
  status: PaymentStatusEnum.optional(),
  method: PaymentMethodEnum.optional(),
});
export type PaymentListQueryDto = z.infer<typeof PaymentListQuerySchema>;
