import { api, WriteOptions } from './api';

// X-Client-Request-Id incluido automaticamente via api.post (interceptor em api.ts)

export type PaymentMethod = 'PIX' | 'BOLETO' | 'CARTAO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'OUTRO';
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';

export interface PaymentCustomer {
  id: string;
  name: string;
}

export interface Payment {
  id: string;
  amount: string; // string decimal — nunca number
  expected_amount?: string | null;
  overpayment_amount?: string | null;
  overpayment_reason?: string | null;
  method: PaymentMethod | null;
  status: PaymentStatus;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  customer: PaymentCustomer;
}

export interface PaymentCreateInput {
  customer_id: string;
  work_order_id: string;
  description?: string;
  amount: string; // string decimal — nunca number
  method: PaymentMethod;
  status: 'PENDING' | 'PAID';
  due_date?: string;
  paid_at?: string;
  overpayment_confirmed?: boolean;
  overpayment_reason?: string;
}

export const paymentService = {
  async fetchAll(): Promise<Payment[]> {
    const res = await api.get<{ data: Payment[] }>('/payments');
    return res.data;
  },

  async create(dto: PaymentCreateInput, opts?: WriteOptions): Promise<Payment> {
    return api.post<Payment>('/payments', dto, opts);
  },

  async settle(
    id: string,
    input: {
      received_amount: string;
      method?: PaymentMethod;
      overpayment_confirmed?: boolean;
      overpayment_reason?: string;
    },
    opts?: WriteOptions,
  ): Promise<Payment> {
    return api.patch<Payment>(`/payments/${id}/settle`, input, opts);
  },
};
