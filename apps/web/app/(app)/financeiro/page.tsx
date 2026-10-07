import {
  averageDecimal,
  decimalPercentage,
  formatMoney,
  maxDecimal,
  sumDecimal,
  type FinanceSummary,
} from '@orcivo/shared-types';
import { CostsSection, type CostRow } from './CostsSection';
import { apiFetch } from '../../../lib/api';
import { methodLabel } from '../../../lib/receipts';
import {
  FinanceiroContent,
  type PaymentRow,
  type FinanceKpi,
  type ChartBar,
  type CustomerOption,
} from './FinanceiroContent';

const DAYS = 30;

interface ApiPayment {
  id: string;
  amount: string;
  method: string | null;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  customer: { id: string; name: string };
}

function ddmm(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function FinanceiroPage(): Promise<React.JSX.Element> {
  const now0 = new Date();
  const monthFrom = new Date(now0.getFullYear(), now0.getMonth(), 1).toISOString();
  const monthTo = new Date(now0.getFullYear(), now0.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const [paymentsRes, customersRes, costsRes, summary] = await Promise.all([
    apiFetch<{ data: ApiPayment[] }>('/payments'),
    apiFetch<{ data: Array<{ id: string; name: string }> }>('/customers?limit=200'),
    apiFetch<{ data: CostRow[] }>(`/expenses?from=${monthFrom}&to=${monthTo}`).catch(() => ({
      data: [] as CostRow[],
    })),
    apiFetch<FinanceSummary>(`/finance/summary?from=${monthFrom}&to=${monthTo}`).catch(() => null),
  ]);
  const payments: ApiPayment[] = paymentsRes.data;
  const customers: CustomerOption[] = customersRes.data.map((c) => ({ id: c.id, name: c.name }));

  const now = new Date();
  const monthLabel = now
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase());

  const entries: PaymentRow[] = payments.map((p) => ({
    id: p.id,
    customer: p.customer?.name ?? '—',
    description: p.description ?? '',
    amount: formatMoney(p.amount),
    amountDecimal: p.amount,
    method: p.method ? methodLabel(p.method) : '—',
    rawMethod: p.method as PaymentRow['rawMethod'],
    status: p.status,
    due: ddmm(p.due_date),
    dueDate: p.due_date,
    paidAt: p.paid_at ? ddmm(p.paid_at) : '—',
    paidAtDate: p.paid_at,
    revision: p.updated_at,
  }));

  const sumBy = (pred: (p: ApiPayment) => boolean) => {
    const vals = payments.filter(pred).map((p) => p.amount);
    return vals.length ? sumDecimal(vals) : '0.00';
  };
  const received = sumBy((p) => p.status === 'PAID');
  const pending = sumBy((p) => p.status === 'PENDING' || p.status === 'PARTIAL');
  const overdue = sumBy((p) => p.status === 'OVERDUE');
  const receivedCount = payments.filter((p) => p.status === 'PAID').length;
  const pendingCount = payments.filter(
    (p) => p.status === 'PENDING' || p.status === 'PARTIAL',
  ).length;
  const overdueCount = payments.filter((p) => p.status === 'OVERDUE').length;
  const avgTicket = formatMoney(
    averageDecimal(payments.filter((p) => p.status === 'PAID').map((p) => p.amount)),
  );

  const kpis: FinanceKpi[] = [
    {
      label: 'Recebido no período',
      value: formatMoney(received),
      sub: `${receivedCount} recebimento${receivedCount === 1 ? '' : 's'}`,
    },
    { label: 'Pendente', value: formatMoney(pending), sub: `${pendingCount} em aberto` },
    {
      label: 'Vencido',
      value: formatMoney(overdue),
      sub: `${overdueCount} recebimento${overdueCount === 1 ? '' : 's'}`,
      danger: overdueCount > 0,
    },
    { label: 'Ticket médio', value: avgTicket, sub: 'por recebimento' },
  ];

  // Chart: recebido por dia (últimos 30 dias)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Array(DAYS).fill('0.00') as string[];
  for (const p of payments) {
    if (p.status !== 'PAID' || !p.paid_at) continue;
    const d = new Date(p.paid_at);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((today.getTime() - dayStart.getTime()) / 86_400_000);
    if (diff >= 0 && diff < DAYS) {
      const bucketIndex = DAYS - 1 - diff;
      buckets[bucketIndex] = sumDecimal([buckets[bucketIndex], p.amount]);
    }
  }
  const chartMaximum = maxDecimal(buckets);
  const bars: ChartBar[] = buckets.map((value, i) => ({
    percent: decimalPercentage(value, chartMaximum),
    highlight: i >= DAYS - 5,
    amount: formatMoney(value),
    date: new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (DAYS - 1 - i),
    ).toLocaleDateString('pt-BR'),
  }));

  return (
    <>
      <FinanceiroContent
        entries={entries}
        kpis={kpis}
        bars={bars}
        monthLabel={monthLabel}
        customers={customers}
      />
      <CostsSection costs={costsRes.data} summary={summary} monthLabel={monthLabel} />
    </>
  );
}
