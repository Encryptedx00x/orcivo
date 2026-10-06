'use server';

// Modo fácil: a thin, explicit data layer over the same backend endpoints the
// standard screens use. No business rules live here — only fetch/compose.
import type { QuoteCreateDto } from '@orcivo/shared-types';
import { apiFetch } from '../../lib/api';

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; message: string };
export type Result<T> = Ok<T> | Err;

async function run<T>(fn: () => Promise<T>, fallback: string): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const status = err instanceof Error ? /\s(\d{3})$/.exec(err.message)?.[1] : undefined;
    if (status === '403') return { ok: false, message: 'Seu perfil não pode fazer isso.' };
    return { ok: false, message: fallback };
  }
}

// ── Home ──────────────────────────────────────────────────────────────
export interface EasySummary {
  user: { name: string };
  company: { trade_name: string; plan_code: string };
  kpis: {
    agenda_today: number;
    os_pending: number;
    quotes_pending: number;
    receivables_pending_total: string;
    receivables_overdue_count: number;
  };
  upcoming: Array<{ id: string; title: string; starts_at: string }>;
}
export async function loadSummary(): Promise<Result<EasySummary>> {
  return run(
    () => apiFetch<EasySummary>('/dashboard/summary'),
    'Não foi possível carregar o seu dia.',
  );
}

// ── Clients ───────────────────────────────────────────────────────────
export interface EasyClient {
  id: string;
  name: string;
  phone: string | null;
  city?: string | null;
  state?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  created_at?: string;
}
export async function listClients(): Promise<Result<EasyClient[]>> {
  return run(async () => {
    const res = await apiFetch<{ data: EasyClient[] } | EasyClient[]>('/customers?limit=500');
    return Array.isArray(res) ? res : res.data;
  }, 'Não foi possível carregar seus clientes.');
}
export async function getClient(id: string): Promise<Result<EasyClient>> {
  return run(
    () => apiFetch<EasyClient>(`/customers/${encodeURIComponent(id)}`),
    'Não foi possível carregar este cliente.',
  );
}
export async function createClient(input: {
  name: string;
  phone: string;
}): Promise<Result<EasyClient>> {
  return run(
    () =>
      apiFetch<EasyClient>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: input.name.trim(),
          type: 'PF',
          phone: input.phone.replace(/\D/g, ''),
        }),
      }),
    'Não foi possível salvar o cliente.',
  );
}

