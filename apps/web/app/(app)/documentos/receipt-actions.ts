'use server';

import { cookies } from 'next/headers';
import { apiFetch } from '../../../lib/api';
import type { Receipt } from '../../../lib/receipts';

const API_URL = process.env['API_URL'] ?? 'http://localhost:3000';

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

export async function getReceiptSignatureAvailability(): Promise<Result<boolean>> {
  return run(async () => {
    const data = await apiFetch<{ signature_url: string | null }>('/users/me/signature');
    return !!data.signature_url;
  }, 'Não foi possível consultar sua assinatura salva.');
}

/** Attaches an image only to this receipt; the reusable signature remains untouched. */
export async function setReceiptSignatureOnce(
  id: string,
  formData: FormData,
): Promise<Result<Receipt>> {
  try {
    const token = (await cookies()).get('access_token')?.value;
    if (!token) return { ok: false, message: 'Sua sessão expirou. Entre novamente.' };
    const response = await fetch(
      `${API_URL}/payments/${encodeURIComponent(id)}/receipt-signature/once`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        cache: 'no-store',
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      return {
        ok: false,
        message: body?.message ?? 'Não foi possível usar esta assinatura no recibo.',
      };
    }
    return { ok: true, data: (await response.json()) as Receipt };
  } catch {
    return { ok: false, message: 'Não foi possível usar esta assinatura no recibo.' };
  }
}

export interface LinkOption {
  kind: 'work_order' | 'quote';
  id: string;
  customer_id: string;
  label: string;
}

export async function receiptCustomerOptions(
  search = '',
  page = 1,
): Promise<
  Result<{
    customers: Array<{ id: string; name: string; phone?: string | null }>;
    hasMore: boolean;
  }>
> {
  return run(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search.trim()) params.set('search', search.trim());
    const customers = await apiFetch<{
      data: Array<{ id: string; name: string; phone?: string | null }>;
    }>(`/customers?${params.toString()}`);
    return { customers: customers.data, hasMore: customers.data.length === 10 };
  }, 'Não foi possível carregar os clientes.');
}

export async function receiptLinkOptions(
  customerId: string,
  search = '',
  limit = 8,
): Promise<Result<{ links: LinkOption[]; hasMore: boolean }>> {
  return run(async () => {
    const params = new URLSearchParams({
      page: '1',
      limit: String(Math.min(Math.max(limit, 1), 100)),
      customer_id: customerId,
    });
    if (search.trim()) params.set('search', search.trim());
    const [wos, quotes] = await Promise.all([
      apiFetch<{
        data: Array<{ id: string; number: number; title: string; customer: { id: string } }>;
      }>(`/work-orders?${params.toString()}`),
      apiFetch<{
        data: Array<{
          id: string;
          number: number;
          title?: string | null;
          status: string;
          customer: { id: string };
        }>;
      }>(`/quotes?${params.toString()}`),
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
    return {
      links,
      hasMore: wos.data.length === limit || quotes.data.length === limit,
    };
  }, 'Não foi possível carregar serviços e orçamentos.');
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
  instagram?: string | null;
  website?: string | null;
  professional_registration?: string | null;
  document_footer?: string | null;
}

export async function receiptCompany(): Promise<Result<ReceiptCompany>> {
  return run(
    () => apiFetch<ReceiptCompany>('/company/me'),
    'Não foi possível carregar os dados da empresa.',
  );
}
