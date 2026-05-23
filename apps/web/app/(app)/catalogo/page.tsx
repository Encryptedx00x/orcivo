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
            borderRadius: 8, padding: '8px 18px',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          <Plus size={16} /> Novo item
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#DC2626', marginBottom: 16 }}>
          Erro ao carregar catálogo. Tente novamente mais tarde.
        </div>
      )}

      {/* Empty state */}
      {!error && items.length === 0 && (
        <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '32px 16px', textAlign: 'center', color: '#6B7280' }}>
          <Package size={40} style={{ margin: '0 auto 12px', color: '#D1D5DB' }} />
          <p style={{ fontWeight: 600 }}>Nenhum item no catálogo.</p>
          <p style={{ fontSize: 14 }}>Adicione o primeiro item para começar.</p>
        </div>
      )}

      {/* Table */}
      {!error && items.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
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
                <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={td}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    {item.description && (
                      <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{item.description}</p>
                    )}
                  </td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      backgroundColor: item.type === 'SERVICE' ? '#EDE9FE' : '#DBEAFE',
                      color: item.type === 'SERVICE' ? '#6D28D9' : '#1D4ED8',
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
                      color: item.is_active ? '#065F46' : '#6B7280',
                    }}>
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={td}>
                    <Link
                      href={`/catalogo/${item.id}/editar`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6D28D9', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
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

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#6B7280', fontWeight: 600 };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#0A0A0F' };
