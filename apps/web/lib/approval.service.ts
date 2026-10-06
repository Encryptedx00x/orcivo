const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface PublicQuoteItem {
  description: string;
  quantity: string;
  unit_price: string;
  total: string;
}

export interface PublicQuote {
  id: string;
  number: number;
  title?: string;
  status: string;
  subtotal: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: string;
  total: string;
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
