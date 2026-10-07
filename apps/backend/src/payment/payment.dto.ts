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

export const PaymentStatusEnum = z.enum(['PENDING', 'PAID', 'OVERDUE', 'PARTIAL', 'CANCELLED']);

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

const JUSTIFICATION = z.string().trim().min(3).max(500);

export const PaymentUpdateSchema = z
  .object({
    amount: MONEY.optional(),
    method: PaymentMethodEnum.optional(),
    status: PaymentStatusEnum.optional(),
    due_date: z.string().datetime().nullable().optional(),
    paid_at: z.string().datetime().nullable().optional(),
    justification: JUSTIFICATION,
  })
  .refine(
    (value) =>
      value.amount !== undefined ||
      value.method !== undefined ||
      value.status !== undefined ||
      value.due_date !== undefined ||
      value.paid_at !== undefined,
    { message: 'Informe ao menos um campo para atualizar o recebimento.' },
  );
export type PaymentUpdateDto = z.infer<typeof PaymentUpdateSchema>;

export const PaymentDeleteSchema = z.object({ justification: JUSTIFICATION });
export type PaymentDeleteDto = z.infer<typeof PaymentDeleteSchema>;

export const PaymentListQuerySchema = z.object({
  status: PaymentStatusEnum.optional(),
  method: PaymentMethodEnum.optional(),
  work_order_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  /** Only paid payments that carry a receipt number (Recibos). */
  receipts: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type PaymentListQueryDto = Omit<z.infer<typeof PaymentListQuerySchema>, 'receipts'> & {
  receipts?: boolean;
};

export const ReceiptSignatureSchema = z.object({ apply: z.boolean() });
