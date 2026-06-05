'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ClipboardList, Search, ChevronRight, Plus } from 'lucide-react';
import type { WorkOrder } from '../../../lib/work-order.service';

const SM: Record<WorkOrder['status'], [string, string]> = {
  PENDING:     ['warning', 'Pendente'],
  IN_PROGRESS: ['warning', 'Em execução'],
  DONE:        ['success', 'Finalizada'],
  CANCELLED:   ['danger',  'Cancelada'],
};

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const COLORS: Record<string, { background: string; color: string }> = {
    slate:   { background: '#F1F5F9', color: '#334155' },
    warning: { background: '#FEF3C7', color: '#92400E' },
    success: { background: '#DCFCE7', color: '#166534' },
    danger:  { background: '#FEE2E2', color: '#991B1B' },
  };
  const c = COLORS[k] ?? COLORS.slate;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 9999, ...c }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {children}
    </span>
  );
}

export function OSContent({ orders }: { orders: WorkOrder[] }): JSX.Element {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = orders.filter(o => {
    const matchQ = !q || o.title?.toLowerCase().includes(q.toLowerCase()) || o.customer?.name?.toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
    return matchQ && matchStatus;
  });

  const activeCount = orders.filter(o => ['PENDING', 'IN_PROGRESS'].includes(o.status)).length;

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Ordens de Serviço</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{activeCount} ativas · {orders.length} no total</div>
        </div>
        <div>
          <Link href="/ordens-de-servico/novo" className="ov-btn ov-btn-primary" style={{ gap: 8, textDecoration: 'none' }}>
            <Plus size={16} />Nova OS
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="ov-card" style={{ padding: 14, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div className="ov-search" style={{ flex: 1 }}>
          <Search size={16} color="#64748B" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar OS, cliente…" />
        </div>
        <select className="ov-input" style={{ width: 180, height: 36 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="IN_PROGRESS">Em execução</option>
          <option value="DONE">Finalizada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="ov-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <ClipboardList size={40} style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', margin: '0 0 6px' }}>Nenhuma ordem de serviço encontrada.</p>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>As ordens são criadas pelo aplicativo mobile pelos técnicos em campo.</p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="ov-card" style={{ overflow: 'hidden' }}>
          <table className="ov-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Status</th>
                <th>Agendada para</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/ordens-de-servico/${order.id}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#6D28D9', textDecoration: 'none' }}>
                      #{order.number}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 500 }}>{order.customer?.name ?? '—'}</td>
                  <td className="muted">{order.title ?? '—'}</td>
                  <td><Pill k={SM[order.status]?.[0] ?? 'slate'}>{SM[order.status]?.[1] ?? order.status}</Pill></td>
                  <td className="muted" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {order.scheduled_at ? new Date(order.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/ordens-de-servico/${order.id}`} style={{ color: '#94A3B8', display: 'inline-flex' }}>
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
