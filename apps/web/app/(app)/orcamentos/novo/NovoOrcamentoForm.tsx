'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { multiplyDecimal, sumDecimal, formatMoney } from '@orcivo/shared-types';

interface Customer { id: string; name: string; phone?: string | null; }
interface CatalogItem { id: string; name: string; unit_price: string; unit?: string; description?: string; }
interface QuoteItemRow {
  catalog_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
}

function safeMultiply(a: string, b: string): string {
  try { return multiplyDecimal(a || '0', b || '0'); } catch { return '0.00'; }
}
function safeSum(vals: string[]): string {
  try { return sumDecimal(vals); } catch { return '0.00'; }
}

export default function NovoOrcamentoForm(): JSX.Element {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState('0');
  const [items, setItems] = useState<QuoteItemRow[]>([
    { description: '', quantity: '1.000', unit_price: '0.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.data ?? [])).catch(() => {});
    fetch('/api/catalog').then(r => r.json()).then(d => setCatalog(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function addManualItem() {
    setItems(prev => [...prev, { description: '', quantity: '1.000', unit_price: '0.00' }]);
  }

  function addFromCatalog(item: CatalogItem) {
    setItems(prev => [...prev, {
      catalog_item_id: item.id,
      description: item.name,
      quantity: '1.000',
      unit_price: item.unit_price,
    }]);
    setShowCatalogDialog(false);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof QuoteItemRow, val: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  // Preview calculations (Decimal.js — never parseFloat)
  const itemTotals = items.map(it => safeMultiply(it.quantity || '0', it.unit_price || '0'));
  const subtotal = safeSum(itemTotals.length ? itemTotals : ['0']);
  const discountAmount = (() => {
    try {
      if (discountType === 'PERCENT') {
        // Convert percent to decimal fraction string for multiplyDecimal
        const pct = safeMultiply(discountValue || '0', '0.01');
        return safeMultiply(subtotal, pct);
      } else {
        return discountValue || '0.00';
      }
    } catch { return '0.00'; }
  })();
  const total = (() => {
    try {
      // subtotal - discountAmount usando sumDecimal com valor negativo
      const t = safeSum([subtotal, `-${discountAmount || '0'}`]);
      // Garantir que não seja negativo
      return t.startsWith('-') ? '0.00' : t;
    } catch { return subtotal; }
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!customerId) { setError('Selecione um cliente.'); return; }
    if (items.length === 0) { setError('Adicione pelo menos um item.'); return; }
    const invalidItem = items.find(it => !it.description || !it.quantity || !it.unit_price);
    if (invalidItem) { setError('Preencha todos os campos dos itens.'); return; }

    setLoading(true);
    try {
      const dto = {
        customer_id: customerId,
        title: title || undefined,
        valid_until: validUntil ? new Date(validUntil).toISOString() : undefined,
        discount_type: discountType,
        discount_value: discountValue || '0',
        items: items.map(it => ({
          catalog_item_id: it.catalog_item_id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      };
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao criar orçamento.' }));
        throw new Error(err.message ?? 'Erro ao criar orçamento.');
      }
      const created = await res.json();
      router.push(`/orcamentos/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Catalog dialog */}
      {showCatalogDialog && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 12, padding: 24,
            width: '90%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Selecionar do catálogo</h3>
              <button
                onClick={() => setShowCatalogDialog(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6B7280' }}
              >×</button>
            </div>
            {catalog.length === 0 ? (
              <p style={{ color: '#6B7280' }}>Nenhum item no catálogo.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <th style={th}>Nome</th>
                    <th style={th}>Preço</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={td}>
                        <span style={{ fontWeight: 500 }}>{item.name}</span>
                        {item.description && <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{item.description}</p>}
                      </td>
                      <td style={td}>{formatMoney(item.unit_price)}</td>
                      <td style={td}>
                        <button
                          onClick={() => addFromCatalog(item)}
                          style={btnPrimary}
                        >
                          Adicionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 760 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Novo orçamento</h1>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, padding: '12px 16px', color: '#DC2626', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={card}>
          <h2 style={sectionTitle}>Dados gerais</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Cliente *</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Selecione um cliente</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Título (opcional)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Instalação de câmeras"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Válido até (opcional)</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Tipo de desconto</label>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                style={inputStyle}
              >
                <option value="PERCENT">Percentual (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Desconto</label>
              <input
                type="text"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value.replace(',', '.'))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={sectionTitle}>Itens</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowCatalogDialog(true)}
                style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <BookOpen size={14} /> Do catálogo
              </button>
              <button
                type="button"
                onClick={addManualItem}
                style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={14} /> Manual
              </button>
            </div>
          </div>

          {items.length === 0 && (
            <p style={{ color: '#6B7280', fontSize: 14 }}>Nenhum item adicionado.</p>
          )}

          {items.map((item, idx) => (
            <div key={idx} style={{
              backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12,
              marginBottom: 8, border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Descrição</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Descrição do item"
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ minWidth: 80 }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Qtd</label>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value.replace(',', '.'))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ minWidth: 100 }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Preço unit.</label>
                  <input
                    type="text"
                    value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', e.target.value.replace(',', '.'))}
                    style={inputStyle}
                    required
                  />
                </div>
                <div style={{ minWidth: 90 }}>
                  <label style={{ ...labelStyle, fontSize: 11 }}>Total</label>
                  <input
                    type="text"
                    value={formatMoney(safeMultiply(item.quantity || '0', item.unit_price || '0'))}
                    readOnly
                    style={{ ...inputStyle, backgroundColor: '#F3F4F6', color: '#6B7280' }}
                  />
                </div>
                <div style={{ paddingBottom: 1 }}>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 8 }}
                    title="Remover item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals preview */}
        <div style={{ ...card, marginTop: 16 }}>
          <h2 style={sectionTitle}>Resumo</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 300, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280', fontSize: 14 }}>Subtotal</span>
              <span style={{ fontWeight: 500 }}>{formatMoney(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6B7280', fontSize: 14 }}>
                Desconto {discountType === 'PERCENT' ? `(${discountValue}%)` : ''}
              </span>
              <span style={{ fontWeight: 500, color: '#DC2626' }}>- {formatMoney(discountAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#6D28D9' }}>{formatMoney(total)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={loading}
            style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Criando...' : 'Criar orçamento'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            style={btnSecondary}
          >
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#6B7280', fontWeight: 600 };
const td: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };
const card: React.CSSProperties = { backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#0A0A0F' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #D1D5DB', borderRadius: 6, padding: '8px 10px',
  fontSize: 14, color: '#0A0A0F', outline: 'none', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  backgroundColor: '#6D28D9', color: '#fff', borderRadius: 8, padding: '10px 20px',
  fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  backgroundColor: '#fff', color: '#374151', borderRadius: 8, padding: '10px 20px',
  fontWeight: 600, fontSize: 14, border: '1px solid #D1D5DB', cursor: 'pointer',
};
