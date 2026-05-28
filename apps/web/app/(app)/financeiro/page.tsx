'use client';
import { DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const COLORS: Record<string, { background: string; color: string }> = {
    slate:   { background: '#F1F5F9', color: '#334155' },
    warning: { background: '#FEF3C7', color: '#92400E' },
    success: { background: '#DCFCE7', color: '#166534' },
    danger:  { background: '#FEE2E2', color: '#991B1B' },
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

export default function FinanceiroPage(): JSX.Element {
  const kpis = [
    { icon: DollarSign, label: 'Recebido no período', value: 'R$ 0,00', sub: '0 lançamentos', k: 'success' },
    { icon: Clock, label: 'Pendente', value: 'R$ 0,00', sub: '0 lançamentos', k: 'warning' },
    { icon: AlertCircle, label: 'Vencido', value: 'R$ 0,00', sub: '0 lançamentos', k: 'danger' },
    { icon: TrendingUp, label: 'Ticket médio', value: 'R$ 0,00', sub: 'sem dados', k: 'brand' },
  ];

  // Decorative bars
  const bars = Array.from({ length: 30 }, (_, i) => {
    const h = 30 + ((Math.sin(i * 0.7) + 1) * 0.5 * 70) + (i % 5 === 0 ? 20 : 0);
    return { h: Math.min(h, 100), highlight: i > 25 };
  });

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Financeiro</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="row-flex">
          <button className="ov-btn ov-btn-outline">Exportar</button>
          <button className="ov-btn ov-btn-primary"><span style={{ fontSize: 18, lineHeight: 1 }}>+</span>Registrar recebimento</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {kpis.map((m, i) => (
          <div key={i} className="ov-card ov-card-body ov-metric">
            <div className="label">{m.label}</div>
            <div className="value" style={{ fontSize: 24 }}>{m.value}</div>
            <div style={{ marginTop: 8 }}><Pill k={m.k}>{m.sub}</Pill></div>
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div className="ov-card ov-card-body" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Recebido por dia</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Últimos 30 dias</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['7d', '30d', '90d'] as const).map((t, i) => (
              <Pill key={t} k={i === 1 ? 'brand' : 'slate'}>{t}</Pill>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
          {bars.map((b, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${b.h}%`,
                background: b.highlight ? '#6D28D9' : '#DDD6FE',
                borderRadius: '3px 3px 0 0',
              }}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 14, display: 'flex', gap: 10, borderBottom: '1px solid #F1F5F9' }}>
          <select className="ov-input" style={{ width: 180, height: 36 }}>
            <option>{new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</option>
          </select>
          <select className="ov-input" style={{ width: 160, height: 36 }}>
            <option>Todos os status</option>
            <option>Pago</option>
            <option>Pendente</option>
            <option>Vencido</option>
          </select>
          <select className="ov-input" style={{ width: 160, height: 36 }}>
            <option>Todos os métodos</option>
            <option>PIX</option>
            <option>Dinheiro</option>
            <option>Cartão</option>
            <option>Transferência</option>
          </select>
        </div>
        <table className="ov-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Origem</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th>Método</th>
              <th>Status</th>
              <th>Vencimento</th>
              <th>Pago em</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#64748B', padding: '32px 16px' }}>
                Nenhum lançamento encontrado para o período selecionado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
