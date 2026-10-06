// Modo fácil: a thin data layer over the same endpoints the full screens use
// (mirrors apps/web/app/facil/actions.ts). No business rules live here.
import type { QuoteCreateDto } from '@orcivo/shared-types';
import { api } from '../services/api';
import { workOrderService } from '../services/work-order.service';

export interface EasySummary {
  user: { name: string };
  company: { trade_name: string };
  kpis: {
    agenda_today: number;
    os_pending: number;
    quotes_pending: number;
    receivables_pending_total: string;
    receivables_overdue_count: number;
  };
  upcoming: Array<{ id: string; title: string; starts_at: string }>;
}
export interface EasyClient {
  id: string;
  name: string;
  phone: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
}
export interface EasyCatalogItem {
  id: string;
  name: string;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string;
}
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export interface EasyQuote {
  id: string;
  number: number;
  status: QuoteStatus;
  total: string;
  created_at?: string;
  customer: { id: string; name: string; phone?: string | null };
}
export type ApprovalMethod =
  | 'APPROVE_BUTTON'
  | 'TYPED_NAME'
  | 'DRAWN_SIGNATURE'
  | 'PHOTO_SIGNATURE';
export interface EasyWorkOrder {
  id: string;
  number: number;
  title: string;
  notes?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  scheduled_at?: string | null;
  customer: { id: string; name: string };
  photos?: Array<{ id: string; photo_stage: 'BEFORE' | 'DURING' | 'AFTER'; file_url: string }>;
}
export interface EasyAppointment {
  id: string;
  title: string;
  type: string | null;
  starts_at: string;
  ends_at: string | null;
  customer: { id: string; name: string } | null;
}
export interface EasyPayment {
  id: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';
  method: string | null;
  description?: string | null;
  due_date: string | null;
  paid_at: string | null;
  customer?: { id: string; name: string } | null;
  receipt_number?: number | null;
  work_order?: { id: string; number: number } | null;
  quote?: { id: string; number: number } | null;
}

const list = <T>(res: { data: T[] } | T[]): T[] => (Array.isArray(res) ? res : res.data);
const enc = encodeURIComponent;

/** Multipart file part from a local file URI (camera, gallery or a rendered signature). */
export function filePart(uri: string): Blob {
  const png = uri.toLowerCase().endsWith('.png');
  return {
    uri,
    type: png ? 'image/png' : 'image/jpeg',
    name: png ? 'assinatura.png' : 'assinatura.jpg',
  } as unknown as Blob;
}

/** Friendly message for a failed call (403 = role can't do it). */
export function errorText(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : '';
  if (/ 403$/.test(msg)) return 'Seu perfil não pode fazer isso.';
  if (/ 401$/.test(msg)) return 'Sua sessão expirou. Entre novamente.';
  return fallback;
}

