'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { parseMoneyInput } from '@orcivo/shared-types';

export interface PaymentCustomerOption {
  id: string;
  name: string;
}

interface WorkOrderReference {
  id: string;
  number: number;
  title: string;
}

interface Props {
  customers: PaymentCustomerOption[];
  onClose: () => void;
  workOrder?: WorkOrderReference;
}

type PaymentMethod = 'PIX' | 'BOLETO' | 'CARTAO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'OUTRO';
type PaymentStatus = 'PAID' | 'PENDING';

const T = { ink: '#0A0A0F', fg3: '#64748B', danger: '#DC2626' };

function toIsoDate(date: string): string | undefined {
  return date ? new Date(`${date}T12:00:00`).toISOString() : undefined;
}

export function PaymentRegistrationModal({ customers, onClose, workOrder }: Props): JSX.Element {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(workOrder ? (customers[0]?.id ?? '') : '');
  const [description, setDescription] = useState(
    workOrder ? `OS #${workOrder.number} — ${workOrder.title}` : '',
  );
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [status, setStatus] = useState<PaymentStatus>('PAID');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const decimalAmount = parseMoneyInput(amount);
    if (!customerId) {
      setError('Selecione um cliente.');
      return;
    }
    if (!decimalAmount) {
      setError('Informe um valor positivo com até duas casas decimais.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const isoDate = toIsoDate(date);
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          work_order_id: workOrder?.id,
          description: description.trim() || undefined,
          amount: decimalAmount,
          method,
          status,
          ...(status === 'PAID' ? { paid_at: isoDate } : { due_date: isoDate }),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? 'Não foi possível registrar o recebimento.');
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao registrar o recebimento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-registration-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,15,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <div>
            <h2
              id="payment-registration-title"
              style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}
            >
              Registrar recebimento
            </h2>
            {workOrder && (
              <p style={{ margin: '4px 0 0', color: T.fg3, fontSize: 13 }}>
                Vinculado à OS #{workOrder.number}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: T.fg3,
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <div
            role="alert"
            style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '10px 14px',
              color: T.danger,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label className="ov-label" htmlFor="payment-customer">
              Cliente *
            </label>
            <select
              id="payment-customer"
              className="ov-input"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              required
              disabled={Boolean(workOrder)}
            >
              {!workOrder && <option value="">Selecione</option>}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="ov-label" htmlFor="payment-description">
              Descrição
            </label>
            <input
              id="payment-description"
              className="ov-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex: entrada do serviço"
              maxLength={200}
            />
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
          >
            <div>
              <label className="ov-label" htmlFor="payment-amount">
                Valor (R$) *
              </label>
              <input
                id="payment-amount"
                className="ov-input"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="890,00"
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <label className="ov-label" htmlFor="payment-method">
                Método
              </label>
              <select
                id="payment-method"
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
            </div>
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}
          >
            <div>
              <label className="ov-label" htmlFor="payment-status">
                Situação
              </label>
              <select
                id="payment-status"
                className="ov-input"
                value={status}
                onChange={(event) => setStatus(event.target.value as PaymentStatus)}
              >
                <option value="PAID">Recebido</option>
                <option value="PENDING">A receber</option>
              </select>
            </div>
            <div>
              <label className="ov-label" htmlFor="payment-date">
                {status === 'PAID' ? 'Data do recebimento' : 'Vencimento'}
              </label>
              <input
                id="payment-date"
                className="ov-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
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
              {saving ? 'Salvando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
