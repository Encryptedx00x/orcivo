import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { catalogService } from '../../../../../lib/catalog.service';
import { updateCatalogItemAction } from '../../actions';

interface Props {
  params: { id: string };
}

export default async function EditarCatalogoPage({ params }: Props): Promise<JSX.Element> {
  let item = null;
  let loadError = false;

  try {
    const items = await catalogService.fetchCatalog(false);
    item = items.find(i => i.id === params.id) ?? null;
  } catch {
    loadError = true;
  }

  if (loadError || !item) {
    return (
      <div>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '16px', color: '#DC2626' }}>
          {loadError ? 'Erro ao carregar item. Tente novamente.' : 'Item não encontrado.'}
        </div>
        <Link href="/catalogo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 16, color: '#6D28D9', textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={16} /> Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const updateAction = updateCatalogItemAction.bind(null, params.id);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/catalogo" style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={16} /> Catálogo
        </Link>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0F', margin: 0 }}>Editar item</h1>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 28, maxWidth: 580 }}>
        <form action={updateAction} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Nome */}
          <div>
            <label htmlFor="name" style={labelStyle}>Nome *</label>
            <input id="name" name="name" type="text" required defaultValue={item.name} style={inputStyle} />
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="type" style={labelStyle}>Tipo *</label>
            <select id="type" name="type" required defaultValue={item.type} style={inputStyle}>
              <option value="SERVICE">Serviço</option>
              <option value="PRODUCT">Produto</option>
            </select>
          </div>

          {/* Preço */}
          <div>
            <label htmlFor="unit_price" style={labelStyle}>Preço unitário *</label>
            <input id="unit_price" name="unit_price" type="text" required defaultValue={item.unit_price} pattern="^\d+([.,]\d{1,2})?$" style={inputStyle} />
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Use vírgula ou ponto como separador decimal.</p>
          </div>

          {/* Unidade */}
          <div>
            <label htmlFor="unit" style={labelStyle}>Unidade (opcional)</label>
            <input id="unit" name="unit" type="text" defaultValue={item.unit ?? ''} placeholder="hr, un, m²" style={inputStyle} />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" style={labelStyle}>Descrição (opcional)</label>
            <textarea id="description" name="description" defaultValue={item.description ?? ''} placeholder="Detalhe o serviço ou produto..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Ativo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              value="true"
              defaultChecked={item.is_active}
              style={{ width: 16, height: 16, accentColor: '#6D28D9', cursor: 'pointer' }}
            />
            <label htmlFor="is_active" style={{ fontSize: 14, color: '#374151', cursor: 'pointer' }}>Item ativo</label>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button type="submit" style={btnPrimary}>Salvar alterações</button>
            <Link href="/catalogo" style={btnSecondary}>Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, color: '#0A0A0F', border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#fff', boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { backgroundColor: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnSecondary: React.CSSProperties = { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: 14, textDecoration: 'none', display: 'inline-block' };
