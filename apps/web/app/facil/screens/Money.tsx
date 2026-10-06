'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react';
import { formatMoney, sumDecimal } from '@orcivo/shared-types';
import {
  deletePayment,
  getClient,
  getCompany,
  listPayments,
  settlePayment,
  type EasyPayment,
} from '../actions';
import { useLoad, useNav } from '../EasyApp';
import { MoreButton, reasonSheet, useSheet } from '../sheet';
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

const PERIODS = [
  { value: 'month', label: 'Este mês' },
  { value: 'last', label: 'Mês passado' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este ano' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

function inPeriod(iso: string, period: Period): boolean {
  const d = new Date(iso);
  const now = new Date();
  if (period === 'month')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'last') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
  }
  if (period === '3m') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return d.getFullYear() === now.getFullYear();
}

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

const kpiIcon = (bg: string, fg: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  background: bg,
  color: fg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 6,
});
const kpiValue: React.CSSProperties = {
  fontSize: 22,
  lineHeight: '28px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
};

export function MoneyScreen(): React.JSX.Element {
  const { go } = useNav();
  const toast = useToast();
  const sheet = useSheet();
  const payments = useLoad(listPayments);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [paidLimit, setPaidLimit] = useState(PAGE);
  const [period, setPeriod] = useState<Period>('month');
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'Este mês';

  const all = useMemo(() => payments.data ?? [], [payments.data]);
  const dues = all.filter(
    (p) => p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'PARTIAL',
  );
  const paid = all
    .filter((p) => p.status === 'PAID' && p.paid_at && inPeriod(p.paid_at, period))
    .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''));
  const late = dues.filter((p) => dueChip(p).kind === 'late').length;
  const sum = (list: EasyPayment[]) =>
    list.length ? sumDecimal(list.map((p) => p.amount)) : '0.00';

  const settle = async (p: EasyPayment, method: string) => {
    const r = await settlePayment(p.id, method);
    if (!r.ok) return toast(r.message);
    setOpen(null);
    toast(`Pronto! ${formatMoney(p.amount)} recebido. O recibo já está em Recibos.`);
    payments.reload();
  };

  const charge = async (p: EasyPayment) => {
    if (!p.customer) return toast('Este recebimento não tem cliente.');
    const [client, company] = await Promise.all([getClient(p.customer.id), getCompany()]);
    const digits = client.ok ? (client.data.phone ?? '').replace(/\D/g, '') : '';
    if (!digits) return toast('Este cliente não tem telefone.');
    const due = p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : null;
    const late = dueChip(p).kind === 'late';
    const pix = company.ok && company.data.pix_key ? `\nChave Pix: ${company.data.pix_key}` : '';
    const text =
      `Olá, ${p.customer.name.split(' ')[0]}! Passando para lembrar do pagamento de ${formatMoney(p.amount)}` +
      (due ? (late ? `, que venceu em ${due}.` : `, com vencimento em ${due}.`) : '.') +
      pix;
    window.open(
      `https://wa.me/55${digits.replace(/^55(?=\d{10,11}$)/, '')}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener',
    );
  };

  const remove = (p: EasyPayment) =>
    reasonSheet(
      sheet,
      'Por que excluir?',
      ['Lançado errado', 'Cliente desistiu', 'Valor duplicado', 'Outro motivo'],
      async (reason) => {
        const r = await deletePayment(p.id, reason);
        if (!r.ok) return toast(r.message);
        toast(`Recebimento excluído: ${reason.toLowerCase()}.`);
        payments.reload();
      },
      Trash2,
    );

  const dueMore = (p: EasyPayment) =>
    sheet({
      title: p.customer?.name ?? 'Recebimento',
      sub: formatMoney(p.amount),
      actions: [
        { label: 'Cobrar no WhatsApp', icon: MessageCircle, run: () => void charge(p) },
        {
          label: 'Mudar valor ou vencimento',
          icon: Pencil,
          run: () =>
            go('edit', {
              kind: 'payment',
              id: p.id,
              amount: p.amount,
              due: p.due_date ?? undefined,
              name: p.customer?.name,
            }),
        },
        { label: 'Excluir recebimento', icon: Trash2, danger: true, run: () => remove(p) },
      ],
    });

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Financeiro</H1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn
          icon={Plus}
          height={56}
          onClick={() =>
            sheet({
              title: 'Registrar recebimento',
              sub: 'Gera o recibo junto',
              actions: [
                {
                  label: 'De um orçamento ou serviço',
                  icon: FileText,
                  run: () => go('receiptNew', { link: '1' }),
                },
                {
                  label: 'Avulso',
                  sub: 'Sem orçamento nem serviço',
                  icon: Plus,
                  run: () => go('receiptNew'),
                },
                {
                  label: 'Cobrança para receber depois',
                  sub: 'Com vencimento, sem recibo ainda',
                  icon: Clock,
                  run: () => (window.location.href = '/financeiro?registrar=1'),
                },
              ],
            })
          }
          style={{ fontSize: 17 }}
        >
          Registrar
        </Btn>
        <Btn
          tone="outline"
          icon={Calendar}
          iconColor={C.purple}
          height={56}
          onClick={() =>
            sheet({
              title: 'Ver qual período?',
              sub: 'Muda o recebido e a lista de recebidos',
              actions: PERIODS.map((pp) => ({
                label: pp.value === period ? `${pp.label} · atual` : pp.label,
                icon: pp.value === period ? CheckCircle : Calendar,
                run: () => {
                  setPeriod(pp.value);
                  setPaidLimit(PAGE);
                },
              })),
            })
          }
          style={{ fontSize: 17 }}
        >
          {periodLabel}
        </Btn>
      </div>
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
              <span style={kpiIcon('#DCFCE7', C.green)}>
                <CheckCircle size={22} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>Recebido</span>
              <span style={kpiValue}>{formatMoney(sum(paid))}</span>
              <span style={{ fontSize: 15, color: C.fg3 }}>{periodLabel.toLowerCase()}</span>
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
              <span style={kpiIcon('#FEF3C7', '#B45309')}>
                <Clock size={22} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>A receber</span>
              <span style={kpiValue}>{formatMoney(sum(dues))}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: late ? '#B91C1C' : '#166534' }}>
                {late ? `${late} ${late > 1 ? 'atrasados' : 'atrasado'}` : 'Tudo em dia'}
              </span>
            </div>
          </div>

          {dues.length === 0 && paid.length === 0 ? (
            <EmptyBox
              icon={DollarSign}
              title="Nada por aqui neste período."
              text="Quando um serviço tiver valor a receber, ele aparece aqui. Toque em Registrar para lançar um pagamento."
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
                      <span style={{ ...kpiValue, whiteSpace: 'nowrap' }}>
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
                            <Btn
                              key={m.value}
                              height={56}
                              onClick={() => void settle(p, m.value)}
                              style={{ fontSize: 17 }}
                            >
                              {m.label}
                            </Btn>
                          ))}
                        </div>
                        <Btn tone="link" onClick={() => setOpen(null)} style={{ color: C.fg2 }}>
                          Fechar
                        </Btn>
                      </div>
                    )}
                    <MoreButton icon={MoreHorizontal} onClick={() => dueMore(p)} />
                  </div>
                );
              })}
              {dues.length > limit && (
                <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
                  Ver mais {Math.min(PAGE, dues.length - limit)} de {dues.length - limit}
                </Btn>
              )}
              {paid.length > 0 && (
                <>
                  <span style={{ fontSize: 20, fontWeight: 700, margin: '10px 4px 0' }}>
                    Recebidos · {periodLabel.toLowerCase()}
                  </span>
                  <div style={{ ...card, padding: '4px 16px' }}>
                    {paid.slice(0, paidLimit).map((p, i, arr) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          minHeight: 68,
                          padding: '10px 0',
                          borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.line}`,
                        }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: 17, fontWeight: 600 }}>
                            {p.customer?.name ?? 'Cliente'}
                          </span>
                          <span style={{ fontSize: 15, color: C.fg3 }}>
                            {formatMoney(p.amount)} · {methodLabel(p.method)} ·{' '}
                            {new Date(p.paid_at as string).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => go('receipt', { id: p.id })}
                          style={{
                            height: 48,
                            padding: '0 4px',
                            border: 'none',
                            background: 'transparent',
                            color: C.purple700,
                            fontSize: 16,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            flexShrink: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          <ReceiptText size={20} aria-hidden="true" /> Recibo
                        </button>
                      </div>
                    ))}
                  </div>
                  {paid.length > paidLimit && (
                    <Btn tone="link" onClick={() => setPaidLimit((l) => l + PAGE)}>
                      Ver mais {Math.min(PAGE, paid.length - paidLimit)} de{' '}
                      {paid.length - paidLimit}
                    </Btn>
                  )}
                </>
              )}
            </div>
          )}
          <Btn
            tone="link"
            icon={ChevronRight}
            onClick={() => (window.location.href = '/financeiro')}
          >
            Financeiro completo (tabela, filtros e histórico)
          </Btn>
        </>
      )}
    </>
  );
}
