import { apiFetch } from './api';
import type { QuoteCreateDto } from '@orcivo/shared-types';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: string;   // string decimal
  unit_price: string; // string decimal
  total: string;      // string decimal
  catalog_item_id?: string;
}

export interface QuoteApproval {
  approval_method: string;
  typed_name?: string;
  approved_at: string;
}

export interface Quote {
  id: string;
  number: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  title?: string;
  notes?: string;
  valid_until?: string;
  subtotal: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: string;
  total: string;
  pdf_url?: string;
  approval_token?: string;
  customer: { id: string; name: string; phone?: string };
  items: QuoteItem[];
  approval?: QuoteApproval;
  created_at?: string;
}

export interface QuoteListResponse {
  data: Quote[];
  page: number;
}

export const quoteService = {
  fetchQuotes: (page = 1) =>
    apiFetch<QuoteListResponse>(`/quotes?page=${page}`),

  fetchQuote: (id: string) =>
    apiFetch<Quote>(`/quotes/${id}`),

  createQuote: (dto: QuoteCreateDto) =>
    apiFetch<Quote>('/quotes', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  sendQuote: (id: string) =>
    apiFetch<Quote & { approvalUrl: string }>(`/quotes/${id}/send`, {
      method: 'POST',
    }),

  cancelQuote: (id: string, reason?: string) =>
    apiFetch<Quote>(`/quotes/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};
