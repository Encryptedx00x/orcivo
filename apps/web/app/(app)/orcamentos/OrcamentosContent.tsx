'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, FileText, ChevronRight } from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import type { Quote } from '../../../lib/quote.service';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'DRAFT', label: 'Rascunho' },
  { id: 'SENT', label: 'Pendentes' },
  { id: 'APPROVED', label: 'Aprovados' },
  { id: 'REJECTED', label: 'Rejeitados' },
  { id: 'EXPIRED', label: 'Expirados' },
];

const STATUS_LABEL: Record<Quote['status'], string> = {
  DRAFT: 'Rascunho', SENT: 'Pendente', APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado', CANCELLED: 'Cancelado', EXPIRED: 'Expirado',
};
const STATUS_BADGE: Record<Quote['status'], string> = {
  DRAFT: 'slate', SENT: 'warning', APPROVED: 'success',
  REJECTED: 'danger', CANCELLED: 'slate', EXPIRED: 'slate',
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

export function OrcamentosContent({ quotes }: { quotes: Quote[] }): JSX.Element {
  const [tab, setTab] = useState('todos');
  const filtered = tab === 'todos' ? quotes : quotes.filter(q => q.status === tab);

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Orçamentos</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{quotes.length} no total</div>
        </div>
        <div className="row-flex">
          <Link href="/orcamentos/novo" className="ov-btn ov-btn-primary"><Plus size={16} />Novo orçamento</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="ov-tabs">
        {TABS.map(t => (
          <div key={t.id} className={`ov-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="ov-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <FileText size={40} style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', margin: '0 0 6px' }}>Nenhum orçamento encontrado.</p>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px' }}>
            {tab === 'todos' ? 'Crie o primeiro orçamento para começar.' : `Nenhum orçamento com status "${TABS.find(t2 => t2.id === tab)?.label}".`}
          </p>
          {tab === 'todos' && (
            <Link href="/orcamentos/novo" className="ov-btn ov-btn-primary" style={{ display: 'inline-flex' }}>
              <Plus size={14} />Criar primeiro orçamento
            </Link>
          )}
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
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th>Validade</th>
                <th>Criado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/orcamentos/${q.id}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#6D28D9', textDecoration: 'none' }}>
                      #{q.number}
                    </Link>
                  </td>
                  <td><span style={{ fontWeight: 600 }}>{q.customer.name}</span></td>
                  <td><Pill k={STATUS_BADGE[q.status]}>{STATUS_LABEL[q.status]}</Pill></td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{formatMoney(q.total)}</td>
                  <td className="muted">{q.valid_until ? new Date(q.valid_until).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="muted">{q.created_at ? new Date(q.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/orcamentos/${q.id}`} style={{ color: '#94A3B8', display: 'inline-flex' }}><ChevronRight size={16} /></Link>
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
