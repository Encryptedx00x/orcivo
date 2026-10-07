'use client';

import { Fragment, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { QuoteDocOptions } from '@orcivo/shared-types';
import { QuoteDocOptionsForm } from '../../../../components/QuoteDocOptionsForm';
import { Plus, BookOpen, X, Check, FileText, Share2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  multiplyDecimal,
  sumDecimal,
  formatMoney,
  CustomerCreateSchema,
} from '@orcivo/shared-types';
import { maskPhone } from '@orcivo/shared-types';

const DEFAULT_TERMS =
  'Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.';

// ── Token aliases ─────────────────────────────────────────────────────
const T = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#64748B',
  border1: '#E2E8F0',
  border2: '#F1F5F9',
  purple600: '#6D28D9',
  purple50: '#F5F3FF',
  purple800: '#4C1D95',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  success: '#16A34A',
  successBg: '#DCFCE7',
};

// ── Interfaces ────────────────────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}
interface CatalogItem {
  id: string;
  name: string;
  unit_price: string;
  unit?: string;
  description?: string;
}
interface QuoteItemRow {
  catalog_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
}

// ── Helpers ───────────────────────────────────────────────────────────
function safeMultiply(a: string, b: string): string {
  try {
    return multiplyDecimal(a || '0', b || '0');
  } catch {
    return '0.00';
  }
}
function safeSum(vals: string[]): string {
  try {
    return sumDecimal(vals);
  } catch {
    return '0.00';
  }
}

// ── Step definitions ─────────────────────────────────────────────────
const STEPS = ['Cliente', 'Itens', 'Desconto e validade', 'Termos', 'Revisão'];

// ── Stepper ───────────────────────────────────────────────────────────
type StepStatus = 'done' | 'error' | 'todo';

