'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, X, Check, FileText, Share2 } from 'lucide-react';
import Link from 'next/link';
import { multiplyDecimal, sumDecimal, formatMoney } from '@orcivo/shared-types';

// ── Token aliases ─────────────────────────────────────────────────────
const T = {
  ink:       '#0A0A0F',
  fg2:       '#334155',
  fg3:       '#64748B',
  border1:   '#E2E8F0',
  border2:   '#F1F5F9',
  purple600: '#6D28D9',
  purple50:  '#F5F3FF',
  purple800: '#4C1D95',
  slate50:   '#F8FAFC',
  slate100:  '#F1F5F9',
  danger:    '#DC2626',
  dangerBg:  '#FEE2E2',
  success:   '#16A34A',
  successBg: '#DCFCE7',
};

// ── Interfaces ────────────────────────────────────────────────────────
interface Customer { id: string; name: string; phone?: string | null; }
interface CatalogItem { id: string; name: string; unit_price: string; unit?: string; description?: string; }
interface QuoteItemRow {
  catalog_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
}

// ── Helpers ───────────────────────────────────────────────────────────
function safeMultiply(a: string, b: string): string {
  try { return multiplyDecimal(a || '0', b || '0'); } catch { return '0.00'; }
}
function safeSum(vals: string[]): string {
  try { return sumDecimal(vals); } catch { return '0.00'; }
}

// ── Step definitions ─────────────────────────────────────────────────
const STEPS = ['Cliente', 'Itens', 'Desconto e validade', 'Termos', 'Revisão'];

