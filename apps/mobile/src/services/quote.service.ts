import { api } from './api';

// X-Client-Request-Id incluido automaticamente via api.post / api.patch (interceptor em api.ts)

export interface QuoteItem {
  id: string;
  description: string;
  quantity: string;   // sempre string decimal
  unit_price: string; // sempre string decimal
  total: string;      // sempre string decimal
  catalog_item_id?: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface Quote {
  id: string;
  number: number;
  status: QuoteStatus;
  title?: string;
  subtotal: string;       // sempre string decimal
  discount_value: string; // sempre string decimal
  total: string;          // sempre string decimal
  approval_token?: string;
  pdf_url?: string;
  customer: { id: string; name: string; phone?: string };
  items: QuoteItem[];
}

export interface QuoteCreateItemDto {
  catalog_item_id?: string;
  description: string;
  quantity: string;   // string decimal — nunca number
  unit_price: string; // string decimal — nunca number
}

export interface QuoteCreateDto {
  customer_id: string;
  title?: string;
  valid_until?: string;
  items: QuoteCreateItemDto[];
}

export const quoteService = {
  async fetchQuotes(page = 1): Promise<{ data: Quote[]; page: number }> {
    return api.get<{ data: Quote[]; page: number }>(`/quotes?page=${page}`);
  },

  async fetchQuote(id: string): Promise<Quote> {
    return api.get<Quote>(`/quotes/${id}`);
  },

  async createQuote(dto: QuoteCreateDto): Promise<Quote> {
    return api.post<Quote>('/quotes', dto);
  },

  async sendQuote(id: string): Promise<{ approvalUrl: string; pdf_url: string }> {
    return api.post<{ approvalUrl: string; pdf_url: string }>(`/quotes/${id}/send`, {});
  },

  async cancelQuote(id: string, reason?: string): Promise<Quote> {
    return api.patch<Quote>(`/quotes/${id}/cancel`, { reason });
  },
};
