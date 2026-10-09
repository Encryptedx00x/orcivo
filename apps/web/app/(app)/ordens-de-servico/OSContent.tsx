'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClipboardList, Columns3, List, Search, ChevronRight, Plus } from 'lucide-react';
import {
  WORK_ORDER_STATUS_LABELS,
  formatMoney,
  type WorkOrderStatus,
} from '@orcivo/shared-types';
import type { WorkOrder } from '../../../lib/work-order.service';
import { LoadMore, usePagedList } from '../../../lib/use-paged-list';
import { useAuth } from '../../../components/AuthProvider';
import { loadWorkOrdersPage } from './list-actions';
import { workOrderAction, type WorkOrderAction, type WorkOrderWithActions } from './actions';

/** Cor por status (visual only) — o texto vem do shared-types (regra única). */
const SM: Record<WorkOrderStatus, string> = {
  PENDING: 'warning',
  IN_PROGRESS: 'warning',
  DONE: 'success',
  CANCELLED: 'danger',
  AWAITING_PAYMENT: 'info',
  WARRANTY: 'purple',
};

const VIEW_PREFERENCE_KEY = 'orcivo:work-orders:view';
type WorkOrderView = 'list' | 'columns';

function viewPreferenceKey(userName?: string): string {
  const user = userName?.trim().toLocaleLowerCase('pt-BR') || 'anonymous';
  return `${VIEW_PREFERENCE_KEY}:${encodeURIComponent(user)}`;
}

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const COLORS: Record<string, { background: string; color: string }> = {
    slate: { background: '#F1F5F9', color: '#334155' },
    warning: { background: '#FEF3C7', color: '#92400E' },
    success: { background: '#DCFCE7', color: '#166534' },
    danger: { background: '#FEE2E2', color: '#991B1B' },
    info: { background: '#DBEAFE', color: '#1E40AF' },
    purple: { background: '#EDE9FE', color: '#4C1D95' },
  };
  const c = COLORS[k] ?? COLORS.slate;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 9px',
        borderRadius: 9999,
        ...c,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {children}
    </span>
  );
}

