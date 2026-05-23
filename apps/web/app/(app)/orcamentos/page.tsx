import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { quoteService, Quote } from '../../../lib/quote.service';
import { formatMoney } from '@orcivo/shared-types';

const STATUS_LABEL: Record<Quote['status'], string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const STATUS_STYLE: Record<Quote['status'], React.CSSProperties> = {
  DRAFT:     { backgroundColor: '#F3F4F6', color: '#6B7280' },
  SENT:      { backgroundColor: '#FEF3C7', color: '#92400E' },
  APPROVED:  { backgroundColor: '#D1FAE5', color: '#065F46' },
  REJECTED:  { backgroundColor: '#FEE2E2', color: '#991B1B' },
  CANCELLED: { backgroundColor: '#E5E7EB', color: '#374151' },
  EXPIRED:   { backgroundColor: '#FFEDD5', color: '#9A3412' },
};

export default async function OrcamentosPage(): Promise<JSX.Element> {
  let quotes: Quote[] = [];
  let error = false;

  try {
    const result = await quoteService.fetchQuotes(1);
    quotes = result.data;
  } catch {
    error = true;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Orçamentos</h1>
        <Link
          href="/orcamentos/novo"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: '#6D28D9', color: '#fff',
            borderRadius: 8, padding: '8px 18px',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          <Plus size={16} /> Novo orçamento
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 8, padding: '12px 16px', color: '#DC2626', marginBottom: 16,
        }}>
          Erro ao carregar orçamentos. Tente novamente mais tarde.
        </div>
      )}

      {/* Empty state */}
      {!error && quotes.length === 0 && (
        <div style={{
          backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
          borderRadius: 8, padding: '32px 16px', textAlign: 'center', color: '#6B7280',
        }}>
          <FileText size={40} style={{ margin: '0 auto 12px', color: '#D1D5DB' }} />
          <p style={{ fontWeight: 600 }}>Nenhum orçamento ainda.</p>
          <p style={{ fontSize: 14 }}>Crie o primeiro orçamento para começar.</p>
        </div>
      )}

      {/* Table */}
      {!error && quotes.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                <th style={th}>#</th>
                <th style={th}>Título / Cliente</th>
                <th style={th}>Status</th>
                <th style={th}>Total</th>
                <th style={th}>Criado em</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={td}>
                    <Link
                      href={`/orcamentos/${q.id}`}
                      style={{ color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}
                    >
                      #{q.number}
                    </Link>
                  </td>
                  <td style={td}>
                    <span style={{ fontWeight: 500 }}>{q.title || q.customer.name}</span>
                    {q.title && (
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                        {q.customer.name}
                      </p>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                      fontSize: 12, fontWeight: 600, ...STATUS_STYLE[q.status],
                    }}>
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td style={td}>{formatMoney(q.total)}</td>
                  <td style={td}>
                    {q.created_at
                      ? new Date(q.created_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td style={td}>
                    <Link
                      href={`/orcamentos/${q.id}`}
                      style={{ color: '#6D28D9', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                    >
                      Ver detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#6B7280', fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: '12px 16px', fontSize: 14, color: '#0A0A0F',
};