// ── Stepper ───────────────────────────────────────────────────────────
function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
      {STEPS.map((s, i) => (
        <>
          <div
            key={i}
            onClick={() => setStep(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 8,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              color: i === step ? T.ink : T.fg3,
              background: i === step ? T.purple50 : 'transparent',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600,
              background: i < step ? T.success : i === step ? T.purple600 : T.slate100,
              color: i <= step ? '#fff' : T.fg3,
            }}>
              {i < step ? <Check size={12} strokeWidth={3} /> : i + 1}
            </div>
            <span>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div key={`sep-${i}`} style={{ width: 24, height: 1, background: T.border1, flexShrink: 0 }} />
          )}
        </>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function NovoOrcamentoForm(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [discountValue, setDiscountValue] = useState('0');
  const [terms, setTerms] = useState('Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<QuoteItemRow[]>([
    { description: 'Visita técnica', quantity: '1.000', unit_price: '180.00' },
    { description: 'Instalação câmera CFTV 4MP', quantity: '4.000', unit_price: '320.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.data ?? [])).catch(() => {});
    fetch('/api/catalog').then(r => r.json()).then(d => setCatalog(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // ── Item helpers ─────────────────────────────────────────────────
  function addManualItem() {
    setItems(prev => [...prev, { description: '', quantity: '1.000', unit_price: '0.00' }]);
  }
  function addFromCatalog(item: CatalogItem) {
    setItems(prev => [...prev, { catalog_item_id: item.id, description: item.name, quantity: '1.000', unit_price: item.unit_price }]);
    setShowCatalogDialog(false);
  }
  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, field: keyof QuoteItemRow, val: string) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }

  // ── Calculations (Decimal.js) ────────────────────────────────────
  const itemTotals = items.map(it => safeMultiply(it.quantity || '0', it.unit_price || '0'));
  const subtotal = safeSum(itemTotals.length ? itemTotals : ['0']);
  const discountAmount = (() => {
    try {
      if (discountType === 'PERCENT') return safeMultiply(subtotal, safeMultiply(discountValue || '0', '0.01'));
      return discountValue || '0.00';
    } catch { return '0.00'; }
  })();
  const total = (() => {
    try {
      const t = safeSum([subtotal, `-${discountAmount || '0'}`]);
      return t.startsWith('-') ? '0.00' : t;
    } catch { return subtotal; }
  })();

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('');
    if (!customerId) { setError('Selecione um cliente.'); setStep(0); return; }
    if (items.length === 0) { setError('Adicione pelo menos um item.'); setStep(1); return; }
    const invalid = items.find(it => !it.description || !it.quantity || !it.unit_price);
    if (invalid) { setError('Preencha todos os campos dos itens.'); setStep(1); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao criar orçamento.' }));
        throw new Error((err as { message?: string }).message ?? 'Erro ao criar orçamento.');
      }
      const created = await res.json();
      router.push(`/orcamentos/${(created as { id: string }).id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  const selectedCustomer = customers.find(c => c.id === customerId);

  // ── Step content ─────────────────────────────────────────────────
  function renderStep() {
    // Step 0: Cliente
    if (step === 0) return (
      <div className="ov-card ov-card-body">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>Cliente</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="ov-label">Cliente *</label>
            <select
              className="ov-input"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
            >
              <option value="">Selecione um cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {selectedCustomer?.phone && (
            <div>
              <label className="ov-label">Contato</label>
              <input className="ov-input" readOnly value={selectedCustomer.phone} />
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="ov-label">Título do orçamento (opcional)</label>
            <input
              className="ov-input"
              placeholder="Ex: Instalação de câmeras CFTV"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
        </div>
      </div>
    );

    // Step 1: Itens
    if (step === 1) return (
      <div className="ov-card ov-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>Itens</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              style={{ height: 34, fontSize: 13, gap: 6 }}
              onClick={() => setShowCatalogDialog(true)}
            >
              <BookOpen size={14} />Do catálogo
            </button>
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              style={{ height: 34, fontSize: 13, gap: 6 }}
              onClick={addManualItem}
            >
              <Plus size={14} />Adicionar item
            </button>
          </div>
        </div>

        {items.length === 0 && (
          <p style={{ color: T.fg3, fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
            Nenhum item adicionado.
          </p>
        )}

        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          {items.length > 0 && (
            <thead>
              <tr>
                {['Item', 'Qtd', 'Unidade', 'Preço un.', 'Subtotal', ''].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Subtotal' || h === 'Preço un.' ? 'right' : 'left',
                    padding: '8px 12px', background: T.slate50, color: T.fg3,
                    fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em',
                    borderBottom: `1px solid ${T.border1}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border2}` }}>
                  <input
                    className="ov-input"
                    style={{ height: 36, fontSize: 13 }}
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Descrição do item"
                    required
                  />
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border2}`, width: 80 }}>
                  <input
                    className="ov-input"
                    style={{ height: 36, fontSize: 13, textAlign: 'right' }}
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value.replace(',', '.'))}
                    required
                  />
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border2}`, width: 80, color: T.fg3, fontSize: 13 }}>
                  un
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border2}`, width: 110 }}>
                  <input
                    className="ov-input"
                    style={{ height: 36, fontSize: 13, textAlign: 'right', fontFamily: 'var(--font-mono)' }}
                    value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', e.target.value.replace(',', '.'))}
                    required
                  />
                </td>
                <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border2}`, width: 110, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 13, color: T.ink }}>
                  {formatMoney(safeMultiply(item.quantity || '0', item.unit_price || '0'))}
                </td>
                <td style={{ padding: '10px 8px', borderBottom: `1px solid ${T.border2}`, width: 32 }}>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 4 }}
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    // Step 2: Desconto e validade
    if (step === 2) return (
      <div className="ov-card ov-card-body">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>Desconto e validade</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="ov-label">Tipo de desconto</label>
            <select
              className="ov-input"
              value={discountType}
              onChange={e => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
            >
              <option value="FIXED">Valor fixo (R$)</option>
              <option value="PERCENT">Percentual (%)</option>
            </select>
          </div>
          <div>
            <label className="ov-label">Desconto ({discountType === 'PERCENT' ? '%' : 'R$'})</label>
            <input
              className="ov-input"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value.replace(',', '.'))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="ov-label">Válido até</label>
            <input
              className="ov-input"
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
            />
          </div>
        </div>
      </div>
    );

    // Step 3: Termos
    if (step === 3) return (
      <div className="ov-card ov-card-body">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>Termos e observações</h3>
        <div>
          <label className="ov-label">Termos</label>
          <textarea
            className="ov-input"
            style={{ height: 120, padding: 12, resize: 'vertical' }}
            value={terms}
            onChange={e => setTerms(e.target.value)}
          />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="ov-label">Observações internas</label>
          <textarea
            className="ov-input"
            style={{ height: 80, padding: 12, resize: 'vertical' }}
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="Visível apenas para a equipe"
          />
        </div>
      </div>
    );

    // Step 4: Revisão
    if (step === 4) return (
      <div className="ov-card ov-card-body">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>Revisão</h3>

        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
          Cliente
        </div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: T.ink }}>
          {selectedCustomer?.name ?? '—'}
          {selectedCustomer?.phone ? ` · ${selectedCustomer.phone}` : ''}
        </div>

        {title && (
          <>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Título</div>
            <div style={{ fontWeight: 500, marginBottom: 16, color: T.ink }}>{title}</div>
          </>
        )}

        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Itens</div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border2}`, fontSize: 13 }}>
            <div style={{ color: T.ink }}>{it.quantity}× {it.description}</div>
            <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: T.ink }}>
              {formatMoney(safeMultiply(it.quantity || '0', it.unit_price || '0'))}
            </div>
          </div>
        ))}

        {error && (
          <div style={{ background: T.dangerBg, border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: T.danger, fontSize: 13, marginTop: 16 }}>
            {error}
          </div>
        )}
      </div>
    );

    return null;
  }

  return (
    <>
      {/* ── Catalog dialog ──────────────────────────────────────────── */}
      {showCatalogDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,10,15,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: T.ink }}>Selecionar do catálogo</h3>
              <button
                onClick={() => setShowCatalogDialog(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.fg3, display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
            {catalog.length === 0 ? (
              <p style={{ color: T.fg3, fontSize: 14 }}>Nenhum item no catálogo.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    {['Nome', 'Preço un.', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: T.fg3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: `1px solid ${T.border1}`, background: T.slate50 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((item, i) => (
                    <tr key={item.id}>
                      <td style={{ padding: '10px 12px', borderBottom: i < catalog.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                        <span style={{ fontWeight: 500, color: T.ink, fontSize: 14 }}>{item.name}</span>
                        {item.description && <p style={{ fontSize: 12, color: T.fg3, margin: '2px 0 0' }}>{item.description}</p>}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, borderBottom: i < catalog.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                        {formatMoney(item.unit_price)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: i < catalog.length - 1 ? `1px solid ${T.border2}` : 0 }}>
                        <button
                          onClick={() => addFromCatalog(item)}
                          className="ov-btn ov-btn-primary"
                          style={{ height: 30, fontSize: 12, padding: '0 12px' }}
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

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="ov-page-header">
        <div>
          <Link href="/orcamentos" style={{ fontSize: 13, color: T.purple600, fontWeight: 500, textDecoration: 'none' }}>
            ← Orçamentos
          </Link>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em', color: T.ink, margin: '6px 0 0' }}>
            Novo orçamento
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 2 }}>Rascunho · não enviado</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ov-btn ov-btn-outline">Salvar rascunho</button>
          <button className="ov-btn ov-btn-outline" style={{ gap: 8 }}>
            <FileText size={16} />Gerar PDF
          </button>
        </div>
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────── */}
      <Stepper step={step} setStep={setStep} />

      {/* ── Editor grid: left content + right rail ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>

        {/* Left column */}
        <div>
          {renderStep()}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              disabled={step === 0}
              onClick={() => setStep(s => Math.max(0, s - 1))}
            >
              Voltar
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="ov-btn ov-btn-primary"
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              >
                Avançar
              </button>
            ) : (
              <button
                type="button"
                className="ov-btn ov-btn-primary"
                disabled={loading}
                onClick={() => { void handleSubmit(); }}
                style={{ gap: 8 }}
              >
                <Check size={16} />
                {loading ? 'Enviando…' : 'Enviar orçamento'}
              </button>
            )}
          </div>
        </div>

        {/* Right rail — sticky summary */}
        <div style={{ position: 'sticky', top: 84, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Running total */}
          <div className="ov-card ov-card-body">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500, marginBottom: 6 }}>
              Total do orçamento
            </div>
            <div style={{ fontSize: 28, lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: T.ink }}>
              {formatMoney(total)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderTop: `1px solid ${T.border2}`, marginTop: 8 }}>
              <span style={{ color: T.fg3 }}>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderTop: `1px solid ${T.border2}` }}>
              <span style={{ color: T.fg3 }}>Desconto</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>− {formatMoney(discountAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: `1px solid ${T.border1}`, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(total)}</span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="ov-card ov-card-body">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 500, marginBottom: 10 }}>
              Ações rápidas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="ov-btn ov-btn-outline" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <Share2 size={14} />Compartilhar no WhatsApp
              </button>
              <button className="ov-btn ov-btn-outline" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <FileText size={14} />Baixar PDF
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