export function OSContent({ orders: firstPage }: { orders: WorkOrder[] }): React.JSX.Element {
  const { user } = useAuth();
  const list = usePagedList(firstPage, loadWorkOrdersPage);
  const orders = list.items;
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [techFilter, setTechFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('este-mes');
  const [view, setView] = useState<WorkOrderView>('list');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const preferenceKey = viewPreferenceKey(user?.name);

  useEffect(() => {
    try {
      // Migrate the former browser-wide key once, so an existing preference
      // is retained while subsequent changes stay scoped to this user.
      const savedForUser = window.localStorage.getItem(preferenceKey);
      const legacyView = window.localStorage.getItem(VIEW_PREFERENCE_KEY);
      const savedView = savedForUser ?? legacyView;
      if (savedView === 'list' || savedView === 'columns') {
        setView(savedView);
        window.localStorage.setItem(preferenceKey, savedView);
      }
      // Consume the browser-wide legacy value. Keeping it would make every
      // subsequent user inherit the first user's former preference.
      if (legacyView !== null) window.localStorage.removeItem(VIEW_PREFERENCE_KEY);
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [preferenceKey]);

  function selectView(nextView: WorkOrderView): void {
    setView(nextView);
    try {
      window.localStorage.setItem(preferenceKey, nextView);
    } catch {
      // The selected view remains available until this page is closed.
    }
  }

  // Quick forward steps straight from the list; cancel/reopen need a reason, so they stay in the detail.
  async function quick(order: WorkOrder, action: WorkOrderAction): Promise<void> {
    setBusyId(order.id);
    setActionError('');
    const result = await workOrderAction(order.id, { action });
    setBusyId(null);
    if (result.error) setActionError(`OS #${order.number}: ${result.error}`);
    // Lib types the list with the legacy status union; the action result can
    // carry the R5b extras — runtime is the same object shape.
    else if (result.order) list.replace({ ...order, ...result.order } as WorkOrder);
  }

  const technicianNames = Array.from(
    new Set(orders.map((o) => o.technician?.name).filter(Boolean) as string[]),
  );

  const filtered = orders.filter((o) => {
    const matchQ =
      !q ||
      o.title?.toLowerCase().includes(q.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === 'todos' || o.status === statusFilter;
    const matchTech = techFilter === 'todos' || o.technician?.name === techFilter;
    return matchQ && matchStatus && matchTech;
  });

  const activeCount = orders.filter((o) => ['PENDING', 'IN_PROGRESS'].includes(o.status)).length;

  const fmtDate = (s?: string | null) =>
    s
      ? new Date(s).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })
      : '—';

  const fmtMoney = (v?: string | null) => (v ? formatMoney(v) : '—');

  function quickActions(order: WorkOrder): React.JSX.Element | null {
    const actions = (['iniciar', 'concluir'] as const).filter((action) =>
      ((order as WorkOrderWithActions).allowed_actions ?? []).includes(action),
    );
    if (actions.length === 0) return null;

    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className="ov-btn ov-btn-secondary"
            disabled={busyId === order.id}
            onClick={() => void quick(order, action)}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            {busyId === order.id ? '…' : action === 'iniciar' ? 'Iniciar' : 'Concluir'}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: 0,
            }}
          >
            Ordens de Serviço
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {activeCount} ativas · {orders.length}
            {list.done ? '' : '+'} no total
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            role="group"
            aria-label="Visualização das ordens de serviço"
            style={{ display: 'inline-flex', padding: 3, border: '1px solid #E2E8F0', borderRadius: 10 }}
          >
            <button
              type="button"
              className="ov-btn"
              aria-pressed={view === 'list'}
              onClick={() => selectView('list')}
              title="Visualizar como lista"
              style={{
                minHeight: 32,
                padding: '0 9px',
                background: view === 'list' ? '#F1F5F9' : 'transparent',
                color: view === 'list' ? '#0F172A' : '#64748B',
              }}
            >
              <List size={16} aria-hidden="true" />
              <span className="sr-only">Lista</span>
            </button>
            <button
              type="button"
              className="ov-btn"
              aria-pressed={view === 'columns'}
              onClick={() => selectView('columns')}
              title="Visualizar por status"
              style={{
                minHeight: 32,
                padding: '0 9px',
                background: view === 'columns' ? '#F1F5F9' : 'transparent',
                color: view === 'columns' ? '#0F172A' : '#64748B',
              }}
            >
              <Columns3 size={16} aria-hidden="true" />
              <span className="sr-only">Por status</span>
            </button>
          </div>
          <Link
            href="/ordens-de-servico/novo"
            className="ov-btn ov-btn-primary"
            style={{ gap: 8, textDecoration: 'none' }}
          >
            <Plus size={16} />
            Nova OS
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div
        className="ov-card"
        style={{
          padding: 14,
          marginBottom: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div className="ov-search" style={{ flex: 1, minWidth: 180 }}>
          <Search size={16} color="#64748B" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar OS, cliente, técnico…"
          />
        </div>
        <select
          className="ov-input"
          style={{ width: 160, height: 36 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="todos">Todos os status</option>
          {(Object.keys(WORK_ORDER_STATUS_LABELS) as WorkOrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {WORK_ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="ov-input"
          style={{ width: 160, height: 36 }}
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
        >
          <option value="todos">Todos os técnicos</option>
          {technicianNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          className="ov-input"
          style={{ width: 140, height: 36 }}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="este-mes">Este mês</option>
          <option value="semana">Esta semana</option>
          <option value="tudo">Tudo</option>
        </select>
      </div>

      {/* Empty */}
      {actionError && (
        <p role="alert" style={{ color: '#B91C1C', fontSize: 14, margin: '0 0 12px' }}>
          {actionError}
        </p>
      )}
      {filtered.length === 0 && (
        <div className="ov-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <ClipboardList
            size={40}
            style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }}
          />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', margin: '0 0 6px' }}>
            Nenhuma ordem de serviço encontrada.
          </p>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
            As ordens são criadas pelo aplicativo mobile pelos técnicos em campo.
          </p>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 && view === 'list' && (
        <div className="ov-card" style={{ overflow: 'hidden' }}>
          <table className="ov-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Técnico</th>
                <th>Status</th>
                <th>Agendada</th>
                <th>Finalizada</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td data-label="Número">
                    <Link
                      href={`/ordens-de-servico/${order.id}`}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        color: '#6D28D9',
                        textDecoration: 'none',
                      }}
                    >
                      #{order.number}
                    </Link>
                  </td>
                  <td data-label="Cliente" style={{ fontWeight: 500 }}>
                    {order.customer?.name ?? '—'}
                  </td>
                  <td data-label="Serviço" className="muted">
                    {order.title ?? '—'}
                  </td>
                  <td data-label="Técnico" className="muted">
                    {order.technician?.name ?? '—'}
                  </td>
                  <td data-label="Status">
                    <Pill k={SM[order.status] ?? 'slate'}>
                      {WORK_ORDER_STATUS_LABELS[order.status]}
                    </Pill>
                  </td>
                  <td
                    data-label="Agendada"
                    className="muted"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                  >
                    {fmtDate(order.scheduled_at)}
                  </td>
                  <td
                    data-label="Finalizada"
                    className="muted"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                  >
                    {fmtDate(order.finished_at)}
                  </td>
                  <td
                    data-label="Total"
                    style={{
                      textAlign: 'right',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      color: '#0A0A0F',
                    }}
                  >
                    {fmtMoney(order.total ?? order.quote?.total)}
                  </td>
                  <td data-label="" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {quickActions(order)}
                    <Link
                      href={`/ordens-de-servico/${order.id}`}
                      style={{ color: '#94A3B8', display: 'inline-flex' }}
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Columns by status — deliberately no drag-and-drop: status changes keep using the domain actions. */}
      {filtered.length > 0 && view === 'columns' && (
        <div
          aria-label="Ordens de serviço por status"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Object.keys(WORK_ORDER_STATUS_LABELS).length}, minmax(250px, 1fr))`,
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {(Object.keys(WORK_ORDER_STATUS_LABELS) as WorkOrderStatus[]).map((status) => {
            const statusOrders = filtered.filter((order) => order.status === status);
            return (
              <section
                key={status}
                aria-labelledby={`status-column-${status}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h2
                    id={`status-column-${status}`}
                    style={{ color: '#334155', fontSize: 13, fontWeight: 700, margin: 0 }}
                  >
                    {WORK_ORDER_STATUS_LABELS[status]}
                  </h2>
                  <span aria-label={`${statusOrders.length} ordens`} style={{ color: '#64748B', fontSize: 12 }}>
                    {statusOrders.length}
                  </span>
                </div>
                {statusOrders.map((order) => (
                  <article key={order.id} className="ov-card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/ordens-de-servico/${order.id}`}
                          style={{ color: '#6D28D9', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                        >
                          #{order.number}
                        </Link>
                        <Link
                          href={`/ordens-de-servico/${order.id}`}
                          style={{ color: '#0A0A0F', display: 'block', fontSize: 14, fontWeight: 650, marginTop: 5, overflow: 'hidden', textDecoration: 'none', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {order.title ?? 'Serviço sem título'}
                        </Link>
                      </div>
                      <Pill k={SM[order.status] ?? 'slate'}>{WORK_ORDER_STATUS_LABELS[order.status]}</Pill>
                    </div>
                    <p style={{ color: '#475569', fontSize: 13, margin: '10px 0 4px' }}>
                      {order.customer?.name ?? 'Cliente não informado'}
                    </p>
                    <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>
                      {order.technician?.name ?? 'Sem técnico'} · Agendada: {fmtDate(order.scheduled_at)}
                    </p>
                    <div style={{ alignItems: 'center', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 10 }}>
                      <span style={{ color: '#0A0A0F', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700 }}>
                        {fmtMoney(order.total ?? order.quote?.total)}
                      </span>
                      {quickActions(order)}
                    </div>
                  </article>
                ))}
                {statusOrders.length === 0 && (
                  <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, padding: '12px 0' }}>Nenhuma OS</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <LoadMore list={list} />
    </div>
  );
}
