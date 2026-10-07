'use server';

import { apiFetch } from '../../../lib/api';
import type { Receipt } from '../../../lib/receipts';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const statusOf = (err: unknown) =>
  err instanceof Error ? /\s(\d{3})$/.exec(err.message)?.[1] : undefined;

async function run<T>(fn: () => Promise<T>, fallback: string): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (statusOf(err) === '403') return { ok: false, message: 'Seu perfil não pode fazer isso.' };
    return { ok: false, message: fallback };
  }
}

export async function listReceipts(): Promise<Result<Receipt[]>> {
  return run(
    async () => (await apiFetch<{ data: Receipt[] }>('/payments?receipts=true')).data,
    'Não foi possível carregar os recibos.',
  );
}

export async function getReceipt(id: string): Promise<Result<Receipt>> {
  return run(
    () => apiFetch<Receipt>(`/payments/${encodeURIComponent(id)}`),
    'Não foi possível carregar este recibo.',
  );
}

export interface NewReceiptInput {
  customer_id: string;
  amount: string; // decimal string, never a float
  method: string;
  paid_at: string; // ISO
  description?: string;
  work_order_id?: string;
  quote_id?: string;
}

/** "Novo recibo": a paid payment created from zero (it also shows up in Financeiro). */
export async function createReceipt(input: NewReceiptInput): Promise<Result<Receipt>> {
  return run(async () => {
    const created = await apiFetch<{ id: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        status: 'PAID',
        description: input.description?.trim() || undefined,
      }),
    });
    return apiFetch<Receipt>(`/payments/${created.id}`);
  }, 'Não foi possível criar o recibo.');
}

export async function setReceiptSignature(id: string, apply: boolean): Promise<Result<Receipt>> {
  try {
    return {
      ok: true,
      data: await apiFetch<Receipt>(`/payments/${encodeURIComponent(id)}/receipt-signature`, {
        method: 'PATCH',
        body: JSON.stringify({ apply }),
      }),
    };
  } catch (err) {
    const status = statusOf(err);
    if (status === '404' && apply)
      return { ok: false, message: 'Você ainda não tem assinatura salva. Salve uma primeiro.' };
    if (status === '403') return { ok: false, message: 'Seu perfil não pode fazer isso.' };
    return { ok: false, message: 'Não foi possível mudar a assinatura do recibo.' };
  }
}

export interface LinkOption {
  kind: 'work_order' | 'quote';
  id: string;
  customer_id: string;
  label: string;
}

/** Customers plus their work orders / quotes, for the "Novo recibo" form. */
export async function receiptFormData(): Promise<
  Result<{
    customers: Array<{ id: string; name: string; phone?: string | null }>;
    links: LinkOption[];
  }>
> {
  return run(async () => {
    const [customers, wos, quotes] = await Promise.all([
      apiFetch<{ data: Array<{ id: string; name: string; phone?: string | null }> }>(
        '/customers?limit=500',
      ),
      apiFetch<{
        data: Array<{ id: string; number: number; title: string; customer: { id: string } }>;
      }>('/work-orders?page=1&limit=100'),
      apiFetch<{
        data: Array<{
          id: string;
          number: number;
          title?: string | null;
          status: string;
          customer: { id: string };
        }>;
      }>('/quotes?page=1&limit=100'),
    ]);
    const links: LinkOption[] = [
      ...wos.data.map((w) => ({
        kind: 'work_order' as const,
        id: w.id,
        customer_id: w.customer.id,
        label: `Serviço #${w.number}${w.title ? ` · ${w.title}` : ''}`,
      })),
      ...quotes.data
        .filter((q) => q.status === 'APPROVED' || q.status === 'SENT')
        .map((q) => ({
          kind: 'quote' as const,
          id: q.id,
          customer_id: q.customer.id,
          label: `Orçamento #${q.number}${q.title ? ` · ${q.title}` : ''}`,
        })),
    ];
    return { customers: customers.data, links };
  }, 'Não foi possível carregar clientes e serviços.');
}

export interface ReceiptCompany {
  trade_name: string;
  document?: string | null;
  document_type?: string | null;
  pix_key?: string | null;
  logo_url?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export async function receiptCompany(): Promise<Result<ReceiptCompany>> {
  return run(
    () => apiFetch<ReceiptCompany>('/company/me'),
    'Não foi possível carregar os dados da empresa.',
  );
}
