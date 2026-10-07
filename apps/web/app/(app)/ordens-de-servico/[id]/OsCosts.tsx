'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  formatMoney,
  parseMoneyInput,
  subtractDecimal,
  sumDecimal,
  type ExpenseCategory,
} from '@orcivo/shared-types';
import { createExpense, deleteExpense } from '../../financeiro/expense-actions';
import type { CostRow } from '../../financeiro/CostsSection';

const label: React.CSSProperties = {
  fontSize: 11,
  color: '#64748B',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  marginBottom: 6,
};
const mono = { fontFamily: 'JetBrains Mono, monospace' };

/** Costs tied to this work order + profit so far (received − paid costs). */
export function OsCosts({
  workOrderId,
  costs,
  received,
}: {
  workOrderId: string;
  costs: CostRow[];
  received: string;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('MATERIAL');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const paid = sumDecimal(costs.filter((c) => c.status === 'PAID').map((c) => c.amount));
  const profit = subtractDecimal(received, paid);
  const negative = profit.startsWith('-');

  async function save() {
    const value = parseMoneyInput(amount);
    if (!value) return setError('Informe o valor, ex.: 80,00');
    setBusy(true);
    setError('');
    const r = await createExpense({
      category,
      amount: value,
      description: description.trim() || undefined,
      status: 'PAID',
      work_order_id: workOrderId,
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setOpen(false);
    setAmount('');
    setDescription('');
    router.refresh();
  }

  return (
    <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 12, paddingTop: 10 }}>
      <div style={label}>Custos desta OS</div>
      {costs.map((c) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>
            {EXPENSE_CATEGORIES[c.category as ExpenseCategory] ?? c.category}
            {c.description ? ` — ${c.description}` : ''}
          </span>
          <span style={{ ...mono, fontSize: 12 }}>{formatMoney(c.amount)}</span>
          <button
            type="button"
            aria-label="Excluir custo"
            onClick={async () => {
              if (!confirm(`Excluir o custo de ${formatMoney(c.amount)}?`)) return;
              const r = await deleteExpense(c.id);
              if (!r.ok) alert(r.message);
              router.refresh();
            }}
            style={{
              height: 26,
              padding: '0 6px',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              background: '#fff',
              color: '#DC2626',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      {costs.length === 0 && !open ? (
        <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px' }}>
          Nenhum custo lançado. Lance material, combustível e ajudante para ver o lucro.
        </p>
      ) : null}
      {open ? (
        <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
          <select
            aria-label="Categoria do custo"
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
          <input
            aria-label="Valor do custo"
            className="ov-input"
            inputMode="decimal"
            placeholder="Valor, ex.: 80,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            aria-label="Descrição do custo"
            className="ov-input"
            maxLength={200}
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error ? (
            <p role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}>
              {error}
            </p>
          ) : null}
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
      ) : (
        <button
          type="button"
          className="ov-btn ov-btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
          onClick={() => setOpen(true)}
        >
          <Plus size={14} /> Lançar custo
        </button>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: 14,
          borderTop: '1px solid #F1F5F9',
          marginTop: 10,
          paddingTop: 8,
        }}
      >
        <span>Lucro até agora</span>
        <span style={{ ...mono, color: negative ? '#B91C1C' : '#15803D' }}>
          {negative ? `− ${formatMoney(profit.slice(1))}` : formatMoney(profit)}
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
        Recebido menos custos pagos desta OS.
      </p>
    </div>
  );
}
