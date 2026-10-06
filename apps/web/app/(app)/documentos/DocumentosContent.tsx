'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, ExternalLink, Inbox } from 'lucide-react';
import { LoadMore, usePagedList } from '../../../lib/use-paged-list';
import { loadQuotesPage } from '../orcamentos/list-actions';
import { loadWorkOrdersPage } from '../ordens-de-servico/list-actions';
import { ReceiptsTab } from './ReceiptsTab';

// ── Tipos vindos do server component ──────────────────────────────────
export interface DocQuote {
  id: string;
  number: number;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  title?: string;
  customer: { name: string };
  created_at?: string;
}
export interface DocWorkOrder {
  id: string;
  number: number;
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  customer: { name: string };
  finished_at?: string;
}

// ── Pills de status ───────────────────────────────────────────────────
const PILL: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Rascunho', bg: '#F1F5F9', color: '#334155' },
  SENT: { label: 'Enviado', bg: '#E0F2FE', color: '#075985' },
  APPROVED: { label: 'Aprovado', bg: '#DCFCE7', color: '#166534' },
  REJECTED: { label: 'Recusado', bg: '#FEE2E2', color: '#991B1B' },
  CANCELLED: { label: 'Cancelado', bg: '#F1F5F9', color: '#64748B' },
  EXPIRED: { label: 'Expirado', bg: '#FFEDD5', color: '#9A3412' },
  PENDING: { label: 'Pendente', bg: '#F1F5F9', color: '#334155' },
  IN_PROGRESS: { label: 'Em andamento', bg: '#E0F2FE', color: '#075985' },
  DONE: { label: 'Concluída', bg: '#DCFCE7', color: '#166534' },
};

function Pill({ k }: { k: string }) {
  const s = PILL[k] ?? PILL.DRAFT;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 9px',
        borderRadius: 9999,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

function PdfThumb() {
  return (
    <div
      style={{
        width: 30,
        height: 36,
        borderRadius: 5,
        background: 'linear-gradient(180deg, #FEE2E2, #FECACA)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#991B1B',
        fontWeight: 700,
        fontSize: 9,
        flexShrink: 0,
      }}
    >
      PDF
    </div>
  );
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  color: '#475569',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 7,
  padding: 0,
  fontFamily: 'inherit',
};

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '56px 16px',
        color: '#94A3B8',
      }}
    >
      <Inbox size={32} strokeWidth={1.5} />
      <p style={{ fontSize: 14, margin: 0 }}>{label}</p>
    </div>
  );
}

interface Props {
  quotes: DocQuote[];
  workOrders: DocWorkOrder[];
}

export function DocumentosContent({
  quotes: firstQuotes,
  workOrders: firstWorkOrders,
}: Props): JSX.Element {
  const quoteList = usePagedList(firstQuotes, async (page) => {
    const rows = await loadQuotesPage(page);
    return (
      rows?.map((q) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        title: q.title,
        customer: { name: q.customer.name },
        created_at: q.created_at,
      })) ?? null
    );
  });
  const woList = usePagedList(firstWorkOrders, async (page) => {
    const rows = await loadWorkOrdersPage(page);
    return (
      rows?.map((w) => ({
        id: w.id,
        number: w.number,
        title: w.title,
        status: w.status,
        customer: { name: w.customer.name },
        finished_at: w.finished_at,
      })) ?? null
    );
  });
  const quotes = quoteList.items;
  const workOrders = woList.items;
  const [receiptCount, setReceiptCount] = useState(0);
  const TABS = [
    { id: 'orc', label: 'Orçamentos', count: quotes.length },
    { id: 'os', label: 'Ordens de Serviço', count: workOrders.length },
    { id: 'rec', label: 'Recibos', count: receiptCount },
    { id: 'con', label: 'Contratos', count: 0 },
  ];
  const params = useSearchParams();
  const [tab, setTab] = useState(
    params.get('recibo') || params.get('novo-recibo') || params.get('tab') === 'recibos'
      ? 'rec'
      : 'orc',
  );
  const total = quotes.length + workOrders.length + receiptCount;

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: 0,
            }}
          >
            Documentos
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {total} documento{total === 1 ? '' : 's'} gerado{total === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ov-tabs">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`ov-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 9,
                background: tab === t.id ? '#EDE9FE' : '#F1F5F9',
                color: tab === t.id ? '#4C1D95' : '#334155',
              }}
            >
              {t.count}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        {tab === 'orc' &&
          (quotes.length === 0 ? (
            <EmptyState label="Nenhum orçamento gerado ainda." />
          ) : (
            <table className="ov-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente / Descrição</th>
                  <th>Gerado em</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id}>
                    <td
                      data-label="Número"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: '#6D28D9',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <PdfThumb />
                        ORÇ #{q.number}
                      </span>
                    </td>
                    <td data-label="Cliente / Descrição" style={{ fontWeight: 500 }}>
                      {q.customer.name}
                      {q.title ? ` · ${q.title}` : ''}
                    </td>
                    <td
                      data-label="Gerado em"
                      className="muted"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    >
                      {fmtDate(q.created_at)}
                    </td>
                    <td data-label="Status">
                      <Pill k={q.status} />
                    </td>
                    <td data-label="" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          style={iconBtn}
                          title="Baixar PDF"
                          onClick={() =>
                            window.open(`/api/quotes/${q.id}/pdf`, '_blank', 'noopener,noreferrer')
                          }
                        >
                          <FileText size={14} />
                        </button>
                        <Link href={`/orcamentos/${q.id}`} style={iconBtn} title="Abrir orçamento">
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === 'os' &&
          (workOrders.length === 0 ? (
            <EmptyState label="Nenhuma ordem de serviço gerada ainda." />
          ) : (
            <table className="ov-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente / Descrição</th>
                  <th>Finalizada em</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((w) => (
                  <tr key={w.id}>
                    <td
                      data-label="Número"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: '#6D28D9',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <PdfThumb />
                        OS #{w.number}
                      </span>
                    </td>
                    <td data-label="Cliente / Descrição" style={{ fontWeight: 500 }}>
                      {w.customer.name}
                      {w.title ? ` · ${w.title}` : ''}
                    </td>
                    <td
                      data-label="Finalizada em"
                      className="muted"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    >
                      {fmtDate(w.finished_at)}
                    </td>
                    <td data-label="Status">
                      <Pill k={w.status} />
                    </td>
                    <td data-label="" style={{ textAlign: 'right' }}>
                      <Link href={`/ordens-de-servico/${w.id}`} style={iconBtn} title="Abrir OS">
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {tab === 'orc' && <LoadMore list={quoteList} />}
        {tab === 'os' && <LoadMore list={woList} />}

        {/* Kept mounted so the tab count is right before the tab is opened. */}
        <div hidden={tab !== 'rec'}>
          <ReceiptsTab onCount={setReceiptCount} />
        </div>
        {tab === 'con' && <EmptyState label="Contratos estarão disponíveis em breve." />}
      </div>
    </div>
  );
}
