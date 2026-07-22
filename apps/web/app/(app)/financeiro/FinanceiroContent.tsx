'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Inbox, Check, X } from 'lucide-react';

const T = {
  ink: '#0A0A0F', fg2: '#334155', fg3: '#64748B',
  border1: '#E2E8F0', border2: '#F1F5F9',
  purple600: '#6D28D9', purple200: '#DDD6FE', purple50: '#F5F3FF', purple800: '#4C1D95',
  slate50: '#F8FAFC', slate100: '#F1F5F9',
  success: '#16A34A', danger: '#DC2626',
};

export interface PaymentRow {
  id: string; customer: string; description: string; amount: string; method: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED'; due: string; paidAt: string;
}
export interface FinanceKpi { label: string; value: string; sub: string; danger?: boolean }
export interface ChartBar { h: number; highlight: boolean }
export interface CustomerOption { id: string; name: string }

const BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PAID: { bg: '#DCFCE7', color: '#166534', label: 'Recebido' },
  PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pendente' },
  OVERDUE: { bg: '#FEE2E2', color: '#991B1B', label: 'Vencido' },
  PARTIAL: { bg: '#E0F2FE', color: '#075985', label: 'Parcial' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelado' },
};

function StatusBadge({ status }: { status: string }) {
  const s = BADGE[status] ?? BADGE.PENDING;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 9999, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />{s.label}
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

export function FinanceiroContent({ entries, kpis, bars, monthLabel, customers }: Props): JSX.Element {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const maxBar = Math.max(1, ...bars.map((b) => b.h));
  const hasData = entries.length > 0;
  const filtered = entries.filter((e) => statusFilter === 'todos' || e.status === statusFilter);

  // ── modal form ──
  const [form, setForm] = useState({ customer_id: '', description: '', amount: '', method: 'PIX', status: 'PAID', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = form.amount.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    if (!form.customer_id) { setError('Selecione um cliente.'); return; }
    if (!amount || Number(amount) <= 0) { setError('Informe um valor válido.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: form.customer_id,
          description: form.description || undefined,
          amount: Number(amount).toFixed(2),
          method: form.method,
          status: form.status,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? 'Erro ao registrar.'); }
      setShowModal(false);
      setForm({ customer_id: '', description: '', amount: '', method: 'PIX', status: 'PAID', due_date: '' });
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro inesperado.'); }
    finally { setSaving(false); }
  }

  async function settle(id: string) {
    await fetch(`/api/payments/${id}/settle`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    router.refresh();
  }

  return (
    <div className="ov-page" style={{ maxWidth: 1440 }}>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em', color: T.ink, margin: 0 }}>Financeiro</h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>{monthLabel}</div>
        </div>
        <button className="ov-btn ov-btn-primary" style={{ gap: 8 }} onClick={() => setShowModal(true)}><Plus size={16} />Registrar recebimento</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {kpis.map((m, i) => (
          <div key={i} className="ov-card"><div className="ov-card-body" style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</div>
            <div style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, fontVariantNumeric: 'tabular-nums', color: m.danger ? T.danger : T.ink }}>{m.value}</div>
            <div style={{ fontSize: 12, color: T.fg3, marginTop: 4 }}>{m.sub}</div>
          </div></div>
        ))}
      </div>

      {/* Chart */}
      <div className="ov-card ov-card-body" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: T.fg3 }}>Recebido por dia</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: T.ink }}>Últimos 30 dias</div>
        </div>
        {hasData ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, height: `${Math.max(2, (b.h / maxBar) * 100)}%`, background: b.highlight ? T.purple600 : T.purple200, borderRadius: '3px 3px 0 0' }} />
            ))}
          </div>
        ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, color: T.fg3, fontSize: 13 }}>Sem recebimentos no período.</div>}
      </div>

      {/* Table */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 14, display: 'flex', gap: 10, borderBottom: `1px solid ${T.border2}` }}>
          <select className="ov-input" style={{ width: 200, height: 38, fontSize: 14 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="PAID">Recebido</option>
            <option value="PENDING">Pendente</option>
            <option value="OVERDUE">Vencido</option>
            <option value="PARTIAL">Parcial</option>
          </select>
        </div>

        {!hasData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '56px 16px', color: '#94A3B8' }}>
            <Inbox size={32} strokeWidth={1.5} />
            <p style={{ fontSize: 14, margin: 0 }}>Nenhum recebimento ainda. Use &quot;Registrar recebimento&quot; para começar.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff' }}>
            <thead><tr>
              {['Cliente', 'Descrição', 'Valor', 'Método', 'Status', 'Vencimento', 'Pago em', ''].map((h) => (
                <th key={h} style={{ textAlign: h === 'Valor' ? 'right' : 'left', padding: '12px 16px', background: T.slate50, color: T.fg3, fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: `1px solid ${T.border1}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: T.fg3, fontSize: 14 }}>Nenhum lançamento para o filtro.</td></tr>
              ) : filtered.map((r, i) => {
                const last = i === filtered.length - 1;
                const bb = last ? 0 : `1px solid ${T.border2}`;
                return (
                  <tr key={r.id}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: T.ink, borderBottom: bb }}>{r.customer}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, borderBottom: bb }}>{r.description || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontFamily: 'var(--font-mono)', borderBottom: bb }}>{r.amount}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: T.fg3, borderBottom: bb }}>{r.method}</td>
                    <td style={{ padding: '12px 16px', borderBottom: bb }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: r.status === 'OVERDUE' ? T.danger : T.fg3, borderBottom: bb }}>{r.due}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: T.fg3, fontFamily: 'var(--font-mono)', borderBottom: bb }}>{r.paidAt}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: bb }}>
                      {r.status !== 'PAID' && r.status !== 'CANCELLED' && (
                        <button onClick={() => settle(r.id)} className="ov-btn ov-btn-outline" style={{ height: 30, fontSize: 12, gap: 6, padding: '0 10px' }}><Check size={13} />Receber</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,15,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>Registrar recebimento</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.fg3, display: 'flex' }}><X size={18} /></button>
            </div>
            {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: T.danger, fontSize: 13, marginBottom: 14 }}>{error}</div>}
            <form onSubmit={submit}>
              <div style={{ marginBottom: 12 }}>
                <label className="ov-label">Cliente *</label>
                <select className="ov-input" value={form.customer_id} onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))} required>
                  <option value="">Selecione</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="ov-label">Descrição</label>
                <input className="ov-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: OS #312 — entrada" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="ov-label">Valor (R$) *</label>
                  <input className="ov-input" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="890,00" inputMode="decimal" required />
                </div>
                <div>
                  <label className="ov-label">Método</label>
                  <select className="ov-input" value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}>
                    <option value="PIX">Pix</option><option value="BOLETO">Boleto</option><option value="CARTAO">Cartão</option><option value="DINHEIRO">Dinheiro</option><option value="TRANSFERENCIA">Transferência</option><option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label className="ov-label">Situação</label>
                  <select className="ov-input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="PAID">Recebido</option><option value="PENDING">A receber</option>
                  </select>
                </div>
                <div>
                  <label className="ov-label">Vencimento</label>
                  <input className="ov-input" type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)} className="ov-btn ov-btn-outline" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" disabled={saving} className="ov-btn ov-btn-primary" style={{ flex: 1 }}>{saving ? 'Salvando…' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
