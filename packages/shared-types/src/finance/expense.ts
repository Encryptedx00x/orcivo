import { z } from 'zod';

/** Cost categories a technician actually uses (key stored in the DB). */
export const EXPENSE_CATEGORIES = {
  MATERIAL: 'Material e peças',
  FERRAMENTAS: 'Ferramentas',
  COMBUSTIVEL: 'Combustível e deslocamento',
  ALIMENTACAO: 'Alimentação',
  VEICULO: 'Manutenção do veículo',
  AJUDANTE: 'Ajudante / funcionário',
  FORNECEDOR: 'Fornecedor / terceirizado',
  ALUGUEL: 'Aluguel',
  IMPOSTOS: 'Impostos e taxas',
  TELEFONE: 'Telefone e internet',
  MARKETING: 'Marketing',
  PRO_LABORE: 'Pró-labore',
  OUTROS: 'Outros',
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

const MONEY = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Valor inválido (ex.: "80.00")');
const METHOD = z.enum(['PIX', 'BOLETO', 'CARTAO', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO']);

export const ExpenseCreateSchema = z.object({
  category: z.enum(Object.keys(EXPENSE_CATEGORIES) as [ExpenseCategory, ...ExpenseCategory[]]),
  description: z.string().max(200).optional(),
  amount: MONEY,
  /** PAID needs paid_at (defaults to now); PENDING may have a due date. */
  status: z.enum(['PENDING', 'PAID']).default('PAID'),
  due_date: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
  method: METHOD.optional(),
  customer_id: z.string().uuid().optional(),
  quote_id: z.string().uuid().optional(),
  work_order_id: z.string().uuid().optional(),
});
export type ExpenseCreateDto = z.infer<typeof ExpenseCreateSchema>;

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial();
export type ExpenseUpdateDto = z.infer<typeof ExpenseUpdateSchema>;

/** Period totals for the Financeiro summary (string decimals). */
export interface FinanceSummary {
  revenue: { received: string; receivable: string; overdue: string };
  costs: { paid: string; planned: string; overdue: string };
  /** received − paid costs. */
  result: string;
}
