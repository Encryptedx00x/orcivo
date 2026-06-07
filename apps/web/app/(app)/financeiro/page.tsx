import { sumDecimal, formatMoney } from '@orcivo/shared-types';
import { quoteService, type Quote } from '../../../lib/quote.service';
import {
  FinanceiroContent,
  type FinanceEntry,
  type FinanceKpi,
  type ChartBar,
} from './FinanceiroContent';

const DAYS = 30;

function ddmm(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function FinanceiroPage(): Promise<JSX.Element> {
  let quotes: Quote[] = [];
  try {
    const res = await quoteService.fetchQuotes(1);
    quotes = res.data;
  } catch {}

  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());

  // ── Entries (todos os orçamentos, mais recentes primeiro) ──
  const entries: FinanceEntry[] = quotes.map(q => ({
    id: q.id,
    customer: q.customer.name,
    origin: `ORÇ #${q.number}`,
    value: formatMoney(q.total),
    status: q.status,
    date: ddmm(q.created_at),
    approvedAt: q.status === 'APPROVED' ? ddmm(q.approval?.approved_at ?? q.created_at) : '—',
  }));

  // ── KPIs (somas com Decimal, nunca float) ──
  const sumByStatus = (s: Quote['status']) => {
    const vals = quotes.filter(q => q.status === s).map(q => q.total);
    return vals.length ? sumDecimal(vals) : '0.00';
  };
  const approvedTotal = sumByStatus('APPROVED');
  const sentTotal = sumByStatus('SENT');
  const approvedCount = quotes.filter(q => q.status === 'APPROVED').length;
  const sentCount = quotes.filter(q => q.status === 'SENT').length;
  const allTotals = quotes.map(q => q.total);
  const grandTotal = allTotals.length ? sumDecimal(allTotals) : '0.00';
  const avgTicket = quotes.length
    ? formatMoney((Number(grandTotal) / quotes.length).toFixed(2))
    : formatMoney('0');

  const kpis: FinanceKpi[] = [
    { label: 'Aprovado', value: formatMoney(approvedTotal), sub: `${approvedCount} orçamento${approvedCount === 1 ? '' : 's'}` },
    { label: 'Aguardando aprovação', value: formatMoney(sentTotal), sub: `${sentCount} enviado${sentCount === 1 ? '' : 's'}` },
    { label: 'Total em orçamentos', value: formatMoney(grandTotal), sub: `${quotes.length} no total` },
    { label: 'Ticket médio', value: avgTicket, sub: 'por orçamento' },
  ];

  // ── Chart: valor aprovado por dia (últimos 30 dias) ──
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Array(DAYS).fill(0) as number[];
  for (const q of quotes) {
    if (q.status !== 'APPROVED') continue;
    const ref = q.approval?.approved_at ?? q.created_at;
    if (!ref) continue;
    const d = new Date(ref);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((today.getTime() - dayStart.getTime()) / 86_400_000);
    if (diff >= 0 && diff < DAYS) buckets[DAYS - 1 - diff] += Number(q.total);
  }
  const bars: ChartBar[] = buckets.map((v, i) => ({ h: v, highlight: i >= DAYS - 5 }));

  return <FinanceiroContent entries={entries} kpis={kpis} bars={bars} monthLabel={monthLabel} />;
}
