import { apiFetch } from '../../../lib/api';
import { formatMoney } from '@orcivo/shared-types';
import { FileText, Wrench, TrendingUp, Clock } from 'lucide-react';

interface DashboardData {
  quotes_pending: number;
  work_orders_open: number;
  revenue_month: string;
  next_appointment: string | null;
}

async function fetchDashboard(): Promise<DashboardData | null> {
  try {
    return await apiFetch<DashboardData>('/company/me/dashboard');
  } catch {
    return null;
  }
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function KpiCard({ icon, label, value, sub, accent = '#6D28D9' }: KpiCardProps): JSX.Element {
  return (
    <div style={{
      backgroundColor: '#fff', border: '1px solid #E2E8F0',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        backgroundColor: accent + '14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0F', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const data = await fetchDashboard();

  const quotesPending = data?.quotes_pending ?? '—';
  const workOrdersOpen = data?.work_orders_open ?? '—';
  const revenueMonth = data ? formatMoney(data.revenue_month) : '—';
  const nextAppointment = data?.next_appointment
    ? new Date(data.next_appointment).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', marginBottom: 24 }}>Início</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}>
        <KpiCard
          icon={<FileText size={22} />}
          label="Orçamentos pendentes"
          value={String(quotesPending)}
          sub="aguardando aprovação"
          accent="#6D28D9"
        />
        <KpiCard
          icon={<Wrench size={22} />}
          label="OS em aberto"
          value={String(workOrdersOpen)}
          sub="ordens de serviço ativas"
          accent="#0284C7"
        />
        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Receita do mês"
          value={revenueMonth}
          sub="orçamentos aprovados"
          accent="#059669"
        />
        <KpiCard
          icon={<Clock size={22} />}
          label="Próximo agendamento"
          value={nextAppointment ?? 'Nenhum'}
          accent="#D97706"
        />
      </div>
    </div>
  );
}
