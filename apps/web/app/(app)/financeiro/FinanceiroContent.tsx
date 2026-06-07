'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Inbox } from 'lucide-react';

const T = {
  ink: '#0A0A0F', fg2: '#334155', fg3: '#64748B',
  border1: '#E2E8F0', border2: '#F1F5F9',
  purple600: '#6D28D9', purple200: '#DDD6FE', purple50: '#F5F3FF', purple800: '#4C1D95',
  slate50: '#F8FAFC', slate100: '#F1F5F9',
  success: '#16A34A', successBg: '#DCFCE7', warning: '#D97706', warningBg: '#FEF3C7',
  danger: '#DC2626', dangerBg: '#FEE2E2', infoBg: '#E0F2FE',
};

export interface FinanceEntry {
  id: string;
  customer: string;
  origin: string;
  value: string;
  status: 'APPROVED' | 'SENT' | 'DRAFT' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  date: string;        // dd/mm
  approvedAt: string;  // dd/mm or —
}
export interface FinanceKpi { label: string; value: string; sub: string; danger?: boolean }
export interface ChartBar { h: number; highlight: boolean }

const BADGE: Record<string, { bg: string; color: string; label: string }> = {
  APPROVED:  { bg: '#DCFCE7', color: '#166534', label: 'Aprovado'  },
  SENT:      { bg: '#FEF3C7', color: '#92400E', label: 'Aguardando' },
  DRAFT:     { bg: '#F1F5F9', color: '#334155', label: 'Rascunho'  },
  REJECTED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Recusado'  },
  EXPIRED:   { bg: '#FFEDD5', color: '#9A3412', label: 'Expirado'  },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelado' },
};

function StatusBadge({ status }: { status: string }): JSX.Element {
  const s = BADGE[status] ?? BADGE.DRAFT;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 9999, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function RangePill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick?: () => void }): JSX.Element {
  return (
    <span onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 9999, background: active ? T.purple50 : T.slate100, color: active ? T.purple800 : T.fg2, cursor: 'pointer' }}>
      {children}
    </span>
  );
}

interface Props {
  entries: FinanceEntry[];
  kpis: FinanceKpi[];
  bars: ChartBar[];
  monthLabel: string;
}

export function FinanceiroContent({ entries, kpis, bars, monthLabel }: Props): JSX.Element {
  const [statusFilter, setStatusFilter] = useState('todos');
  const maxBar = Math.max(1, ...bars.map(b => b.h));

  const filtered = entries.filter(e => statusFilter === 'todos' || e.status === statusFilter);
  const hasData = entries.length > 0;

  return (
    <div className="ov-page" style={{ maxWidth: 1440 }}>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em', color: T.ink, margin: 0 }}>Financeiro</h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>{monthLabel}</div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {kpis.map((m, i) => (
          <div key={i} className="ov-card">
            <div className="ov-card-body" style={{ padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</div>
              <div style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, fontVariantNumeric: 'tabular-nums', color: m.danger ? T.danger : T.ink }}>{m.value}</div>
              <div style={{ fontSize: 12, color: T.fg3, marginTop: 4 }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="ov-card ov-card-body" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: T.fg3 }}>Aprovado por dia</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: T.ink }}>Últimos 30 dias</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <RangePill active>30d</RangePill>
          </div>
        </div>
        {hasData ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, height: `${Math.max(2, (b.h / maxBar) * 100)}%`, background: b.highlight ? T.purple600 : T.purple200, borderRadius: '3px 3px 0 0', transition: 'background 120ms cubic-bezier(0.2,0,0,1)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, color: T.fg3, fontSize: 13 }}>
            Sem dados no período.
          </div>
        )}
      </div>

      {/* Table */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 14, display: 'flex', gap: 10, borderBottom: `1px solid ${T.border2}` }}>
          <select className="ov-input" style={{ width: 200, height: 38, fontSize: 14 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="APPROVED">Aprovado</option>
            <option value="SENT">Aguardando</option>
            <option value="DRAFT">Rascunho</option>
            <option value="REJECTED">Recusado</option>
            <option value="EXPIRED">Expirado</option>
          </select>
        </div>

        {!hasData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '56px 16px', color: '#94A3B8' }}>
            <Inbox size={32} strokeWidth={1.5} />
            <p style={{ fontSize: 14, margin: 0 }}>Nenhum lançamento ainda. Crie orçamentos para acompanhar o financeiro.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff' }}>
            <thead>
              <tr>
                {['Cliente', 'Origem', 'Valor', 'Status', 'Criado', 'Aprovado em'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Valor' ? 'right' : 'left', padding: '12px 16px', background: T.slate50, color: T.fg3, fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: `1px solid ${T.border1}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: T.fg3, fontSize: 14 }}>Nenhum lançamento para o filtro selecionado.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ padding: '12px 16px', fontSize: 14, borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    <Link href={`/orcamentos/${r.id}`} style={{ fontWeight: 600, color: T.ink, textDecoration: 'none' }}>{r.customer}</Link>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, fontFamily: 'var(--font-mono)', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>{r.origin}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontFamily: 'var(--font-mono)', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>{r.value}</td>
                  <td style={{ padding: '12px 16px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: T.fg3, borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>{r.date}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, fontFamily: 'var(--font-mono)', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>{r.approvedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
