'use client';

import { useState } from 'react';
import { Check, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { formatMoney, sumDecimal } from '@orcivo/shared-types';
import { listPayments, settlePayment, type EasyPayment } from '../actions';
import { useLoad } from '../EasyApp';
import {
  Btn,
  C,
  Chip,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  card,
  useToast,
  type ChipKind,
} from '../ui';
import { menuRow } from './Clients';

const METHODS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
];
const methodLabel = (m: string | null) => METHODS.find((x) => x.value === m)?.label ?? '—';
const PAGE = 10;

function dueChip(p: EasyPayment): { kind: ChipKind; label: string } {
  if (!p.due_date) return { kind: 'draft', label: 'Sem vencimento' };
  const due = new Date(p.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - today.getTime()) /
      86_400_000,
  );
  if (p.status === 'OVERDUE' || days < 0)
    return {
      kind: 'late',
      label: `Atrasado há ${Math.max(1, -days)} ${-days === 1 ? 'dia' : 'dias'}`,
    };
  if (days === 0) return { kind: 'wait', label: 'Vence hoje' };
  if (days === 1) return { kind: 'wait', label: 'Vence amanhã' };
  return {
    kind: 'draft',
    label: `Vence ${due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
  };
}
const ref = (p: EasyPayment) =>
  p.work_order
    ? `Serviço #${p.work_order.number}`
    : p.quote
      ? `Orçamento #${p.quote.number}`
      : p.description || 'Recebimento';

export function MoneyScreen(): JSX.Element {
  const toast = useToast();
  const payments = useLoad(listPayments);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const all = payments.data ?? [];
  const dues = all.filter(
    (p) => p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'PARTIAL',
  );
  const now = new Date();
  const paidMonth = all.filter(
    (p) =>
      p.status === 'PAID' &&
      p.paid_at &&
      new Date(p.paid_at).getMonth() === now.getMonth() &&
      new Date(p.paid_at).getFullYear() === now.getFullYear(),
  );
  const paidToday = paidMonth.filter(
    (p) => new Date(p.paid_at as string).toDateString() === now.toDateString(),
  );
  const late = dues.filter((p) => dueChip(p).kind === 'late').length;
  const sum = (list: EasyPayment[]) =>
    list.length ? sumDecimal(list.map((p) => p.amount)) : '0.00';

  const settle = async (p: EasyPayment, method: string) => {
    const r = await settlePayment(p.id, method);
    if (!r.ok) return toast(r.message);
    setOpen(null);
    toast(`Pronto! ${formatMoney(p.amount)} recebido.`);
    payments.reload();
  };

  return (
    <>
      <H1>Financeiro</H1>
      {payments.loading && !payments.data ? (
        <Loading />
      ) : payments.error ? (
        <ErrorBox title="Não foi possível carregar o financeiro." onRetry={payments.reload} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div
              style={{
                ...card,
                borderRadius: 24,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: '#DCFCE7',
                  color: C.green,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}
              >
                <CheckCircle size={22} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>Recebido</span>
              <span
                style={{
                  fontSize: 22,
                  lineHeight: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(sum(paidMonth))}
              </span>
              <span style={{ fontSize: 15, color: C.fg3 }}>
                em {now.toLocaleDateString('pt-BR', { month: 'long' })}
              </span>
            </div>
            <div
              style={{
                ...card,
                borderRadius: 24,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: '#FEF3C7',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                }}
              >
                <Clock size={22} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>A receber</span>
              <span
                style={{
                  fontSize: 22,
                  lineHeight: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(sum(dues))}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600, color: late ? '#B91C1C' : '#166534' }}>
                {late ? `${late} ${late > 1 ? 'atrasados' : 'atrasado'}` : 'Tudo em dia'}
              </span>
            </div>
          </div>

          {dues.length === 0 && paidToday.length === 0 ? (
            <EmptyBox
              icon={DollarSign}
              title="Nada para receber."
              text="Quando um serviço tiver valor a receber, ele aparece aqui."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dues.length > 0 && (
                <span style={{ fontSize: 20, fontWeight: 700, margin: '6px 4px 0' }}>
                  A receber
                </span>
              )}
              {dues.slice(0, limit).map((p) => {
                const chip = dueChip(p);
                return (
                  <div
                    key={p.id}
                    style={{
                      ...card,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 600 }}>
                        {p.customer?.name ?? 'Cliente'}
                      </span>
                      <span style={{ fontSize: 15, color: C.fg3 }}>{ref(p)}</span>
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px 12px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          letterSpacing: '-0.01em',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatMoney(p.amount)}
                      </span>
                      <Chip kind={chip.kind} label={chip.label} />
                    </div>
                    {open !== p.id ? (
                      <Btn tone="soft" icon={Check} height={56} onClick={() => setOpen(p.id)}>
                        Marcar como pago
                      </Btn>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          borderTop: `1px solid ${C.line}`,
                          paddingTop: 12,
                        }}
                      >
                        <span style={{ fontSize: 17, fontWeight: 700 }}>Como recebeu?</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {METHODS.map((m) => (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => void settle(p, m.value)}
                              style={{
                                height: 56,
                                borderRadius: 14,
                                border: 'none',
                                background: C.purple,
                                color: '#FFFFFF',
                                fontSize: 17,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                        <Btn tone="link" onClick={() => setOpen(null)} style={{ color: C.fg2 }}>
                          Fechar
                        </Btn>
                      </div>
                    )}
                  </div>
                );
              })}
              {dues.length > limit && (
                <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
                  Ver mais {Math.min(PAGE, dues.length - limit)} de {dues.length - limit}
                </Btn>
              )}
              {paidToday.length > 0 && (
                <>
                  <span style={{ fontSize: 20, fontWeight: 700, margin: '10px 4px 0' }}>
                    Recebidos hoje
                  </span>
                  <div style={{ ...card, padding: '4px 16px' }}>
                    {paidToday.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          minHeight: 64,
                          borderBottom: `1px solid ${C.line}`,
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: 17, fontWeight: 600 }}>
                            {p.customer?.name ?? 'Cliente'}
                          </span>
                          <span style={{ fontSize: 15, color: C.fg3 }}>
                            {formatMoney(p.amount)} · {methodLabel(p.method)}
                          </span>
                        </span>
                        <Chip kind="ok" label="Pago" small />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <a
            href="/financeiro"
            style={{
              ...menuRow,
              ...card,
              justifyContent: 'center',
              color: C.purple700,
              fontSize: 17,
            }}
          >
            Mais opções (recebimento avulso, editar, período)
          </a>
        </>
      )}
    </>
  );
}
