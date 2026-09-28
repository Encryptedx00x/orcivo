'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Inbox, Plus } from 'lucide-react';
import { PaymentRegistrationModal } from './PaymentRegistrationModal';
import { EntityHistory } from '../../../lib/EntityHistory';

const T = {
  ink: '#0A0A0F',
  fg3: '#64748B',
  border1: '#E2E8F0',
  border2: '#F1F5F9',
  purple600: '#6D28D9',
  purple200: '#DDD6FE',
  slate50: '#F8FAFC',
  danger: '#DC2626',
};

export interface PaymentRow {
  id: string;
  customer: string;
  description: string;
  amount: string;
  method: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';
  due: string;
  paidAt: string;
}
export interface FinanceKpi {
  label: string;
  value: string;
  sub: string;
  danger?: boolean;
}
export interface ChartBar {
  percent: string;
  highlight: boolean;
  amount: string;
  date: string;
}
export interface CustomerOption {
  id: string;
  name: string;
}

const BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PAID: { bg: '#DCFCE7', color: '#166534', label: 'Recebido' },
  PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pendente' },
  OVERDUE: { bg: '#FEE2E2', color: '#991B1B', label: 'Vencido' },
  PARTIAL: { bg: '#E0F2FE', color: '#075985', label: 'Parcial' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelado' },
};

function StatusBadge({ status }: { status: string }): JSX.Element {
  const badge = BADGE[status] ?? BADGE.PENDING;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 9px',
        borderRadius: 9999,
        background: badge.bg,
        color: badge.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {badge.label}
    </span>
  );
}

interface Props {
  entries: PaymentRow[];
  kpis: FinanceKpi[];
  bars: ChartBar[];
  monthLabel: string;
  customers: CustomerOption[];
}

export function FinanceiroContent({
  entries,
  kpis,
  bars,
  monthLabel,
  customers,
}: Props): JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const tooltipId = useId();
  const tooltipBar = activeBar === null ? undefined : bars[activeBar];
  const hasData = entries.length > 0;
  const filtered = entries.filter(
    (entry) => statusFilter === 'todos' || entry.status === statusFilter,
  );

  async function settle(id: string): Promise<void> {
    await fetch(`/api/payments/${id}/settle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    router.refresh();
  }

  return (
    <div className="ov-page" style={{ maxWidth: 1440 }}>
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              lineHeight: '32px',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: T.ink,
              margin: 0,
            }}
          >
            Financeiro
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>{monthLabel}</div>
        </div>
        <button
          className="ov-btn ov-btn-primary"
          style={{ gap: 8 }}
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          Registrar recebimento
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {kpis.map((kpi) => (
          <div key={kpi.label} className="ov-card">
            <div className="ov-card-body" style={{ padding: '16px 18px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: T.fg3,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                {kpi.label}
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: '36px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginTop: 6,
                  fontVariantNumeric: 'tabular-nums',
                  color: kpi.danger ? T.danger : T.ink,
                }}
              >
                {kpi.value}
              </div>
              <div style={{ fontSize: 12, color: T.fg3, marginTop: 4 }}>{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="ov-card ov-card-body" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: T.fg3 }}>Recebido por dia</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: T.ink }}>
            Últimos 30 dias
          </div>
        </div>
        {hasData ? (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 3,
              height: 100,
            }}
            onMouseLeave={() => setActiveBar(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setActiveBar(null);
            }}
          >
            {bars.map((bar, index) => (
              <div
                key={index}
                tabIndex={0}
                role="img"
                aria-label={`Recebido em ${bar.date}: ${bar.amount}`}
                aria-describedby={activeBar === index ? tooltipId : undefined}
                onMouseEnter={() => setActiveBar(index)}
                onFocus={() => setActiveBar(index)}
                onBlur={() => setActiveBar(null)}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `max(2%, ${bar.percent}%)`,
                    background: bar.highlight ? T.purple600 : T.purple200,
                    borderRadius: '3px 3px 0 0',
                  }}
                />
              </div>
            ))}
            {tooltipBar && activeBar !== null ? (
              <div
                id={tooltipId}
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: `clamp(0px, calc(${((activeBar + 0.5) / bars.length) * 100}% - 90px), calc(100% - 180px))`,
                  width: 180,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: T.ink,
                  color: '#fff',
                  fontSize: 12,
                  lineHeight: '18px',
                  fontVariantNumeric: 'tabular-nums',
                  boxShadow: '0 4px 12px #0A0A0F26',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                <div>{tooltipBar.date}</div>
                <div style={{ fontWeight: 600 }}>{tooltipBar.amount}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 100,
              color: T.fg3,
              fontSize: 13,
            }}
          >
            Sem recebimentos no período.
          </div>
        )}
      </div>
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <div
          style={{ padding: 14, display: 'flex', gap: 10, borderBottom: `1px solid ${T.border2}` }}
        >
          <select
            className="ov-input"
            style={{ width: 200, height: 38, fontSize: 14 }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="todos">Todos os status</option>
            <option value="PAID">Recebido</option>
            <option value="PENDING">Pendente</option>
            <option value="OVERDUE">Vencido</option>
            <option value="PARTIAL">Parcial</option>
          </select>
        </div>
        {!hasData ? (
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
            <p style={{ fontSize: 14, margin: 0 }}>
              Nenhum recebimento ainda. Use &quot;Registrar recebimento&quot; para começar.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              background: '#fff',
            }}
          >
            <thead>
              <tr>
                {[
                  'Cliente',
                  'Descrição',
                  'Valor',
                  'Método',
                  'Status',
                  'Vencimento',
                  'Pago em',
                  '',
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: heading === 'Valor' ? 'right' : 'left',
                      padding: '12px 16px',
                      background: T.slate50,
                      color: T.fg3,
                      fontWeight: 500,
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '.04em',
                      borderBottom: `1px solid ${T.border1}`,
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: T.fg3,
                      fontSize: 14,
                    }}
                  >
                    Nenhum lançamento para o filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const borderBottom = index === filtered.length - 1 ? 0 : `1px solid ${T.border2}`;
                  return (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.ink,
                          borderBottom,
                        }}
                      >
                        {row.customer}
                      </td>
                      <td
                        style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, borderBottom }}
                      >
                        {row.description || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: 14,
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          borderBottom,
                        }}
                      >
                        {row.amount}
                      </td>
                      <td
                        style={{ padding: '12px 16px', fontSize: 14, color: T.fg3, borderBottom }}
                      >
                        {row.method}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom }}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: 13,
                          fontFamily: 'var(--font-mono)',
                          color: row.status === 'OVERDUE' ? T.danger : T.fg3,
                          borderBottom,
                        }}
                      >
                        {row.due}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: 13,
                          color: T.fg3,
                          fontFamily: 'var(--font-mono)',
                          borderBottom,
                        }}
                      >
                        {row.paidAt}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom }}>
                        <EntityHistory
                          entityType="payment"
                          entityId={row.id}
                          label={`${row.customer} · ${row.description || 'Recebimento'} · ${row.amount}`}
                          revision={row.status}
                        />
                        {row.status !== 'PAID' && row.status !== 'CANCELLED' ? (
                          <button
                            onClick={() => void settle(row.id)}
                            className="ov-btn ov-btn-outline"
                            style={{ height: 30, fontSize: 12, gap: 6, padding: '0 10px' }}
                          >
                            <Check size={13} />
                            Receber
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
      {showModal ? (
        <PaymentRegistrationModal customers={customers} onClose={() => setShowModal(false)} />
      ) : null}
    </div>
  );
}