/** Soft delete — quotes, services and audit history stay. */
export async function deleteClient(id: string): Promise<Result<true>> {
  return run(async () => {
    await apiFetch(`/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true as const;
  }, 'Não foi possível excluir o cliente.');
}

// ── Catalog ("Meus serviços e preços") ────────────────────────────────
export interface EasyCatalogItem {
  id: string;
  name: string;
  type: 'SERVICE' | 'PRODUCT';
  unit_price: string;
}
export async function listCatalog(): Promise<Result<EasyCatalogItem[]>> {
  return run(
    () => apiFetch<EasyCatalogItem[]>('/catalog'),
    'Não foi possível carregar seus serviços e preços.',
  );
}
export async function createCatalogItem(input: {
  name: string;
  price: string;
}): Promise<Result<EasyCatalogItem>> {
  return run(
    () =>
      apiFetch<EasyCatalogItem>('/catalog', {
        method: 'POST',
        body: JSON.stringify({ name: input.name.trim(), type: 'SERVICE', sale_price: input.price }),
      }),
    'Não foi possível guardar o item.',
  );
}

// ── Quotes ────────────────────────────────────────────────────────────
export interface EasyQuote {
  id: string;
  number: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  total: string;
  created_at?: string;
  updated_at?: string;
  approval_token?: string | null;
  customer: { id: string; name: string; phone?: string | null };
}
export async function listQuotes(): Promise<Result<EasyQuote[]>> {
  return run(async () => {
    const res = await apiFetch<{ data: EasyQuote[] }>('/quotes?page=1&limit=100');
    return res.data;
  }, 'Não foi possível carregar seus orçamentos.');
}
export async function createQuote(
  dto: QuoteCreateDto,
): Promise<Result<{ id: string; number: number }>> {
  return run(
    () =>
      apiFetch<{ id: string; number: number }>('/quotes', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    'Não foi possível guardar o orçamento.',
  );
}

// ── Approval methods (company setting, admin-only in the backend) ─────
export type ApprovalMethod =
  | 'APPROVE_BUTTON'
  | 'TYPED_NAME'
  | 'DRAWN_SIGNATURE'
  | 'PHOTO_SIGNATURE';
export async function getApprovalMethods(): Promise<Result<ApprovalMethod[]>> {
  return run(async () => {
    const me = await apiFetch<{ allowed_approval_methods?: ApprovalMethod[] }>('/company/me');
    return me.allowed_approval_methods ?? ['APPROVE_BUTTON'];
  }, 'Não foi possível carregar as formas de aprovação.');
}
export async function setApprovalMethods(
  methods: ApprovalMethod[],
): Promise<Result<ApprovalMethod[]>> {
  return run(async () => {
    await apiFetch('/company/approval-methods', {
      method: 'PATCH',
      body: JSON.stringify({ methods }),
    });
    return methods;
  }, 'Não foi possível salvar as formas de aprovação.');
}

// ── Services (work orders) ────────────────────────────────────────────
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
export async function listWorkOrders(): Promise<Result<EasyWorkOrder[]>> {
  return run(async () => {
    const res = await apiFetch<{ data: EasyWorkOrder[] }>('/work-orders?page=1&limit=100');
    return res.data;
  }, 'Não foi possível carregar os serviços.');
}
export async function getWorkOrder(id: string): Promise<Result<EasyWorkOrder>> {
  return run(
    () => apiFetch<EasyWorkOrder>(`/work-orders/${encodeURIComponent(id)}`),
    'Não foi possível carregar este serviço.',
  );
}
export async function startWorkOrder(id: string): Promise<Result<EasyWorkOrder>> {
  return run(
    () =>
      apiFetch<EasyWorkOrder>(`/work-orders/${encodeURIComponent(id)}/start`, { method: 'PATCH' }),
    'Não foi possível começar o serviço.',
  );
}
export async function completeWorkOrder(id: string): Promise<Result<EasyWorkOrder>> {
  return run(
    () =>
      apiFetch<EasyWorkOrder>(`/work-orders/${encodeURIComponent(id)}/complete`, {
        method: 'PATCH',
      }),
    'Não foi possível finalizar o serviço.',
  );
}

// ── Agenda ────────────────────────────────────────────────────────────
export interface EasyAppointment {
  id: string;
  title: string;
  type: string | null;
  starts_at: string;
  ends_at: string | null;
  customer: { id: string; name: string } | null;
}
export async function listAppointments(
  fromIso: string,
  toIso: string,
): Promise<Result<EasyAppointment[]>> {
  return run(async () => {
    const qs = `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
    const res = await apiFetch<{ data: EasyAppointment[] } | EasyAppointment[]>(
      `/appointments?${qs}`,
    );
    return Array.isArray(res) ? res : res.data;
  }, 'Não foi possível carregar a agenda.');
}
export async function createAppointment(input: {
  title: string;
  type: string;
  customer_id?: string;
  starts_at: string;
  ends_at: string;
}): Promise<Result<EasyAppointment>> {
  return run(
    () =>
      apiFetch<EasyAppointment>('/appointments', { method: 'POST', body: JSON.stringify(input) }),
    'Não foi possível marcar o horário.',
  );
}
export async function deleteAppointment(id: string): Promise<Result<true>> {
  return run(async () => {
    await apiFetch(`/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(
      (e: Error) => {
        // DELETE may answer 204 with no body; apiFetch's res.json() then throws — treat as success.
        if (!/\s\d{3}$/.test(e.message)) return null;
        throw e;
      },
    );
    return true as const;
  }, 'Não foi possível desmarcar.');
}

// ── Money ─────────────────────────────────────────────────────────────
export interface EasyPayment {
  id: string;
  amount: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';
  method: string | null;
  description?: string | null;
  due_date: string | null;
  paid_at: string | null;
  customer?: { id: string; name: string } | null;
  work_order?: { id: string; number: number } | null;
  quote?: { id: string; number: number } | null;
}
export async function listPayments(): Promise<Result<EasyPayment[]>> {
  return run(async () => {
    const res = await apiFetch<{ data: EasyPayment[] } | EasyPayment[]>('/payments');
    return Array.isArray(res) ? res : res.data;
  }, 'Não foi possível carregar o financeiro.');
}
export async function settlePayment(id: string, method: string): Promise<Result<EasyPayment>> {
  return run(
    () =>
      apiFetch<EasyPayment>(`/payments/${encodeURIComponent(id)}/settle`, {
        method: 'PATCH',
        body: JSON.stringify({ method, paid_at: new Date().toISOString() }),
      }),
    'Não foi possível registrar o pagamento.',
  );
}
export async function updateAppointment(
  id: string,
  input: {
    title?: string;
    type?: string;
    customer_id?: string | null;
    starts_at?: string;
    ends_at?: string | null;
  },
): Promise<Result<EasyAppointment>> {
  return run(
    () =>
      apiFetch<EasyAppointment>(`/appointments/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    'Não foi possível remarcar.',
  );
}
/** Approval link + customer phone of a sent quote (the list endpoint omits both). */
export async function getQuoteShare(
  id: string,
): Promise<Result<{ token: string | null; phone: string | null; number: number }>> {
  return run(async () => {
    const q = await apiFetch<{
      number: number;
      approval_token?: string | null;
      customer?: { phone?: string | null };
    }>(`/quotes/${encodeURIComponent(id)}`);
    return { token: q.approval_token ?? null, phone: q.customer?.phone ?? null, number: q.number };
  }, 'Não foi possível preparar o reenvio.');
}