function Stepper({
  step,
  setStep,
  status,
}: {
  step: number;
  setStep: (n: number) => void;
  status: StepStatus[];
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 20,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {STEPS.map((s, i) => (
        <Fragment key={s}>
          <div
            onClick={() => setStep(i)}
            title={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              color: i === step ? T.ink : T.fg3,
              background: i === step ? T.purple50 : 'transparent',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                background:
                  i === step
                    ? T.purple600
                    : status[i] === 'done'
                      ? T.success
                      : status[i] === 'error'
                        ? T.danger
                        : T.slate100,
                color: i === step || status[i] !== 'todo' ? '#fff' : T.fg3,
              }}
            >
              {i !== step && status[i] === 'done' ? (
                <Check size={12} strokeWidth={3} />
              ) : i !== step && status[i] === 'error' ? (
                '!'
              ) : (
                i + 1
              )}
            </div>
            {/* Phones: only the current step keeps its name (all 5 fit on screen). */}
            <span className={i === step ? undefined : 'ov-hide-mobile'}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 24, height: 1, background: T.border1, flexShrink: 0 }} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function NovoOrcamentoForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showCatalogDialog, setShowCatalogDialog] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerError, setNewCustomerError] = useState('');
  const [newCustomerLoading, setNewCustomerLoading] = useState(false);

  // Form state
  const [customerId, setCustomerId] = useState(() => searchParams.get('client_id') ?? '');
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [discountValue, setDiscountValue] = useState('0');
  const [docOptions, setDocOptions] = useState<QuoteDocOptions | null>(null);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<QuoteItemRow[]>([
    { description: '', quantity: '1.000', unit_price: '0.00' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => setCustomers(d.data ?? []))
      .catch(() => {});
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((d) => setCatalog(Array.isArray(d) ? d : []))
      .catch(() => {});
    // Configurações > Condições padrão fill terms and validity (unless already edited).
    fetch('/api/company/me')
      .then((r) => r.json())
      .then(
        (c: {
          quote_default_terms?: string | null;
          quote_default_validity_days?: number | null;
          quote_default_doc_options?: QuoteDocOptions | null;
        }) => {
          if (c.quote_default_doc_options) setDocOptions(c.quote_default_doc_options);
          if (c.quote_default_terms)
            setTerms((t) => (t === DEFAULT_TERMS ? c.quote_default_terms! : t));
          const days = c.quote_default_validity_days ?? 15;
          const d = new Date();
          d.setDate(d.getDate() + days);
          setValidUntil((v) => v || d.toLocaleDateString('sv-SE'));
        },
      )
      .catch(() => {});
  }, []);

  // ── Item helpers ─────────────────────────────────────────────────
  function addManualItem() {
    setItems((prev) => [...prev, { description: '', quantity: '1.000', unit_price: '0.00' }]);
  }
  function addFromCatalog(item: CatalogItem) {
    setItems((prev) => [
      ...prev,
      {
        catalog_item_id: item.id,
        description: item.name,
        quantity: '1.000',
        unit_price: item.unit_price,
      },
    ]);
    setShowCatalogDialog(false);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, field: keyof QuoteItemRow, val: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  }

  // ── Cadastro rápido de cliente — cria sem sair do rascunho ──────────
  async function handleCreateCustomer() {
    setNewCustomerError('');
    const payload = Object.fromEntries(
      Object.entries({
        name: newCustomerName,
        phone: newCustomerPhone || undefined,
      }).filter(([, v]) => v !== undefined),
    );
    const parsed = CustomerCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setNewCustomerError(parsed.error.issues.map((i) => i.message).join(', '));
      return;
    }
    setNewCustomerLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao cadastrar cliente.' }));
        throw new Error((err as { message?: string }).message ?? 'Erro ao cadastrar cliente.');
      }
      const created = (await res.json()) as Customer;
      setCustomers((prev) => [...prev, created]);
      setCustomerId(created.id);
      setShowNewCustomerDialog(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err: unknown) {
      setNewCustomerError(err instanceof Error ? err.message : 'Erro ao cadastrar cliente.');
    } finally {
      setNewCustomerLoading(false);
    }
  }

  // ── Calculations (Decimal.js) ────────────────────────────────────
  const itemTotals = items.map((it) => safeMultiply(it.quantity || '0', it.unit_price || '0'));
  const subtotal = safeSum(itemTotals.length ? itemTotals : ['0']);
  const discountAmount = (() => {
    try {
      if (discountType === 'PERCENT')
        return safeMultiply(subtotal, safeMultiply(discountValue || '0', '0.01'));
      return discountValue || '0.00';
    } catch {
      return '0.00';
    }
  })();
  const total = (() => {
    try {
      const t = safeSum([subtotal, `-${discountAmount || '0'}`]);
      return t.startsWith('-') ? '0.00' : t;
    } catch {
      return subtotal;
    }
  })();

  // ── Validation gate — não permite gerar/salvar sem cliente e itens ──
  const validItems = items.filter((it) => it.description.trim() && Number(it.quantity) > 0);
  const canSave = !!customerId && validItems.length > 0;

  // Stepper reflects real completeness: required steps turn red once visited
  // and still incomplete; optional steps turn green once visited.
  const [furthest, setFurthest] = useState(0);
  useEffect(() => setFurthest((f) => Math.max(f, step)), [step]);
  const itemsComplete =
    items.length > 0 &&
    items.every((it) => it.description.trim() && Number(it.quantity) > 0 && it.unit_price !== '');
  const stepStatus: StepStatus[] = STEPS.map((_, i) => {
    const visited = i < furthest || (i === furthest && i !== step);
    if (i === 0) return customerId ? 'done' : visited ? 'error' : 'todo';
    if (i === 1) return itemsComplete ? 'done' : visited ? 'error' : 'todo';
    if (i === STEPS.length - 1) return 'todo';
    return visited ? 'done' : 'todo';
  });

  // ── Persistência: cria o rascunho e devolve o id (ou null em erro) ──
  async function saveDraft(): Promise<string | null> {
    setError('');
    if (!customerId) {
      setError('Selecione um cliente para continuar.');
      setStep(0);
      return null;
    }
    if (validItems.length === 0) {
      setError('Adicione pelo menos um item com descrição e quantidade.');
      setStep(1);
      return null;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          title: title || undefined,
          notes: terms || undefined,
          valid_until: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : undefined,
          discount_type: discountType,
          discount_value: discountValue || '0',
          doc_options: docOptions ?? undefined,
          items: validItems.map((it) => ({
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
      return (created as { id: string }).id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar orçamento.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  // ── Ações: salvam o rascunho e então executam (PDF / detalhe) ───────
  async function handleSave() {
    const id = await saveDraft();
    if (id) router.push(`/orcamentos/${id}`);
  }
  async function handlePdf() {
    const id = await saveDraft();
    if (!id) return;
    window.open(`/api/quotes/${id}/pdf`, '_blank', 'noopener,noreferrer');
    router.push(`/orcamentos/${id}`);
  }
  async function handleWhatsApp() {
    // O link de aprovação só existe após o envio — salva e leva ao detalhe,
    // onde o fluxo de envio + compartilhamento funciona corretamente.
    const id = await saveDraft();
    if (id) router.push(`/orcamentos/${id}?compartilhar=1`);
  }

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // ── Step content ─────────────────────────────────────────────────
  function renderStep() {
    // Step 0: Cliente
    if (step === 0)
      return (
        <div className="ov-card ov-card-body">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>
            Cliente
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="ov-label">Cliente *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <select
                  className="ov-input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  style={{ flex: '1 1 200px', minWidth: 0 }}
                >
                  <option value="">Selecione um cliente</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ov-btn ov-btn-outline"
                  style={{ height: 38, fontSize: 13, gap: 6, whiteSpace: 'nowrap' }}
                  onClick={() => setShowNewCustomerDialog(true)}
                >
                  <Plus size={14} />
                  Cadastrar novo cliente
                </button>
              </div>
            </div>
            {selectedCustomer?.phone && (
              <div>
                <label className="ov-label">Contato</label>
                <input className="ov-input" readOnly value={maskPhone(selectedCustomer.phone)} />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="ov-label">Título do orçamento (opcional)</label>
              <input
                className="ov-input"
                placeholder="Ex: Instalação de câmeras CFTV"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
        </div>
      );

    // Step 1: Itens
    if (step === 1)
      return (
        <div className="ov-card ov-card-body">
          <div className="ov-items-toolbar">
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>Itens</h3>
            <div className="ov-items-actions">
              <button
                type="button"
                className="ov-btn ov-btn-outline"
                style={{ gap: 6 }}
                onClick={() => setShowCatalogDialog(true)}
              >
                <BookOpen size={14} />
                Do catálogo
              </button>
              <button
                type="button"
                className="ov-btn ov-btn-outline"
                style={{ gap: 6 }}
                onClick={addManualItem}
              >
                <Plus size={14} />
                Adicionar item
              </button>
            </div>
          </div>

          {items.length === 0 && (
            <p style={{ color: T.fg3, fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Nenhum item adicionado.
            </p>
          )}

          {items.length > 0 && (
            <div className="ov-items-head">
              <span>Item</span>
              <span>Qtd</span>
              <span>Preço un.</span>
              <span style={{ textAlign: 'right' }}>Subtotal</span>
              <span />
            </div>
          )}
          {items.map((item, idx) => (
            <div className="ov-item-row" key={idx}>
              <div className="ov-item-desc">
                <label className="ov-item-label">Item</label>
                <input
                  className="ov-input"
                  style={{ height: 40, fontSize: 14 }}
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Descrição do item"
                  required
                />
              </div>
              <div className="ov-item-qty">
                <label className="ov-item-label">Qtd</label>
                <input
                  className="ov-input"
                  style={{ height: 40, fontSize: 14, textAlign: 'right' }}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value.replace(',', '.'))}
                  required
                />
              </div>
              <div className="ov-item-price">
                <label className="ov-item-label">Preço un.</label>
                <input
                  className="ov-input"
                  style={{
                    height: 40,
                    fontSize: 14,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                  }}
                  value={item.unit_price}
                  onChange={(e) => updateItem(idx, 'unit_price', e.target.value.replace(',', '.'))}
                  required
                />
              </div>
              <div className="ov-item-subtotal">
                <label className="ov-item-label">Subtotal</label>
                <span
                  style={{
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: T.ink,
                  }}
                >
                  {formatMoney(safeMultiply(item.quantity || '0', item.unit_price || '0'))}
                </span>
              </div>
              <button
                type="button"
                className="ov-item-remove"
                onClick={() => removeItem(idx)}
                aria-label="Remover item"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      );

    // Step 2: Desconto e validade
    if (step === 2)
      return (
        <div className="ov-card ov-card-body">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>
            Desconto e validade
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="ov-label">Tipo de desconto</label>
              <select
                className="ov-input"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
              >
                <option value="FIXED">Valor fixo (R$)</option>
                <option value="PERCENT">Percentual (%)</option>
              </select>
            </div>
            <div>
              <label className="ov-label">
                Desconto ({discountType === 'PERCENT' ? '%' : 'R$'})
              </label>
              <input
                className="ov-input"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value.replace(',', '.'))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="ov-label">Válido até</label>
              <input
                className="ov-input"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <QuoteDocOptionsForm value={docOptions} onChange={setDocOptions} />
          </div>
        </div>
      );

    // Step 3: Termos
    if (step === 3)
      return (
        <div className="ov-card ov-card-body">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>
            Termos e observações
          </h3>
          <div>
            <label className="ov-label">Termos</label>
            <textarea
              className="ov-input"
              style={{ height: 120, padding: 12, resize: 'vertical' }}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="ov-label">Observações internas</label>
            <textarea
              className="ov-input"
              style={{ height: 80, padding: 12, resize: 'vertical' }}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Visível apenas para a equipe"
            />
          </div>
        </div>
      );

    // Step 4: Revisão
    if (step === 4)
      return (
        <div className="ov-card ov-card-body">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: T.ink }}>
            Revisão
          </h3>

          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: T.fg3,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 6,
            }}
          >
            Cliente
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: T.ink }}>
            {selectedCustomer?.name ?? '—'}
            {selectedCustomer?.phone ? ` · ${maskPhone(selectedCustomer.phone)}` : ''}
          </div>

          {title && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: T.fg3,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  marginBottom: 6,
                }}
              >
                Título
              </div>
              <div style={{ fontWeight: 500, marginBottom: 16, color: T.ink }}>{title}</div>
            </>
          )}

          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: T.fg3,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 8,
            }}
          >
            Itens
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: `1px solid ${T.border2}`,
                fontSize: 13,
              }}
            >
              <div style={{ color: T.ink }}>
                {it.quantity}× {it.description}
              </div>
              <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: T.ink }}>
                {formatMoney(safeMultiply(it.quantity || '0', it.unit_price || '0'))}
              </div>
            </div>
          ))}

          {error && (
            <div
              style={{
                background: T.dangerBg,
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '10px 14px',
                color: T.danger,
                fontSize: 13,
                marginTop: 16,
              }}
            >
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,15,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 560,
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: T.ink }}>
                Selecionar do catálogo
              </h3>
              <button
                onClick={() => setShowCatalogDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: T.fg3,
                  display: 'flex',
                }}
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
                    {['Nome', 'Preço un.', ''].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          fontSize: 11,
                          color: T.fg3,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          borderBottom: `1px solid ${T.border1}`,
                          background: T.slate50,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((item, i) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          padding: '10px 12px',
                          borderBottom: i < catalog.length - 1 ? `1px solid ${T.border2}` : 0,
                        }}
                      >
                        <span style={{ fontWeight: 500, color: T.ink, fontSize: 14 }}>
                          {item.name}
                        </span>
                        {item.description && (
                          <p style={{ fontSize: 12, color: T.fg3, margin: '2px 0 0' }}>
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          fontSize: 13,
                          borderBottom: i < catalog.length - 1 ? `1px solid ${T.border2}` : 0,
                        }}
                      >
                        {formatMoney(item.unit_price)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          borderBottom: i < catalog.length - 1 ? `1px solid ${T.border2}` : 0,
                        }}
                      >
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

      {/* ── Quick-create customer dialog ────────────────────────────── */}
      {showNewCustomerDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10,10,15,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 8px 32px rgba(0,0,0,.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0, color: T.ink }}>
                Cadastrar novo cliente
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewCustomerDialog(false);
                  setNewCustomerError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: T.fg3,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="ov-label">Nome *</label>
                <input
                  className="ov-input"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                  autoFocus
                />
              </div>
              <div>
                <label className="ov-label">Telefone</label>
                <input
                  className="ov-input"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="(11) 90000-0000"
                />
              </div>
              {newCustomerError && (
                <div
                  style={{
                    background: T.dangerBg,
                    border: '1px solid #FECACA',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: T.danger,
                    fontSize: 13,
                  }}
                >
                  {newCustomerError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  className="ov-btn ov-btn-outline"
                  onClick={() => {
                    setShowNewCustomerDialog(false);
                    setNewCustomerError('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ov-btn ov-btn-primary"
                  disabled={newCustomerLoading || !newCustomerName.trim()}
                  onClick={() => {
                    void handleCreateCustomer();
                  }}
                  style={{ opacity: newCustomerLoading || !newCustomerName.trim() ? 0.6 : 1 }}
                >
                  {newCustomerLoading ? 'Salvando…' : 'Salvar cliente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="ov-page-header">
        <div>
          <Link
            href="/orcamentos"
            style={{ fontSize: 13, color: T.purple600, fontWeight: 500, textDecoration: 'none' }}
          >
            ← Orçamentos
          </Link>
          <h1
            style={{
              fontSize: 24,
              lineHeight: '32px',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: T.ink,
              margin: '6px 0 0',
            }}
          >
            Novo orçamento
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 2 }}>Rascunho · não enviado</div>
        </div>
        {canSave && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              disabled={loading}
              onClick={() => {
                void handleSave();
              }}
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              style={{ gap: 8 }}
              disabled={loading}
              onClick={() => {
                void handlePdf();
              }}
            >
              <FileText size={16} />
              Gerar PDF
            </button>
          </div>
        )}
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────── */}
      <Stepper step={step} setStep={setStep} status={stepStatus} />

      {/* ── Editor grid: left content + right rail ───────────────────── */}
      <div
        className="ov-row-detail"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20 }}
      >
        {/* Left column */}
        <div>
          {renderStep()}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Voltar
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="ov-btn ov-btn-primary"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              >
                Avançar
              </button>
            ) : (
              <button
                type="button"
                className="ov-btn ov-btn-primary"
                disabled={loading || !canSave}
                onClick={() => {
                  void handleSave();
                }}
                title={canSave ? undefined : 'Selecione um cliente e adicione itens'}
                style={{
                  gap: 8,
                  opacity: canSave ? 1 : 0.6,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                }}
              >
                <Check size={16} />
                {loading ? 'Salvando…' : 'Salvar e revisar'}
              </button>
            )}
          </div>
        </div>

        {/* Right rail — sticky summary */}
        <div
          style={{
            position: 'sticky',
            top: 84,
            alignSelf: 'start',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Running total */}
          <div className="ov-card ov-card-body">
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: T.fg3,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                fontWeight: 500,
                marginBottom: 6,
              }}
            >
              Total do orçamento
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: '36px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                color: T.ink,
              }}
            >
              {formatMoney(total)}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '8px 0',
                borderTop: `1px solid ${T.border2}`,
                marginTop: 8,
              }}
            >
              <span style={{ color: T.fg3 }}>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {formatMoney(subtotal)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                padding: '8px 0',
                borderTop: `1px solid ${T.border2}`,
              }}
            >
              <span style={{ color: T.fg3 }}>Desconto</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                − {formatMoney(discountAmount)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0 0',
                borderTop: `1px solid ${T.border1}`,
                fontWeight: 700,
              }}
            >
              <span>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(total)}
              </span>
            </div>
          </div>

          {/* Quick actions — only once there is something to share */}
          {canSave && (
            <div className="ov-card ov-card-body">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: T.fg3,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  fontWeight: 500,
                  marginBottom: 10,
                }}
              >
                Ações rápidas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  className="ov-btn ov-btn-outline"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  disabled={loading}
                  onClick={() => {
                    void handleWhatsApp();
                  }}
                >
                  <Share2 size={14} />
                  Compartilhar no WhatsApp
                </button>
                <button
                  type="button"
                  className="ov-btn ov-btn-outline"
                  style={{ justifyContent: 'flex-start', gap: 8 }}
                  disabled={loading}
                  onClick={() => {
                    void handlePdf();
                  }}
                >
                  <FileText size={14} />
                  Baixar PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