export const easy = {
  summary: () => api.get<EasySummary>('/dashboard/summary'),

  clients: async () =>
    list(await api.get<{ data: EasyClient[] } | EasyClient[]>('/customers?limit=500')),
  client: (id: string) => api.get<EasyClient>(`/customers/${enc(id)}`),
  createClient: (name: string, phone: string) =>
    api.post<EasyClient>('/customers', {
      name: name.trim(),
      type: 'PF',
      phone: phone.replace(/\D/g, ''),
    }),
  updateClient: (id: string, name: string, phone: string) =>
    api.patch<EasyClient>(`/customers/${enc(id)}`, {
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
    }),
  /** Soft delete (backend keeps history and audit). */
  deleteClient: (id: string) => api.delete(`/customers/${enc(id)}`),

  catalog: () => api.get<EasyCatalogItem[]>('/catalog'),
  createCatalogItem: (name: string, price: string) =>
    api.post<EasyCatalogItem>('/catalog', {
      name: name.trim(),
      type: 'SERVICE',
      sale_price: price,
    }),

  quotes: async () => list(await api.get<{ data: EasyQuote[] }>('/quotes?page=1&limit=100')),
  quoteShare: async (id: string) => {
    const q = await api.get<{
      number: number;
      approval_token?: string | null;
      customer?: { name?: string; phone?: string | null };
    }>(`/quotes/${enc(id)}`);
    return { token: q.approval_token ?? null, phone: q.customer?.phone ?? null, number: q.number };
  },
  createQuote: (dto: QuoteCreateDto, idempotencyKey: string) =>
    api.post<{ id: string; number: number }>('/quotes', dto, { idempotencyKey }),
  /** Send with the saved signature (apply=true) or none. */
  sendQuote: (id: string, apply: boolean) =>
    api.post<{ approvalUrl?: string; approval_token?: string }>(`/quotes/${enc(id)}/send`, {
      apply_signature: apply,
    }),
  /** Send with a signature used only on this quote (never saved for reuse). */
  sendQuoteOnce: (id: string, uri: string) => {
    const form = new FormData();
    form.append('file', filePart(uri));
    return api.postFormData<{ approvalUrl?: string; approval_token?: string }>(
      `/quotes/${enc(id)}/send/signature-once`,
      form,
    );
  },
  /** Lifecycle actions (reason required by the backend; reopen/correct are admin-only). */
  quoteAction: (id: string, action: 'cancel' | 'reject' | 'reopen' | 'correct', reason: string) =>
    api.patch(`/quotes/${enc(id)}/${action}`, { reason }),

  signature: () => api.get<{ signature_url: string | null }>('/users/me/signature'),
  saveSignature: (uri: string) => {
    const form = new FormData();
    form.append('file', filePart(uri));
    return api.putFormData<{ signature_url: string | null }>('/users/me/signature', form);
  },

  approvalMethods: async () =>
    (await api.get<{ allowed_approval_methods?: ApprovalMethod[] }>('/company/me'))
      .allowed_approval_methods ?? (['APPROVE_BUTTON'] as ApprovalMethod[]),
  setApprovalMethods: (methods: ApprovalMethod[]) =>
    api.patch('/company/approval-methods', { methods }),

  workOrders: async () =>
    list(await api.get<{ data: EasyWorkOrder[] }>('/work-orders?page=1&limit=100')),
  workOrder: (id: string) => api.get<EasyWorkOrder>(`/work-orders/${enc(id)}`),
  startWorkOrder: (id: string) => api.patch<EasyWorkOrder>(`/work-orders/${enc(id)}/start`, {}),
  completeWorkOrder: (id: string) =>
    api.patch<EasyWorkOrder>(`/work-orders/${enc(id)}/complete`, {}),
  workOrderAction: (id: string, action: 'cancel' | 'reopen', reason: string) =>
    api.patch(`/work-orders/${enc(id)}/${action}`, { reason }),
  uploadPhoto: (id: string, uri: string, stage: 'BEFORE' | 'DURING' | 'AFTER') =>
    workOrderService.uploadPhoto(id, uri, stage),

  appointments: async (fromIso: string, toIso: string) =>
    list(
      await api.get<{ data: EasyAppointment[] } | EasyAppointment[]>(
        `/appointments?from=${enc(fromIso)}&to=${enc(toIso)}`,
      ),
    ),
  createAppointment: (input: {
    title: string;
    type: string;
    customer_id?: string;
    starts_at: string;
    ends_at: string;
  }) => api.post<EasyAppointment>('/appointments', input),
  updateAppointment: (
    id: string,
    input: {
      title?: string;
      type?: string;
      customer_id?: string | null;
      starts_at?: string;
      ends_at?: string | null;
    },
  ) => api.patch<EasyAppointment>(`/appointments/${enc(id)}`, input),
  deleteAppointment: (id: string) => api.delete(`/appointments/${enc(id)}`),

  payments: async () => list(await api.get<{ data: EasyPayment[] } | EasyPayment[]>('/payments')),
  settlePayment: (id: string, method: string) =>
    api.patch<EasyPayment>(`/payments/${enc(id)}/settle`, {
      method,
      paid_at: new Date().toISOString(),
    }),
  /** Value / due date change; the backend requires a justification (audit). */
  updatePayment: (
    id: string,
    input: { amount?: string; due_date?: string | null; method?: string; justification: string },
  ) => api.patch<EasyPayment>(`/payments/${enc(id)}`, input),
  deletePayment: (id: string, justification: string) =>
    api.delete(`/payments/${enc(id)}`, undefined, { justification }),

  // ── Recibos (a paid payment with receipt_number) ──
  receipts: async () => list(await api.get<{ data: EasyReceipt[] }>('/payments?receipts=true')),
  receipt: (id: string) => api.get<EasyReceipt>(`/payments/${enc(id)}`),
  createReceipt: async (input: {
    customer_id: string;
    amount: string;
    method: string;
    paid_at: string;
    description?: string;
    work_order_id?: string;
    quote_id?: string;
  }) => {
    const created = await api.post<{ id: string }>('/payments', {
      ...input,
      status: 'PAID',
      description: input.description?.trim() || undefined,
    });
    return api.get<EasyReceipt>(`/payments/${enc(created.id)}`);
  },
  setReceiptSignature: (id: string, apply: boolean) =>
    api.patch<EasyReceipt>(`/payments/${enc(id)}/receipt-signature`, { apply }),

  // ── Empresa / Configurações ──
  company: () => api.get<EasyCompany>('/company/me'),
  updateCompany: (body: Record<string, unknown>) => api.patch<EasyCompany>('/company/me', body),
  uploadLogo: (uri: string) => {
    const form = new FormData();
    const png = uri.toLowerCase().endsWith('.png');
    form.append('file', {
      uri,
      type: png ? 'image/png' : 'image/jpeg',
      name: png ? 'logo.png' : 'logo.jpg',
    } as unknown as Blob);
    return api.putFormData<EasyCompany>('/company/logo', form);
  },
  removeLogo: () => api.delete<EasyCompany>('/company/logo'),

  updateCatalogItem: (id: string, name: string, price: string) =>
    api.patch<EasyCatalogItem>(`/catalog/${enc(id)}`, { name: name.trim(), sale_price: price }),
  deleteCatalogItem: (id: string) => api.delete(`/catalog/${enc(id)}`),
  workOrders100: async () =>
    list(await api.get<{ data: EasyWorkOrder[] }>('/work-orders?page=1&limit=100')),
};

