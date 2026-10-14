import { z } from 'zod';
import { ReceiptDocOptionsSchema } from '@orcivo/shared-types';
export { ReceiptSignatureUpdateSchema as ReceiptSignatureSchema } from '@orcivo/shared-types';

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

const OverpaymentConfirmationSchema = z.object({
  overpayment_confirmed: z.boolean().optional(),
  overpayment_reason: z.string().trim().max(500).optional(),
});

export const PaymentCreateSchema = z
  .object({
    customer_id: z.string().uuid(),
    work_order_id: z.string().uuid().optional(),
    quote_id: z.string().uuid().optional(),
    description: z.string().max(200).optional(),
    receipt_additional_info: z.string().trim().max(2000).optional(),
    receipt_doc_options: ReceiptDocOptionsSchema.optional(),
    amount: MONEY,
    method: PaymentMethodEnum.optional(),
    status: PaymentStatusEnum.optional(),
    due_date: z.string().datetime().optional(),
    paid_at: z.string().datetime().optional(),
  })
  .merge(OverpaymentConfirmationSchema);
export type PaymentCreateDto = z.infer<typeof PaymentCreateSchema>;

export const PaymentSettleSchema = z
  .object({
    method: PaymentMethodEnum.optional(),
    paid_at: z.string().datetime().optional(),
    received_amount: MONEY.optional(),
    receipt_additional_info: z.string().trim().max(2000).nullable().optional(),
    receipt_doc_options: ReceiptDocOptionsSchema.optional(),
  })
  .merge(OverpaymentConfirmationSchema);
export type PaymentSettleDto = z.infer<typeof PaymentSettleSchema>;

const JUSTIFICATION = z.string().trim().min(3).max(500);

export const PaymentUpdateSchema = z
  .object({
    amount: MONEY.optional(),
    method: PaymentMethodEnum.optional(),
    status: PaymentStatusEnum.optional(),
    due_date: z.string().datetime().nullable().optional(),
    paid_at: z.string().datetime().nullable().optional(),
    receipt_additional_info: z.string().trim().max(2000).nullable().optional(),
    receipt_doc_options: ReceiptDocOptionsSchema.optional(),
    justification: JUSTIFICATION,
  })
  .merge(OverpaymentConfirmationSchema)
  .refine(
    (value) =>
      value.amount !== undefined ||
      value.method !== undefined ||
      value.status !== undefined ||
      value.due_date !== undefined ||
      value.paid_at !== undefined ||
      value.receipt_additional_info !== undefined ||
      value.receipt_doc_options !== undefined,
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
