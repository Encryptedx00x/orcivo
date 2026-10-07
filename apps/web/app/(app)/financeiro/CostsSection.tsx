'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  formatMoney,
  parseMoneyInput,
  type ExpenseCategory,
  type FinanceSummary,
} from '@orcivo/shared-types';
import { createExpense, deleteExpense, payExpense } from './expense-actions';

export interface CostRow {
  id: string;
  category: string;
  description: string | null;
  amount: string;
  status: 'PENDING' | 'PAID';
  due_date: string | null;
  paid_at: string | null;
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

/** Costs of the month + result (received − paid costs). Writes are admin-only on the API. */
export function CostsSection({
  costs,
  summary,
  monthLabel,
}: {
  costs: CostRow[];
  summary: FinanceSummary | null;
  monthLabel: string;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('MATERIAL');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paid, setPaid] = useState(true);
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const value = parseMoneyInput(amount);
  async function save() {
    if (!value) return setError('Informe o valor, ex.: 80,00');
    setBusy(true);
    setError('');
    const r = await createExpense({
      category,
      amount: value,
      description: description.trim() || undefined,
      status: paid ? 'PAID' : 'PENDING',
      ...(!paid && due ? { due_date: new Date(`${due}T12:00:00`).toISOString() } : {}),
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setOpen(false);
    setAmount('');
    setDescription('');
    router.refresh();
  }
  async function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    const r = await fn();
    if (!r.ok) alert(r.message);
    router.refresh();
  }

  const result = summary?.result ?? '0.00';
  const negative = result.startsWith('-');
  const cards = summary
    ? [
        { label: 'Recebido no mês', value: summary.revenue.received },
        { label: 'Custos pagos', value: summary.costs.paid },
        { label: 'Custos previstos', value: summary.costs.planned },
        { label: 'Resultado do mês', value: result, strong: true },
      ]
    : [];

  return (
    <section style={{ marginTop: 28 }} aria-labelledby="costs-title">
      <div className="ov-page-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 id="costs-title" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Custos e resultado
          </h2>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
            {monthLabel}: o que entrou menos o que saiu.
          </p>
        </div>
        <button type="button" className="ov-btn ov-btn-primary" onClick={() => setOpen((v) => !v)}>
          <Plus size={16} /> Lançar custo
        </button>
      </div>

      {cards.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 12,
            marginBottom: 14,
          }}
        >
          {cards.map((c) => (
            <div key={c.label} className="ov-card" style={{ padding: 16 }}>
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginTop: 6,
                  color: c.strong ? (negative ? '#B91C1C' : '#15803D') : '#0A0A0F',
                }}
              >
                {negative && c.strong ? `− ${formatMoney(result.slice(1))}` : formatMoney(c.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="ov-card"
          style={{ padding: 16, marginBottom: 14, display: 'grid', gap: 12 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label className="ov-label" htmlFor="cost-cat">
                Categoria
              </label>
              <select
                id="cost-cat"
                className="ov-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((k) => (
                  <option key={k} value={k}>
                    {EXPENSE_CATEGORIES[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ov-label" htmlFor="cost-amount">
                Valor (R$)
              </label>
              <input
                id="cost-amount"
                className="ov-input"
                inputMode="decimal"
                placeholder="80,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="ov-label" htmlFor="cost-desc">
                Descrição (opcional)
              </label>
              <input
                id="cost-desc"
                className="ov-input"
                maxLength={200}
                placeholder="Ex.: tubulação de cobre"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#6D28D9' }}
              />
              Já paguei
            </label>
            {!paid && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                Vence em
                <input
                  className="ov-input"
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
            )}
          </div>
          {error && (
            <p role="alert" style={{ color: '#B91C1C', fontSize: 14, margin: 0 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ov-btn ov-btn-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? 'Salvando…' : 'Salvar custo'}
            </button>
            <button
              type="button"
              className="ov-btn ov-btn-secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="ov-card" style={{ overflow: 'hidden' }}>
        {costs.length === 0 ? (
          <p
            className="muted"
            style={{ padding: 24, margin: 0, textAlign: 'center', fontSize: 14 }}
          >
            Nenhum custo lançado neste mês.
          </p>
        ) : (
          <table className="ov-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Situação</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.id}>
                  <td data-label="Categoria">
                    {EXPENSE_CATEGORIES[c.category as ExpenseCategory] ?? c.category}
                  </td>
                  <td data-label="Descrição" className="muted">
                    {c.description || '—'}
                  </td>
                  <td data-label="Situação">
                    {c.status === 'PAID'
                      ? `Pago em ${day(c.paid_at)}`
                      : `Previsto ${day(c.due_date)}`}
                  </td>
                  <td data-label="Valor" style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(c.amount)}
                  </td>
                  <td data-label="" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.status === 'PENDING' && (
                      <button
                        type="button"
                        className="ov-btn ov-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: 12, marginRight: 8 }}
                        onClick={() => void run(() => payExpense(c.id))}
                      >
                        <Check size={14} /> Paguei
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Excluir custo"
                      className="ov-btn ov-btn-secondary"
                      style={{ padding: '4px 8px' }}
                      onClick={() => {
                        if (confirm(`Excluir o custo de ${formatMoney(c.amount)}?`))
                          void run(() => deleteExpense(c.id));
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
