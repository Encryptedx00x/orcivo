import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import { Plus, Users, FileText, ClipboardList, Calendar, DollarSign, Package } from 'lucide-react';

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const COLORS: Record<string, { background: string; color: string }> = {
    slate:   { background: '#F1F5F9', color: '#334155' },
    warning: { background: '#FEF3C7', color: '#92400E' },
    success: { background: '#DCFCE7', color: '#166534' },
    danger:  { background: '#FEE2E2', color: '#991B1B' },
    info:    { background: '#E0F2FE', color: '#075985' },
    brand:   { background: '#F5F3FF', color: '#4C1D95' },
  };
  const c = COLORS[k] ?? COLORS.slate;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 9999, ...c }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {children}
    </span>
  );
}

interface DashboardData {
  quotes_pending: number;
  work_orders_open: number;
  revenue_month: string;
  next_appointment: string | null;
}

export default async function DashboardPage(): Promise<JSX.Element> {
  let data: DashboardData | null = null;
  try {
    data = await apiFetch<DashboardData>('/company/me/dashboard');
  } catch {}

  const kpis = [
    { label: 'Orçamentos pendentes', value: String(data?.quotes_pending ?? '—'), sub: 'aguardando aprovação', k: 'info' },
    { label: 'OS em aberto', value: String(data?.work_orders_open ?? '—'), sub: 'ordens ativas', k: 'warning' },
    { label: 'Receita do mês', value: data?.revenue_month ? `R$ ${Number(data.revenue_month).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—', sub: 'orçamentos aprovados', k: 'success' },
    { label: 'Próximo agendamento', value: data?.next_appointment ? new Date(data.next_appointment).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Nenhum', sub: data?.next_appointment ? new Date(data.next_appointment).toLocaleDateString('pt-BR') : '—', k: 'brand' },
  ];

  const quickActions = [
    { icon: Users, label: 'Novo cliente', href: '/clientes/novo' },
    { icon: FileText, label: 'Novo orçamento', href: '/orcamentos/novo' },
    { icon: ClipboardList, label: 'Ordens de serviço', href: '/ordens-de-servico' },
    { icon: Calendar, label: 'Agenda', href: '/agenda' },
    { icon: DollarSign, label: 'Financeiro', href: '/financeiro' },
    { icon: Package, label: 'Catálogo', href: '/catalogo' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Início</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>Resumo da operação</div>
        </div>
        <div className="row-flex">
          <Link href="/clientes/novo" className="ov-btn ov-btn-outline"><Users size={16} />Novo cliente</Link>
          <Link href="/orcamentos/novo" className="ov-btn ov-btn-primary"><Plus size={16} />Novo orçamento</Link>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {kpis.map((m, i) => (
          <div key={i} className="ov-card ov-card-body ov-metric">
            <div className="label">{m.label}</div>
            <div className="value">{m.value}</div>
            <div style={{ marginTop: 8 }}><Pill k={m.k}>{m.sub}</Pill></div>
          </div>
        ))}
      </div>

      {/* Two-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Agenda card */}
        <div className="ov-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Agenda de hoje</h3>
            <Link href="/agenda" style={{ fontSize: 13, color: '#5B21B6', fontWeight: 500, textDecoration: 'none' }}>Ver tudo →</Link>
          </div>
          {([
            ['09:00', 'Visita técnica', 'Cliente A', 'warning'],
            ['11:30', 'Instalação', 'Cliente B', 'brand'],
            ['14:00', 'Orçamento presencial', 'Cliente C', 'info'],
            ['16:00', 'Retorno cliente', 'Cliente D', 'slate'],
          ] as [string, string, string, string][]).map(([t, e, c, s], i, a) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : undefined }}>
              <div style={{ width: 56, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 13, color: '#0A0A0F' }}>{t}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{e}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{c}</div>
              </div>
              <Pill k={s}>{s === 'warning' ? 'Em execução' : s === 'brand' ? 'Agendada' : s === 'info' ? 'Aberta' : 'Pendente'}</Pill>
            </div>
          ))}
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ov-card">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Ações rápidas</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {quickActions.map(({ icon: Icon, label, href }, x) => (
                <Link
                  key={x}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0 18px', height: 56,
                    borderRight: x % 2 === 0 ? '1px solid #F1F5F9' : 'none',
                    borderTop: x > 1 ? '1px solid #F1F5F9' : 'none',
                    fontSize: 13, fontWeight: 500, color: '#0A0A0F', textDecoration: 'none',
                  }}
                >
                  <Icon size={18} color="#6D28D9" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activities */}
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: '#0A0A0F' }}>Últimas atividades</h3>
      <div className="ov-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748B', width: 48, fontWeight: 600 }}>—</div>
          <div style={{ flex: 1, fontSize: 13 }}>Nenhuma atividade recente registrada</div>
          <Pill k="slate">sem dados</Pill>
        </div>
      </div>
    </div>
  );
}
