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
  DRAFT:     { backgroundColor: '#F3F4F6', color: '#64748B' },
  SENT:      { backgroundColor: '#FEF3C7', color: '#92400E' },
  APPROVED:  { backgroundColor: '#D1FAE5', color: '#065F46' },
  REJECTED:  { backgroundColor: '#FEE2E2', color: '#991B1B' },
  CANCELLED: { backgroundColor: '#E2E8F0', color: '#334155' },
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
            display: 'inline-flex', alignItems: 'center', gap: 6,
            backgroundColor: '#6D28D9', color: '#fff',
            borderRadius: 12, padding: '8px 18px',
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
          borderRadius: 12, padding: '12px 16px', color: '#DC2626', marginBottom: 16,
        }}>
          Erro ao carregar orçamentos. Tente novamente mais tarde.
        </div>
      )}

      {/* Empty state */}
      {!error && quotes.length === 0 && (
        <div style={{
          backgroundColor: '#fff', border: '1px solid #E2E8F0',
          borderRadius: 12, padding: '48px 24px', textAlign: 'center',
        }}>
          <FileText size={40} style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', marginBottom: 6 }}>
            Nenhum orçamento cadastrado ainda.
          </p>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Crie o primeiro orçamento para começar a atender seus clientes.
          </p>
          <Link
            href="/orcamentos/novo"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#6D28D9', fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}
          >
            <Plus size={14} /> Criar primeiro orçamento
          </Link>
        </div>
      )}

      {/* Table */}
      {!error && quotes.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
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
                <tr
                  key={q.id}
                  style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
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
                      <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
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
                  <td style={{ ...td, color: '#64748B' }}>
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
  textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#64748B', fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: '13px 16px', fontSize: 14, color: '#0A0A0F',
};
