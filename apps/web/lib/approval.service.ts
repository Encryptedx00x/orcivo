const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface PublicQuoteItem {
  description: string;
  quantity: string;
  /** Absent when the technician hid the prices. */
  unit_price?: string;
  total?: string;
}

export interface PublicQuote {
  id: string;
  number: number;
  title?: string;
  status: string;
  /** Title and what is shown; hidden values arrive as null. */
  doc_options?: { title?: 'ORCAMENTO' | 'PROPOSTA' | 'PEDIDO' } | null;
  subtotal: string | null;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: string | null;
  total: string | null;
  valid_until?: string;
  notes?: string;
  customer: { name: string; phone?: string };
  items: PublicQuoteItem[];
  company: {
    trade_name: string;
    allowed_approval_methods: (
      | 'APPROVE_BUTTON'
      | 'TYPED_NAME'
      | 'DRAWN_SIGNATURE'
      | 'PHOTO_SIGNATURE'
    )[];
  };
}

export interface ApproveDto {
  approval_method: 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE' | 'PHOTO_SIGNATURE';
  typed_name?: string;
  signature?: string; // imagem base64 para desenho ou foto
}

export const approvalService = {
  async fetchPublicQuote(token: string): Promise<PublicQuote> {
    const res = await fetch(`${API_URL}/quotes/public/${token}`);
    if (!res.ok) throw new Error('Orçamento não encontrado ou link inválido');
    return res.json() as Promise<PublicQuote>;
  },

  /** URL do PDF já gerado deste orçamento — escopo restrito ao token da aprovação. */
  getPdfUrl(token: string): string {
    return `${API_URL}/quotes/public/${token}/pdf`;
  },

  /** The client declines on the public link; the reason is optional. */
  async rejectQuote(token: string, reason?: string): Promise<{ status: string }> {
    const res = await fetch(`${API_URL}/quotes/public/${token}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? 'Não foi possível registrar agora.');
    }
    return res.json() as Promise<{ status: string }>;
  },

  async approveQuote(token: string, dto: ApproveDto): Promise<{ status: string }> {
    const res = await fetch(`${API_URL}/quotes/public/${token}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? 'Erro ao processar aprovação');
    }
    return res.json() as Promise<{ status: string }>;
  },
};