export interface EasyReceipt {
  id: string;
  receipt_number: number;
  amount: string;
  method: string | null;
  description: string | null;
  paid_at: string | null;
  created_at: string;
  receipt_signature_key: string | null;
  receipt_signer_name: string | null;
  receipt_signature_url?: string | null;
  customer: { id: string; name: string; phone?: string | null };
  work_order: { id: string; number: number; title?: string | null } | null;
  quote: { id: string; number: number; title?: string | null } | null;
}

export interface EasyCompany {
  trade_name: string;
  document_type: 'CPF' | 'CNPJ' | null;
  document: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  pix_key: string | null;
  logo_url: string | null;
  plan_code: string;
  allowed_approval_methods?: ApprovalMethod[];
  quote_default_terms: string | null;
  quote_default_validity_days: number | null;
}

export const RECEIPT_METHODS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
];
export const methodLabel = (m: string | null) =>
  RECEIPT_METHODS.find((x) => x.value === m)?.label ?? 'Não informado';
export const receiptNo = (n: number) => String(n).padStart(4, '0');
export function receiptRef(r: Pick<EasyReceipt, 'description' | 'work_order' | 'quote'>): string {
  const origin = r.work_order
    ? `Serviço #${r.work_order.number}`
    : r.quote
      ? `Orçamento #${r.quote.number}`
      : null;
  if (r.description && origin) return `${r.description} (${origin})`;
  return r.description || origin || 'serviços prestados';
}
export const receiptOrigin = (r: Pick<EasyReceipt, 'work_order' | 'quote'>) =>
  r.work_order
    ? `Serviço #${r.work_order.number}`
    : r.quote
      ? `Orçamento #${r.quote.number}`
      : 'Avulso';
