'use client';

import { useState } from 'react';
import { Plus, Download } from 'lucide-react';

// ── Token aliases (matches docs/handoff/tokens.json exactly) ──────────
const T = {
  ink:       '#0A0A0F',
  fg2:       '#334155',  // slate-700
  fg3:       '#64748B',  // slate-500
  border1:   '#E2E8F0',  // slate-200
  border2:   '#F1F5F9',  // slate-100
  purple600: '#6D28D9',
  purple200: '#DDD6FE',
  purple50:  '#F5F3FF',
  purple800: '#4C1D95',
  slate50:   '#F8FAFC',
  slate100:  '#F1F5F9',
  success:   '#16A34A',
  successBg: '#DCFCE7',
  warning:   '#D97706',
  warningBg: '#FEF3C7',
  danger:    '#DC2626',
  dangerBg:  '#FEE2E2',
  infoBg:    '#E0F2FE',
  info:      '#0284C7',
};

// ── Atoms ──────────────────────────────────────────────────────────────

const BADGE_MAP: Record<string, { bg: string; color: string; label: string }> = {
  paid:    { bg: T.successBg, color: '#166534', label: 'Recebido' },
  pending: { bg: T.warningBg, color: '#92400E', label: 'Pendente' },
  overdue: { bg: T.dangerBg,  color: '#991B1B', label: 'Vencido'  },
  partial: { bg: T.infoBg,    color: '#075985', label: 'Parcial'  },
};

function StatusBadge({ status }: { status: string }): JSX.Element {
  const s = BADGE_MAP[status] ?? { bg: T.slate100, color: T.fg2, label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600,
      padding: '5px 9px', borderRadius: 9999,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function RangePill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick?: () => void }): JSX.Element {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        fontSize: 11, fontWeight: 600,
        padding: '4px 9px', borderRadius: 9999,
        background: active ? T.purple50  : T.slate100,
        color:      active ? T.purple800 : T.fg2,
        cursor: 'pointer',
      }}
    >
      {children}
    </span>
  );
}

