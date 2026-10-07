'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { formatMoney, parseMoneyInput } from '@orcivo/shared-types';

export type EditablePayment = {
  id: string;
  customer: string;
  amount: string;
  method: 'PIX' | 'BOLETO' | 'CARTAO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'OUTRO' | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';
  dueDate: string | null;
  paidAt: string | null;
};

type PaymentMethod = NonNullable<EditablePayment['method']>;
type PaymentStatus = EditablePayment['status'];

const T = { ink: '#0A0A0F', fg3: '#64748B', danger: '#DC2626' };

function dateInputValue(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function toIsoDate(value: string): string | null {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

function ModalFrame({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-change-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(10,10,15,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 28,
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 20px 40px rgba(15,23,42,.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <h2
            id="payment-change-title"
            style={{ margin: 0, color: T.ink, fontSize: 18, fontWeight: 700 }}
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{
              display: 'flex',
              border: 0,
              background: 'transparent',
              color: T.fg3,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PaymentEditModal({
  payment,
  onClose,
  onChanged,
}: {
  payment: EditablePayment;
  onClose: () => void;
  onChanged: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [amount, setAmount] = useState(payment.amount.replace('.', ','));
  const [method, setMethod] = useState<PaymentMethod>(payment.method ?? 'PIX');
  const [status, setStatus] = useState<PaymentStatus>(payment.status);
  const [date, setDate] = useState(
    dateInputValue(payment.status === 'PAID' ? payment.paidAt : payment.dueDate),
  );
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const decimalAmount = parseMoneyInput(amount);
    if (!decimalAmount) {
      setError('Informe um valor positivo com até duas casas decimais.');
      return;
    }
    if (justification.trim().length < 3) {
      setError('Informe uma justificativa com pelo menos 3 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const dateValue = toIsoDate(date);
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: decimalAmount,
          method,
          status,
          justification: justification.trim(),
          // Only the date being edited changes: a paid charge keeps its due date.
          ...(status === 'PAID' ? { paid_at: dateValue } : { due_date: dateValue, paid_at: null }),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? 'Não foi possível atualizar o recebimento.');
      }
      onChanged();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao atualizar o recebimento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalFrame title="Editar recebimento" onClose={onClose}>
      <p style={{ margin: '0 0 16px', color: T.fg3, fontSize: 13 }}>Cliente: {payment.customer}</p>
      {error ? (
        <div role="alert" style={alertStyle}>
          {error}
        </div>
      ) : null}
      <form onSubmit={submit}>
        <div style={twoColumns}>
          <Field label="Valor (R$) *" htmlFor="payment-edit-amount">
            <input
              id="payment-edit-amount"
              className="ov-input"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              required
            />
          </Field>
          <Field label="Método" htmlFor="payment-edit-method">
            <select
              id="payment-edit-method"
              className="ov-input"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            >
              <option value="PIX">Pix</option>
              <option value="BOLETO">Boleto</option>
              <option value="CARTAO">Cartão</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="TRANSFERENCIA">Transferência</option>
              <option value="OUTRO">Outro</option>
            </select>
          </Field>
        </div>
        <div style={{ ...twoColumns, marginTop: 12 }}>
          <Field label="Situação" htmlFor="payment-edit-status">
            <select
              id="payment-edit-status"
              className="ov-input"
              value={status}
              onChange={(event) => setStatus(event.target.value as PaymentStatus)}
            >
              <option value="PAID">Recebido</option>
              <option value="PENDING">Pendente</option>
              <option value="OVERDUE">Vencido</option>
              <option value="PARTIAL">Parcial</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </Field>
          <Field
            label={status === 'PAID' ? 'Data do recebimento' : 'Vencimento'}
            htmlFor="payment-edit-date"
          >
            <input
              id="payment-edit-date"
              className="ov-input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="ov-label" htmlFor="payment-edit-justification">
            Justificativa *
          </label>
          <textarea
            id="payment-edit-justification"
            className="ov-input"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            maxLength={500}
            required
            rows={3}
            placeholder="Explique a alteração deste recebimento"
            style={{ resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            className="ov-btn ov-btn-outline"
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="ov-btn ov-btn-primary"
            style={{ flex: 1 }}
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function PaymentDeleteModal({
  payment,
  onClose,
  onChanged,
}: {
  payment: EditablePayment;
  onClose: () => void;
  onChanged: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const [justification, setJustification] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (justification.trim().length < 3) {
      setError('Informe uma justificativa com pelo menos 3 caracteres.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification: justification.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? 'Não foi possível excluir o recebimento.');
      }
      onChanged();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao excluir o recebimento.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ModalFrame title="Excluir recebimento" onClose={onClose}>
      <p style={{ margin: '0 0 16px', color: T.fg3, fontSize: 13 }}>
        O recebimento de {formatMoney(payment.amount)} de {payment.customer} deixará de aparecer no
        financeiro, mas continuará preservado no histórico.
      </p>
      {error ? (
        <div role="alert" style={alertStyle}>
          {error}
        </div>
      ) : null}
      <form onSubmit={submit}>
        <label className="ov-label" htmlFor="payment-delete-justification">
          Justificativa *
        </label>
        <textarea
          id="payment-delete-justification"
          className="ov-input"
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          maxLength={500}
          required
          rows={3}
          placeholder="Explique a exclusão deste recebimento"
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            className="ov-btn ov-btn-outline"
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={deleting}
            className="ov-btn"
            style={{ flex: 1, color: '#fff', background: T.danger, borderColor: T.danger }}
          >
            {deleting ? (
              'Excluindo…'
            ) : (
              <>
                <Trash2 size={15} /> Excluir
              </>
            )}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <label className="ov-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

const twoColumns = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const alertStyle = {
  marginBottom: 14,
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #FECACA',
  background: '#FEE2E2',
  color: T.danger,
  fontSize: 13,
};
