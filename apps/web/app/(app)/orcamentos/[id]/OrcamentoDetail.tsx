'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Download, X, Send } from 'lucide-react';
import { formatMoney, multiplyDecimal } from '@orcivo/shared-types';
import { openWhatsApp } from '../../../../lib/whatsapp';
import type { Quote } from '../../../../lib/quote.service';

const STATUS_LABEL: Record<Quote['status'], string> = {
  DRAFT:     'Rascunho',
  SENT:      'Enviado',
  APPROVED:  'Aprovado',
  REJECTED:  'Recusado',
  CANCELLED: 'Cancelado',
  EXPIRED:   'Expirado',
};

const STATUS_STYLE: Record<Quote['status'], React.CSSProperties> = {
  DRAFT:     { backgroundColor: '#F3F4F6', color: '#64748B' },
  SENT:      { backgroundColor: '#FEF3C7', color: '#92400E' },
  APPROVED:  { backgroundColor: '#D1FAE5', color: '#065F46' },
  REJECTED:  { backgroundColor: '#FEE2E2', color: '#991B1B' },
  CANCELLED: { backgroundColor: '#E5E7EB', color: '#334155' },
  EXPIRED:   { backgroundColor: '#FFEDD5', color: '#9A3412' },
};

interface Props {
  quote: Quote;
}