// ── Money helper — R$ X.XXX,XX (pt-BR, tabular) ─────────────────
function fmtMoney(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Sample data (matches OtherPages.jsx Finance() reference) ──────────
const ROWS = [
  { cust: 'Marcos Pereira',         origin: 'OS #311',    value: '890.00',   method: 'Pix',    status: 'paid',    due: '05/05', paidAt: '05/05' },
  { cust: 'Construtora Vila Nova',  origin: 'OS #305',    value: '3210.00',  method: 'Boleto', status: 'paid',    due: '02/05', paidAt: '03/05' },
  { cust: 'Ana Souza',              origin: 'ORÇ #244',   value: '880.00',   method: 'Pix',    status: 'overdue', due: '28/04', paidAt: '—'     },
  { cust: 'Luiz Henrique',          origin: 'OS #298',    value: '1240.00',  method: 'Cartão', status: 'partial', due: '20/05', paidAt: '50%'   },
  { cust: 'Padaria Quatro Cantos',  origin: 'OS #295',    value: '480.00',   method: 'Pix',    status: 'pending', due: '18/05', paidAt: '—'     },
  { cust: 'Roberta Lima',           origin: 'ORÇ #289',   value: '760.00',   method: 'Dinheiro', status: 'paid',  due: '10/05', paidAt: '10/05' },
];

// ── Bar chart data — last 5 bars highlighted in purple-600 ────────────
const BARS = Array.from({ length: 30 }, (_, i) => ({
  h: Math.min(100, 30 + ((Math.sin(i * 0.7) + 1) * 0.5 * 70) + (i % 5 === 0 ? 20 : 0)),
  highlight: i > 24,
}));

// ── Page ───────────────────────────────────────────────────────────────
export default function FinanceiroPage(): JSX.Element {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [methodFilter, setMethodFilter] = useState('todos');

  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap   = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const filtered = ROWS.filter(r => {
    if (statusFilter !== 'todos' && r.status !== statusFilter) return false;
    if (methodFilter !== 'todos' && r.method.toLowerCase() !== methodFilter) return false;
    return true;
  });

  // ── KPI metrics (from reference) ──
  const kpis = [
    { label: 'Recebido no período', value: fmtMoney('12480'), sub: '17 recebimentos',      color: T.ink },
    { label: 'Pendente',            value: fmtMoney('3250'),  sub: '5 em aberto',           color: T.ink },
    { label: 'Vencido',             value: fmtMoney('880'),   sub: '2 recebimentos',        color: T.danger },
    { label: 'Ticket médio',        value: fmtMoney('734'),   sub: '+8% vs mês anterior',   color: T.ink },
  ];

  return (
    <div className="ov-page" style={{ maxWidth: 1440 }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em', color: T.ink, margin: 0 }}>
            Financeiro
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>{monthCap}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ov-btn ov-btn-outline" style={{ gap: 8 }}>
            <Download size={16} />Exportar
          </button>
          <button className="ov-btn ov-btn-primary" style={{ gap: 8 }}>
            <Plus size={16} />Registrar recebimento
          </button>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      {/* Reference: OtherPages.jsx Finance() + Operations.jsx WFinance() */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {kpis.map((m, i) => (
          <div key={i} className="ov-card">
            <div className="ov-card-body" style={{ padding: '16px 18px' }}>
              {/* label: 11px mono uppercase — from styles.css .metric .label */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {m.label}
              </div>
              {/* value: 28px/36px 700 tabular-nums — from tokens --t-h1 */}
              <div style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, fontVariantNumeric: 'tabular-nums', color: m.color }}>
                {m.value}
              </div>
              <div style={{ fontSize: 12, color: T.fg3, marginTop: 4 }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart card ──────────────────────────────────────────────── */}
      {/* Reference: Operations.jsx WFinance() bar chart */}
      <div className="ov-card ov-card-body" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: T.fg3 }}>Recebido por dia</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: T.ink }}>Últimos 30 dias</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['7d', '30d', '90d'] as const).map(t => (
              <RangePill key={t} active={range === t} onClick={() => setRange(t)}>
                {t}
              </RangePill>
            ))}
          </div>
        </div>
        {/* bars: last 5 = purple-600 (#6D28D9), rest = purple-200 (#DDD6FE) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
          {BARS.map((b, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${b.h}%`,
                background: b.highlight ? T.purple600 : T.purple200,
                borderRadius: '3px 3px 0 0',
                transition: 'background 120ms cubic-bezier(0.2,0,0,1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────────────────── */}
      {/* Reference: OtherPages.jsx Finance() table + Operations.jsx WFinance() filters */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>

        {/* filters */}
        <div style={{ padding: 14, display: 'flex', gap: 10, borderBottom: `1px solid ${T.border2}` }}>
          <select
            className="ov-input"
            style={{ width: 200, height: 38, fontSize: 14 }}
            value={monthLabel}
            onChange={() => {}}
          >
            <option>{monthCap}</option>
          </select>
          <select
            className="ov-input"
            style={{ width: 160, height: 38, fontSize: 14 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="todos">Todos os status</option>
            <option value="paid">Recebido</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Vencido</option>
            <option value="partial">Parcial</option>
          </select>
          <select
            className="ov-input"
            style={{ width: 160, height: 38, fontSize: 14 }}
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
          >
            <option value="todos">Todos os métodos</option>
            <option value="pix">Pix</option>
            <option value="boleto">Boleto</option>
            <option value="cartão">Cartão</option>
            <option value="dinheiro">Dinheiro</option>
          </select>
          <select className="ov-input" style={{ width: 180, height: 38, fontSize: 14 }}>
            <option>Todos os clientes</option>
          </select>
        </div>

        {/* table — inline styles matching styles.css .table spec exactly */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff' }}>
          <thead>
            <tr>
              {['Cliente', 'Origem', 'Valor', 'Método', 'Status', 'Vencimento', 'Pago em'].map(h => (
                <th key={h} style={{
                  textAlign: h === 'Valor' ? 'right' : 'left',
                  padding: '12px 16px',
                  background: T.slate50,
                  color: T.fg3,
                  fontWeight: 500,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  borderBottom: `1px solid ${T.border1}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: T.fg3, fontSize: 14 }}>
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={i}>
                  {/* Cliente */}
                  <td style={{ padding: '12px 16px', fontSize: 14, borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    <b style={{ fontWeight: 600, color: T.ink }}>{r.cust}</b>
                  </td>
                  {/* Origem */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, fontFamily: 'var(--font-mono)', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    {r.origin}
                  </td>
                  {/* Valor */}
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontFamily: 'var(--font-mono)', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    {fmtMoney(r.value)}
                  </td>
                  {/* Método */}
                  <td style={{ padding: '12px 16px', fontSize: 14, color: T.fg3, borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    {r.method}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '12px 16px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    <StatusBadge status={r.status} />
                  </td>
                  {/* Vencimento */}
                  <td style={{
                    padding: '12px 16px', fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    color: r.status === 'overdue' ? T.danger : T.fg3,
                    fontWeight: r.status === 'overdue' ? 600 : 400,
                    borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0,
                  }}>
                    {r.due}
                  </td>
                  {/* Pago em */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, fontFamily: 'var(--font-mono)', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                    {r.paidAt}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
