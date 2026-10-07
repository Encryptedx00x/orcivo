import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { catalogService } from '../../../../../lib/catalog.service';
import { updateCatalogItemAction } from '../../actions';
import { InventoryFields } from '../../InventoryFields';
import { CatalogForm } from '../../CatalogForm';
import { CatalogPhotoField } from '../../CatalogPhotoField';
import type { InventoryItem } from '../../inventory';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCatalogoPage(props: Props): Promise<React.JSX.Element> {
  const params = await props.params;
  let item: InventoryItem | null = null;
  let loadError = false;

  try {
    const items = (await catalogService.fetchCatalog(false)) as InventoryItem[];
    item = items.find((i) => i.id === params.id) ?? null;
  } catch {
    loadError = true;
  }

  if (loadError || !item) {
    return (
      <div>
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            padding: '16px',
            color: '#DC2626',
          }}
        >
          {loadError ? 'Erro ao carregar item. Tente novamente.' : 'Item não encontrado.'}
        </div>
        <Link
          href="/catalogo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 16,
            color: '#6D28D9',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} /> Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const updateAction = updateCatalogItemAction.bind(null, params.id);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link
          href="/catalogo"
          style={{
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} /> Catálogo
        </Link>
        <span style={{ color: '#94A3B8' }}>/</span>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0F', margin: 0 }}>Editar item</h1>
      </div>

      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: 28,
          maxWidth: 580,
        }}
      >
        <CatalogForm action={updateAction}>
          {/* Nome */}
          <div>
            <label htmlFor="name" style={labelStyle}>
              Nome *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              defaultValue={item.name}
              style={inputStyle}
            />
          </div>

          {/* Tipo */}
          <div>
            <label htmlFor="type" style={labelStyle}>
              Tipo *
            </label>
            <select id="type" name="type" required defaultValue={item.type} style={inputStyle}>
              <option value="SERVICE">Serviço</option>
              <option value="PRODUCT">Produto</option>
            </select>
          </div>

          <InventoryFields item={item} />

          <CatalogPhotoField photoUrl={item.photo_url} itemName={item.name} />

          {/* Unidade */}
          <div>
            <label htmlFor="unit" style={labelStyle}>
              Unidade (opcional)
            </label>
            <input
              id="unit"
              name="unit"
              type="text"
              maxLength={20}
              defaultValue={item.unit ?? ''}
              placeholder="hr, un, m²"
              style={inputStyle}
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" style={labelStyle}>
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              name="description"
              maxLength={1000}
              defaultValue={item.description ?? ''}
              placeholder="Detalhe o serviço ou produto..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
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
            <label
              htmlFor="is_active"
              style={{ fontSize: 14, color: '#334155', cursor: 'pointer' }}
            >
              Item ativo
            </label>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button type="submit" style={btnPrimary}>
              Salvar alterações
            </button>
            <Link href="/catalogo" style={btnSecondary}>
              Cancelar
            </Link>
          </div>
        </CatalogForm>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  color: '#0A0A0F',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  backgroundColor: '#6D28D9',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '10px 24px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  backgroundColor: '#F8FAFC',
  color: '#334155',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '10px 24px',
  fontWeight: 600,
  fontSize: 14,
  textDecoration: 'none',
  display: 'inline-block',
};
