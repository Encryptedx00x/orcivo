'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Package, Search, ChevronRight, Upload } from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { isLowStock, type InventoryItem } from './inventory';

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const COLORS: Record<string, { background: string; color: string }> = {
    slate: { background: '#F1F5F9', color: '#334155' },
    success: { background: '#DCFCE7', color: '#166534' },
    brand: { background: '#F5F3FF', color: '#4C1D95' },
    warning: { background: '#FEF3C7', color: '#92400E' },
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

const TYPE_LABEL: Record<string, string> = {
  SERVICE: 'Serviço',
  PRODUCT: 'Produto',
  LABOR: 'Mão de obra',
};

export function CatalogoContent({ items }: { items: InventoryItem[] }): React.JSX.Element {
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = items.filter((it) => {
    const matchQ = !q || it.name.toLowerCase().includes(q.toLowerCase());
    const matchType = typeFilter === 'todos' || it.type === typeFilter;
    const matchStatus =
      statusFilter === 'todos' || (statusFilter === 'active' ? it.is_active : !it.is_active);
    return matchQ && matchType && matchStatus;
  });

  const activeCount = items.filter((i) => i.is_active).length;
  const inactiveCount = items.length - activeCount;

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
            Catálogo
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {activeCount} itens ativos · {inactiveCount} inativos
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link href="/catalogo/importar" className="ov-btn ov-btn-secondary">
            <Upload size={16} />
            Importar CSV/JSON
          </Link>
          <Link href="/catalogo/novo" className="ov-btn ov-btn-primary">
            <Plus size={16} />
            Novo item
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
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div className="ov-search" style={{ flex: 1 }}>
          <Search size={16} color="#64748B" />
          <input
            aria-label="Buscar no catálogo"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar no catálogo…"
          />
        </div>
        <select
          className="ov-input"
          style={{ width: 160, height: 36 }}
          value={typeFilter}
          aria-label="Filtrar por tipo"
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="todos">Todos os tipos</option>
          <option value="SERVICE">Serviço</option>
          <option value="PRODUCT">Produto</option>
        </select>
        <select
          className="ov-input"
          style={{ width: 160, height: 36 }}
          value={statusFilter}
          aria-label="Filtrar por status"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="todos">Ativos e inativos</option>
          <option value="active">Somente ativos</option>
          <option value="inactive">Somente inativos</option>
        </select>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="ov-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Package
            size={40}
            style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }}
          />
          <p style={{ fontWeight: 600, color: '#0A0A0F', margin: '0 0 6px' }}>
            Nenhum item encontrado.
          </p>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px' }}>
            Ajuste os filtros ou adicione novos itens ao catálogo.
          </p>
          <Link
            href="/catalogo/novo"
            className="ov-btn ov-btn-primary"
            style={{ display: 'inline-flex' }}
          >
            <Plus size={16} />
            Adicionar item
          </Link>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="ov-card" style={{ overflowX: 'auto' }}>
          <table className="ov-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Item</th>
                <th>Unidade</th>
                <th>Estoque</th>
                <th style={{ textAlign: 'right' }}>Preço de custo</th>
                <th style={{ textAlign: 'right' }}>Preço de venda</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td data-label="Tipo">
                    <Pill k="brand">{TYPE_LABEL[item.type] ?? item.type}</Pill>
                  </td>
                  <td
                    data-label="Item"
                    style={{ fontWeight: 500, color: item.is_active ? '#0A0A0F' : '#64748B' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={`Foto de ${item.name}`}
                          width={40}
                          height={40}
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td data-label="Unidade" className="muted">
                    {item.unit ?? '—'}
                  </td>
                  <td data-label="Estoque">
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
                    >
                      <span>{item.quantity ?? '—'}</span>
                      {isLowStock(item) && <Pill k="warning">Estoque baixo</Pill>}
                    </div>
                  </td>
                  <td
                    data-label="Preço de custo"
                    style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {item.cost_price !== undefined ? formatMoney(item.cost_price) : '—'}
                  </td>
                  <td
                    data-label="Preço de venda"
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                    }}
                  >
                    {formatMoney(item.sale_price ?? item.unit_price)}
                  </td>
                  <td data-label="Status">
                    {item.is_active ? (
                      <Pill k="success">Ativo</Pill>
                    ) : (
                      <Pill k="slate">Inativo</Pill>
                    )}
                  </td>
                  <td data-label="" style={{ textAlign: 'right' }}>
                    <Link
                      href={`/catalogo/${item.id}/editar`}
                      aria-label={`Editar ${item.name}`}
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
    </div>
  );
}
