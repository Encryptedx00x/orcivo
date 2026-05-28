import Link from 'next/link';
import { Pencil, Plus, Package } from 'lucide-react';
import { catalogService, CatalogItem } from '../../../lib/catalog.service';
import { formatMoney } from '@orcivo/shared-types';

export default async function CatalogoPage(): Promise<JSX.Element> {
  let items: CatalogItem[] = [];
  let error = false;

  try {
    items = await catalogService.fetchCatalog(false);
  } catch {
    error = true;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Catálogo</h1>
        <Link
          href="/catalogo/novo"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            backgroundColor: '#6D28D9', color: '#fff',
            borderRadius: 12, padding: '8px 18px',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          <Plus size={16} /> Novo item
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', color: '#DC2626', marginBottom: 16 }}>
          Erro ao carregar catálogo. Tente novamente mais tarde.
        </div>
      )}

      {/* Empty state */}
      {!error && items.length === 0 && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <Package size={40} style={{ margin: '0 auto 16px', color: '#94A3B8', display: 'block' }} />
          <p style={{ fontWeight: 600, color: '#0A0A0F', marginBottom: 6 }}>Nenhum item no catálogo.</p>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>Adicione serviços e produtos para usar nos orçamentos.</p>
          <Link href="/catalogo/novo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#6D28D9', color: '#fff', borderRadius: 10, padding: '8px 18px', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
            <Plus size={16} /> Adicionar primeiro item
          </Link>
        </div>
      )}

      {/* Table */}
      {!error && items.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <th style={th}>Nome</th>
                <th style={th}>Tipo</th>
                <th style={th}>Preço</th>
                <th style={th}>Unidade</th>
                <th style={th}>Status</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={td}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    {item.description && (
                      <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{item.description}</p>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      backgroundColor: item.type === 'SERVICE' ? '#EDE9FE' : '#F1F5F9',
                      color: item.type === 'SERVICE' ? '#6D28D9' : '#475569',
                    }}>
                      {item.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                    </span>
                  </td>
                  <td style={td}>{formatMoney(item.unit_price)}</td>
                  <td style={td}>{item.unit ?? '—'}</td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      backgroundColor: item.is_active ? '#D1FAE5' : '#F3F4F6',
                      color: item.is_active ? '#065F46' : '#64748B',
                    }}>
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={td}>
                    <Link
                      href={`/catalogo/${item.id}/editar`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6D28D9', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
                    >
                      <Pencil size={14} /> Editar
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

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#64748B', fontWeight: 600 };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#0A0A0F' };