export default function OrcamentoDetail({ quote: initialQuote }: Props): JSX.Element {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const webUrl = process.env['NEXT_PUBLIC_WEB_URL'] ?? '';

  function getApprovalUrl(q: Quote): string {
    if (approvalUrl) return approvalUrl;
    if (q.approval_token) return `${webUrl}/approve/${q.approval_token}`;
    return '';
  }

  async function handleSend() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao enviar orçamento.' }));
        throw new Error(err.message ?? 'Erro ao enviar orçamento.');
      }
      const data = await res.json() as Quote & { approvalUrl?: string };
      setQuote(data);
      if (data.approvalUrl) setApprovalUrl(data.approvalUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes/${quote.id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao cancelar orçamento.' }));
        throw new Error(err.message ?? 'Erro ao cancelar orçamento.');
      }
      const data = await res.json() as Quote;
      setQuote(data);
      setShowCancelDialog(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  const currentApprovalUrl = getApprovalUrl(quote);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', marginBottom: 4 }}>
            Orçamento #{quote.number}{quote.title ? ` — ${quote.title}` : ''}
          </h1>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 20,
            fontSize: 13, fontWeight: 600, ...STATUS_STYLE[quote.status],
          }}>
            {STATUS_LABEL[quote.status]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, '_blank', 'noopener,noreferrer')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#334155' }}
          >
            <Download size={15} /> Baixar PDF
          </button>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#334155' }}
          >
            Voltar
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '12px 16px', color: '#DC2626', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Client info */}
      <div style={card}>
        <h2 style={sectionTitle}>Cliente</h2>
        <p style={{ fontWeight: 600, fontSize: 15 }}>{quote.customer.name}</p>
        {quote.customer.phone && (
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{quote.customer.phone}</p>
        )}
      </div>

      {/* Items */}
      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={sectionTitle}>Itens</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <th style={th}>Descrição</th>
              <th style={{ ...th, textAlign: 'right' }}>Qtd</th>
              <th style={{ ...th, textAlign: 'right' }}>Preço unit.</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={td}>{item.description}</td>
                <td style={{ ...td, textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ ...td, textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>{formatMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 16, paddingTop: 16 }}>
          <div style={{ maxWidth: 280, marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>Subtotal</span>
              <span>{formatMoney(quote.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>
                Desconto {quote.discount_type === 'PERCENT' ? `(${quote.discount_value}%)` : ''}
              </span>
              <span style={{ color: '#DC2626' }}>
                -{' '}
                {quote.discount_type === 'PERCENT'
                  ? formatMoney(multiplyDecimal(quote.subtotal, multiplyDecimal(quote.discount_value, '0.01')))
                  : formatMoney(quote.discount_value)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#6D28D9' }}>{formatMoney(quote.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions by status */}
      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={sectionTitle}>Ações</h2>

        {quote.status === 'DRAFT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* If just sent (approvalUrl available after send click) */}
            {approvalUrl && (
              <div style={{ backgroundColor: '#EDE9FE', borderRadius: 8, padding: 16, marginBottom: 8 }}>
                <p style={{ fontWeight: 600, color: '#5B21B6', marginBottom: 8 }}>
                  Orçamento enviado! Link de aprovação:
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    readOnly
                    value={approvalUrl}
                    style={{
                      flex: 1, border: '1px solid #C4B5FD', borderRadius: 6,
                      padding: '6px 10px', fontSize: 13, minWidth: 200,
                    }}
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  {quote.customer.phone && (
                    <button
                      onClick={() => openWhatsApp(quote.customer.phone!, approvalUrl, quote.title || `#${quote.number}`)}
                      style={{ ...btnGreen, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <MessageCircle size={16} /> Compartilhar no WhatsApp
                    </button>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSend}
                disabled={loading || !!approvalUrl}
                style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6, opacity: (loading || !!approvalUrl) ? 0.6 : 1 }}
              >
                <Send size={16} /> {loading ? 'Enviando...' : 'Enviar orçamento'}
              </button>
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={loading}
                style={btnDanger}
              >
                <X size={16} /> Cancelar orçamento
              </button>
            </div>
          </div>
        )}

        {quote.status === 'SENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentApprovalUrl && (
              <div style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 16 }}>
                <p style={{ fontWeight: 600, color: '#065F46', marginBottom: 8 }}>Link de aprovação:</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    readOnly
                    value={currentApprovalUrl}
                    style={{
                      flex: 1, border: '1px solid #A7F3D0', borderRadius: 6,
                      padding: '6px 10px', fontSize: 13, minWidth: 200,
                    }}
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quote.customer.phone && currentApprovalUrl && (
                <button
                  onClick={() => openWhatsApp(quote.customer.phone!, currentApprovalUrl, quote.title || `#${quote.number}`)}
                  style={{ ...btnGreen, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <MessageCircle size={16} /> Compartilhar no WhatsApp
                </button>
              )}
              {quote.pdf_url && (
                <button
                  onClick={() => window.open(quote.pdf_url!, '_blank', 'noopener,noreferrer')}
                  style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={16} /> Baixar PDF
                </button>
              )}
            </div>
          </div>
        )}

        {quote.status === 'APPROVED' && (
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              backgroundColor: '#D1FAE5', borderRadius: 8, padding: '10px 16px',
            }}>
              <span style={{ color: '#065F46', fontWeight: 600 }}>Aprovado</span>
            </div>
            {quote.approval && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>
                  Aprovado em {new Date(quote.approval.approved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {quote.approval.typed_name && (
                    <> · <span style={{ fontWeight: 600, color: '#334155' }}>{quote.approval.typed_name}</span></>
                  )}
                </p>
                {quote.approval.signature_image_url && (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, backgroundColor: '#F9FAFB', display: 'inline-block' }}>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Assinatura</p>
                    <img
                      src={quote.approval.signature_image_url}
                      alt="Assinatura do cliente"
                      style={{ maxWidth: 280, maxHeight: 120, display: 'block', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
            )}
            {quote.pdf_url && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => window.open(quote.pdf_url!, '_blank', 'noopener,noreferrer')}
                  style={{ ...btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={16} /> Baixar PDF
                </button>
              </div>
            )}
          </div>
        )}

        {['REJECTED', 'CANCELLED', 'EXPIRED'].includes(quote.status) && (
          <p style={{ color: '#64748B', fontSize: 14 }}>
            Este orçamento está {STATUS_LABEL[quote.status].toLowerCase()}.
          </p>
        )}
      </div>

      {/* Meta info */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {quote.created_at && (
            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Criado em</p>
              <p style={{ fontSize: 14 }}>{new Date(quote.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
          {quote.valid_until && (
            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Válido até</p>
              <p style={{ fontSize: 14 }}>{new Date(quote.valid_until).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      {showCancelDialog && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(10,10,15,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Cancelar orçamento</h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>
              Tem certeza que deseja cancelar este orçamento? Esta ação não pode ser desfeita.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Motivo (opcional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento"
                style={{
                  width: '100%', border: '1px solid #E2E8F0', borderRadius: 8,
                  padding: '8px 10px', fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelDialog(false)}
                style={btnSecondary}
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                style={{ ...btnDanger, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 13, color: '#64748B', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 14, color: '#0A0A0F' };
const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#0A0A0F' };
const btnPrimary: React.CSSProperties = {
  backgroundColor: '#6D28D9', color: '#fff', borderRadius: 12, padding: '10px 20px',
  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  backgroundColor: '#fff', color: '#334155', borderRadius: 12, padding: '10px 20px',
  fontWeight: 600, fontSize: 14, border: '1px solid #E2E8F0', cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 20px',
  fontWeight: 600, fontSize: 14, border: '1px solid #FECACA', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};
const btnGreen: React.CSSProperties = {
  backgroundColor: '#25D366', color: '#fff', borderRadius: 8, padding: '10px 20px',
  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
};
