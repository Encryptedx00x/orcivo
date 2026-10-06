'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Minus,
  Package,
  PenLine,
  Plus,
  RotateCcw,
  Type,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { formatMoney, maskPhone, multiplyDecimal, sumDecimal } from '@orcivo/shared-types';
import {
  createCatalogItem,
  createClient,
  createQuote,
  updateQuote,
  getApprovalMethods,
  getCompany,
  listCatalog,
  listClients,
  type EasyCatalogItem,
} from '../actions';
import { approvalsSummary } from './Settings';
import {
  getTechnicianSignature,
  saveTechnicianSignature,
  sendQuoteWithSignature,
} from '../../(app)/orcamentos/[id]/signature-actions';
import { SignatureCanvas } from '../../approve/[token]/SignatureCanvas';
import { buildWhatsAppLink } from '../../../lib/whatsapp';
import { downscaleToDataUrl as downscale } from '../../../lib/image';
import { ActionBar, Hint, emptyDraft, useLoad, useNav, type DraftItem } from '../EasyApp';
import {
  Avatar,
  Btn,
  C,
  ErrorBox,
  Field,
  H1,
  Loading,
  Options,
  SectionLabel,
  Search,
  Toggle,
  card,
  firstName,
  useToast,
} from '../ui';

const DEFAULT_TERMS =
  'Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.';
const centsToDecimal = (digits: string) => {
  const n = digits.replace(/\D/g, '').replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
};

function useTotals() {
  const { draft } = useNav();
  return useMemo(() => {
    const subtotal = draft.items.length
      ? sumDecimal(draft.items.map((i) => multiplyDecimal(i.price, String(i.qty))))
      : '0.00';
    let discount = '0.00';
    if (draft.discountDigits) {
      if (draft.discountType === 'PERCENT') {
        const pct = Math.min(Number(draft.discountDigits), 100);
        discount = multiplyDecimal(subtotal, (pct / 100).toFixed(4));
      } else {
        const fixed = centsToDecimal(draft.discountDigits);
        discount = Number(fixed) > Number(subtotal) ? subtotal : fixed;
      }
    }
    const total = sumDecimal([subtotal, `-${discount}`]);
    return { subtotal, discount, total: total.startsWith('-') ? '0.00' : total };
  }, [draft]);
}

export function QuoteFlow({ step }: { step: 'q1' | 'q2' | 'q3' | 'sign' | 'done' }): JSX.Element {
  if (step === 'q1') return <Q1 />;
  if (step === 'q2') return <Q2 />;
  if (step === 'q3') return <Q3 />;
  if (step === 'sign') return <Sign />;
  return <Done />;
}

// ── 1. Para quem? ─────────────────────────────────────────────────────
function Q1() {
  const { draft, setDraft, go } = useNav();
  const toast = useToast();
  const clients = useLoad(listClients);
  const [q, setQ] = useState('');
  const [ncOpen, setNcOpen] = useState(false);
  const [ncName, setNcName] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const qq = q.trim().toLowerCase();
  const qDigits = qq.replace(/\D/g, '');
  const list = (clients.data ?? [])
    .filter(
      (c) =>
        !qq || c.name.toLowerCase().includes(qq) || (qDigits && (c.phone ?? '').includes(qDigits)),
    )
    .slice(0, qq ? 8 : 5);
  const ncValid = ncName.trim().length > 1 && ncPhone.replace(/\D/g, '').length >= 10;

  const saveNew = async () => {
    setSaving(true);
    const r = await createClient({ name: ncName, phone: ncPhone });
    setSaving(false);
    if (!r.ok) return toast(r.message);
    setDraft((d) => ({ ...d, client: { id: r.data.id, name: r.data.name, phone: r.data.phone } }));
    toast(`Pronto! ${firstName(r.data.name)} salvo.`);
    go('q2');
  };

  return (
    <>
      <H1 size={32}>Para quem?</H1>
      {clients.loading && !clients.data ? (
        <Loading />
      ) : clients.error ? (
        <ErrorBox title="Não foi possível carregar seus clientes." onRetry={clients.reload} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Search value={q} onChange={setQ} placeholder="Buscar nome ou telefone" />
          {list.length > 0 ? (
            <>
              <SectionLabel>{qq ? 'Encontrados' : 'Recentes'}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {list.map((c) => {
                  const sel = draft.client?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => {
                        setDraft((d) => ({
                          ...d,
                          client: { id: c.id, name: c.name, phone: c.phone },
                        }));
                        setNcOpen(false);
                      }}
                      style={{
                        minHeight: 80,
                        width: '100%',
                        borderRadius: 20,
                        border: `2px solid ${sel ? C.purple : C.border}`,
                        background: sel ? C.purple50 : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: C.ink,
                        fontFamily: 'inherit',
                      }}
                    >
                      <Avatar name={c.name} size={52} />
                      <span
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}
                      >
                        <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 600 }}>
                          {c.name}
                        </span>
                        <span
                          style={{ fontSize: 16, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {maskPhone(c.phone)}
                        </span>
                      </span>
                      {sel && (
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9999,
                            background: C.purple,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={22} aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ ...card, padding: 18, fontSize: 17, color: C.fg2 }}>
              {(clients.data ?? []).length === 0
                ? 'Você ainda não tem clientes. Toque em Cliente novo: só precisa do nome e do telefone.'
                : 'Ninguém com esse nome ou telefone. Toque em Cliente novo.'}
            </div>
          )}
          {!ncOpen ? (
            <Btn tone="dashed" icon={UserPlus} height={72} onClick={() => setNcOpen(true)}>
              Cliente novo
            </Btn>
          ) : (
            <NewClientForm
              name={ncName}
              phone={ncPhone}
              onName={setNcName}
              onPhone={(v) => setNcPhone(maskPhone(v))}
              onClose={() => setNcOpen(false)}
            />
          )}
        </div>
      )}
      <ActionBar>
        {ncOpen ? (
          <>
            {!ncValid && <Hint>Preencha nome e telefone</Hint>}
            <Btn disabled={!ncValid || saving} onClick={saveNew}>
              {saving ? 'Salvando…' : 'Salvar e continuar'}
            </Btn>
          </>
        ) : (
          <>
            {!draft.client && <Hint>Escolha um cliente ou toque em Cliente novo</Hint>}
            <Btn disabled={!draft.client} onClick={() => go('q2')}>
              {draft.client ? `Continuar com ${firstName(draft.client.name)}` : 'Continuar'}
            </Btn>
          </>
        )}
      </ActionBar>
    </>
  );
}

export function NewClientForm({
  name,
  phone,
  onName,
  onPhone,
  onClose,
}: {
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onClose?: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        ...card,
        borderRadius: 24,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {onClose && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>Cliente novo</span>
          <Btn tone="link" onClick={onClose}>
            Fechar
          </Btn>
        </div>
      )}
      <Field label="Nome" value={name} onChange={onName} placeholder="Ex.: Marcos Oliveira" />
      <Field
        label="Telefone (WhatsApp)"
        value={phone}
        onChange={onPhone}
        placeholder="(11) 98765-4321"
        inputMode="tel"
      />
      <span style={{ fontSize: 16, color: C.fg3 }}>Endereço e documento você completa depois.</span>
    </div>
  );
}

// ── 2. O que vai fazer? ───────────────────────────────────────────────
function Q2() {
  const { draft, setDraft, go } = useNav();
  const toast = useToast();
  const catalog = useLoad(listCatalog);
  const { subtotal } = useTotals();
  const [showAll, setShowAll] = useState(false);
  const [catQ, setCatQ] = useState('');
  const [limit, setLimit] = useState(5);
  const [niOpen, setNiOpen] = useState(false);
  const [niName, setNiName] = useState('');
  const [niDigits, setNiDigits] = useState('');
  const [niSave, setNiSave] = useState(true);

  const items = catalog.data ?? [];
  // No usage stats exist yet: the first items are the "quick picks", the rest go in the full list.
  const favs = items.slice(0, 6);
  const norm = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const qn = norm(catQ.trim());
  const pool = qn ? items.filter((c) => norm(c.name).includes(qn)) : items.slice(6);
  const shown = pool.slice(0, limit);
  const left = pool.length - shown.length;
  const qtyOf = (id: string) => draft.items.find((i) => i.key === id)?.qty ?? 0;

  const add = (c: EasyCatalogItem) =>
    setDraft((d) => {
      const i = d.items.findIndex((x) => x.key === c.id);
      if (i >= 0)
        return { ...d, items: d.items.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)) };
      return {
        ...d,
        items: [
          ...d.items,
          { key: c.id, catalog_item_id: c.id, name: c.name, price: c.unit_price, qty: 1 },
        ],
      };
    });
  const change = (it: DraftItem, delta: number) => {
    const prev = draft.items;
    if (it.qty + delta <= 0) {
      setDraft((d) => ({ ...d, items: d.items.filter((x) => x.key !== it.key) }));
      toast(`${it.name} tirado do orçamento.`, () => setDraft((d) => ({ ...d, items: prev })));
      return;
    }
    setDraft((d) => ({
      ...d,
      items: d.items.map((x) => (x.key === it.key ? { ...x, qty: x.qty + delta } : x)),
    }));
  };
  const niValid = niName.trim().length > 1 && Number(niDigits) > 0;
  const addNew = async () => {
    if (!niValid) return;
    const price = centsToDecimal(niDigits);
    let key = `x${Date.now()}`;
    let catalogId: string | undefined;
    if (niSave) {
      const r = await createCatalogItem({ name: niName, price });
      if (!r.ok) return toast(r.message);
      key = r.data.id;
      catalogId = r.data.id;
      catalog.setData([...items, r.data]);
    }
    setDraft((d) => ({
      ...d,
      items: [...d.items, { key, catalog_item_id: catalogId, name: niName.trim(), price, qty: 1 }],
    }));
    toast(
      niSave
        ? `${niName.trim()} posto e guardado em Meus serviços e preços.`
        : `${niName.trim()} posto no orçamento.`,
    );
    setNiOpen(false);
    setNiName('');
    setNiDigits('');
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <H1 size={32}>O que vai fazer?</H1>
        <span style={{ fontSize: 17, color: C.fg3 }}>Para {draft.client?.name ?? 'cliente'}</span>
      </div>
      {catalog.loading && !catalog.data ? (
        <Loading />
      ) : catalog.error ? (
        <ErrorBox
          title="Não foi possível carregar seus serviços e preços."
          onRetry={catalog.reload}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {favs.length > 0 ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  margin: '2px 4px 0',
                }}
              >
                <span style={{ fontSize: 17, fontWeight: 700, color: C.fg2 }}>Seus serviços</span>
                <span style={{ fontSize: 15, color: C.fg3 }}>Toque para pôr</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {favs.map((c) => {
                  const n = qtyOf(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => add(c)}
                      style={{
                        minHeight: 116,
                        borderRadius: 20,
                        border: `2px solid ${n ? C.purple : C.border}`,
                        background: n ? C.purple50 : '#FFFFFF',
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 10,
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: C.ink,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600 }}>
                        {c.name}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatMoney(c.unit_price)}
                        </span>
                        <span
                          style={{
                            minWidth: 36,
                            height: 32,
                            padding: '0 10px',
                            borderRadius: 9999,
                            background: n ? C.purple : C.purple50,
                            color: n ? '#FFFFFF' : C.purple,
                            fontSize: 16,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {n ? `${n}×` : '+'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {items.length > 6 && (
                <Btn
                  tone="outline"
                  icon={Package}
                  iconColor={C.purple}
                  height={56}
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? 'Esconder a lista' : `Ver todos os serviços (${items.length})`}
                </Btn>
              )}
              {showAll && (
                <>
                  <Search
                    value={catQ}
                    onChange={(v) => {
                      setCatQ(v);
                      setLimit(5);
                    }}
                    placeholder="Buscar serviço ou produto"
                  />
                  <span style={{ fontSize: 15, color: C.fg3, margin: '0 4px' }}>
                    {qn
                      ? `${pool.length} ${pool.length === 1 ? 'encontrado' : 'encontrados'}`
                      : 'Outros serviços e produtos'}
                  </span>
                  {pool.length === 0 ? (
                    <div style={{ ...card, padding: 16, fontSize: 17, color: C.fg2 }}>
                      Nada com esse nome. Toque em Item novo para criar.
                    </div>
                  ) : (
                    <div style={{ ...card, overflow: 'hidden' }}>
                      {shown.map((c) => {
                        const n = qtyOf(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              add(c);
                              toast(`${c.name} posto no orçamento.`);
                            }}
                            style={{
                              width: '100%',
                              minHeight: 68,
                              border: 'none',
                              borderBottom: `1px solid ${C.line}`,
                              background: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              color: C.ink,
                              fontFamily: 'inherit',
                            }}
                          >
                            <span
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <span style={{ fontSize: 17, fontWeight: 600 }}>{c.name}</span>
                              <span
                                style={{
                                  fontSize: 16,
                                  color: C.fg3,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatMoney(c.unit_price)}
                              </span>
                            </span>
                            <span
                              style={{
                                minWidth: 44,
                                height: 44,
                                padding: '0 8px',
                                borderRadius: 14,
                                background: n ? C.purple : C.purple50,
                                color: n ? '#FFFFFF' : C.purple,
                                fontSize: 16,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                              }}
                            >
                              {n ? (
                                <Check size={22} aria-hidden="true" />
                              ) : (
                                <Plus size={22} aria-hidden="true" />
                              )}
                              {n ? n : ''}
                            </span>
                          </button>
                        );
                      })}
                      {left > 0 && (
                        <button
                          type="button"
                          onClick={() => setLimit((l) => l + 5)}
                          style={{
                            width: '100%',
                            height: 60,
                            border: 'none',
                            background: C.bg,
                            color: C.purple800,
                            fontSize: 17,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <Plus size={22} aria-hidden="true" />
                          Ver mais {Math.min(left, 5)}
                          {left > 5 ? ` de ${left}` : ''}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 19, fontWeight: 700 }}>
                Você ainda não tem serviços e preços salvos.
              </span>
              <span style={{ fontSize: 17, color: C.fg2 }}>
                Crie o primeiro abaixo. Ele fica guardado para os próximos orçamentos.
              </span>
            </div>
          )}

          {!niOpen ? (
            <Btn tone="dashed" icon={Plus} height={72} onClick={() => setNiOpen(true)}>
              Item novo
            </Btn>
          ) : (
            <div
              style={{
                ...card,
                borderRadius: 24,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontSize: 20, fontWeight: 700 }}>Item novo</span>
                <Btn tone="link" onClick={() => setNiOpen(false)}>
                  Fechar
                </Btn>
              </div>
              <Field
                label="O que é"
                value={niName}
                onChange={setNiName}
                placeholder="Ex.: Troca de capacitor"
              />
              <Field
                label="Preço"
                value={niDigits ? formatMoney(centsToDecimal(niDigits)) : ''}
                onChange={(v) => setNiDigits(v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9))}
                placeholder="R$ 0,00"
                inputMode="numeric"
                big
              />
              <CheckRow
                on={niSave}
                onClick={() => setNiSave((v) => !v)}
                label="Guardar em Meus serviços e preços"
              />
              <Btn disabled={!niValid} height={56} onClick={addNew}>
                Pôr no orçamento
              </Btn>
            </div>
          )}

          {draft.items.length > 0 && (
            <>
              <SectionLabel>No orçamento</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {draft.items.map((it) => (
                  <div
                    key={it.key}
                    style={{
                      ...card,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: '23px', fontWeight: 600, flex: 1 }}>
                        {it.name}
                      </span>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatMoney(multiplyDecimal(it.price, String(it.qty)))}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span
                        style={{ fontSize: 16, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatMoney(it.price)} cada
                      </span>
                      <Stepper
                        value={it.qty}
                        onDec={() => change(it, -1)}
                        onInc={() => change(it, 1)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <ActionBar total={formatMoney(subtotal)}>
        {!draft.items.length && <Hint>Toque em um serviço para pôr no orçamento</Hint>}
        <Btn disabled={!draft.items.length} onClick={() => go('q3')}>
          Continuar
        </Btn>
      </ActionBar>
    </>
  );
}

function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  const b: React.CSSProperties = {
    width: 56,
    height: 56,
    border: 'none',
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        border: `1.5px solid ${C.borderStrong}`,
        borderRadius: 16,
        overflow: 'hidden',
        height: 56,
        background: '#FFFFFF',
      }}
    >
      <button type="button" aria-label="Diminuir" onClick={onDec} style={{ ...b, color: C.ink }}>
        <Minus size={24} aria-hidden="true" />
      </button>
      <span
        style={{
          minWidth: 44,
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <button type="button" aria-label="Aumentar" onClick={onInc} style={{ ...b, color: C.purple }}>
        <Plus size={24} aria-hidden="true" />
      </button>
    </div>
  );
}

function CheckRow({
  on,
  onClick,
  label,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      style={{
        minHeight: 56,
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
        color: C.ink,
        fontFamily: 'inherit',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          border: `2px solid ${on ? C.purple : '#94A3B8'}`,
          background: on ? C.purple : '#FFFFFF',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {on && <Check size={20} aria-hidden="true" />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 17, fontWeight: sub ? 600 : 400 }}>{label}</span>
        {sub && <span style={{ fontSize: 15, color: C.fg3 }}>{sub}</span>}
      </span>
    </button>
  );
}

// ── 3. Revisar e enviar ───────────────────────────────────────────────

function Q3() {
  const { draft, setDraft, go, back, tab } = useNav();
  const toast = useToast();
  const { subtotal, discount, total } = useTotals();
  const [saved, setSaved] = useState<string | null>(null);
  const [savedChecked, setSavedChecked] = useState(false);
  const approvals = useLoad(getApprovalMethods);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // First visit: the company's "Condições padrão" (Configurações) fill terms and validity.
    if (draft.terms === '' && !draft.id) {
      setDraft((d) => ({ ...d, terms: DEFAULT_TERMS }));
      void getCompany().then((r) => {
        if (!r.ok) return;
        setDraft((d) => ({
          ...d,
          terms: r.data.quote_default_terms ?? d.terms,
          validityDays: r.data.quote_default_validity_days ?? d.validityDays,
        }));
      });
    }
    getTechnicianSignature()
      .then((r) => {
        setSaved(r.signature_url);
        // First visit: a saved signature goes in by default (same as the standard screen).
        if (r.signature_url)
          setDraft((d) =>
            d.signature.mode === 'none' && !d.signature.dataUrl
              ? { ...d, signature: { mode: 'saved' } }
              : d,
          );
      })
      .finally(() => setSavedChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sigImg =
    draft.signature.mode === 'once'
      ? draft.signature.dataUrl
      : draft.signature.mode === 'saved'
        ? saved
        : null;
  const sigStatus =
    draft.signature.mode === 'once'
      ? 'Vai só neste orçamento.'
      : draft.signature.mode === 'saved'
        ? 'Sua assinatura salva vai no PDF.'
        : saved
          ? 'Não vai neste orçamento.'
          : 'Ainda não assinou. É opcional.';

  const validUntil = () => {
    const d = new Date();
    d.setDate(d.getDate() + draft.validityDays);
    d.setHours(23, 59, 59, 0);
    return d.toISOString();
  };
  const create = async () => {
    if (!draft.client) return null;
    const dto = {
      customer_id: draft.client.id,
      notes: draft.terms.trim() || undefined,
      valid_until: validUntil(),
      discount_type: draft.discountType,
      discount_value:
        draft.discountType === 'PERCENT'
          ? draft.discountDigits || '0'
          : centsToDecimal(draft.discountDigits),
      items: draft.items.map((i) => ({
        catalog_item_id: i.catalog_item_id,
        description: i.name.slice(0, 300),
        quantity: i.qty.toFixed(3),
        unit_price: i.price,
      })),
    };
    // Once saved, later tries (send failed, PDF first) update the same quote, never a copy.
    const r = draft.id ? await updateQuote(draft.id, dto) : await createQuote(dto);
    if (!r.ok) {
      toast(r.message);
      return null;
    }
    const saved = { id: r.data.id, number: r.data.number };
    setDraft((d) => ({ ...d, ...saved }));
    return saved;
  };

  const send = async () => {
    if (busy || !draft.client) return;
    // Open the WhatsApp tab synchronously (inside the tap) so mobile browsers don't block it.
    const tabRef = window.open('', '_blank');
    setBusy(true);
    const created = await create();
    if (!created) {
      tabRef?.close();
      return setBusy(false);
    }
    const sent = await sendQuoteWithSignature(
      created.id,
      draft.signature.mode !== 'none',
      draft.signature.mode === 'once' ? draft.signature.dataUrl : undefined,
    );
    setBusy(false);
    if (!sent.ok) {
      tabRef?.close();
      toast('Não foi possível enviar agora. O orçamento ficou guardado como rascunho.');
      return;
    }
    const q = sent.quote as { approvalUrl?: string; approval_token?: string };
    const url =
      q.approvalUrl ??
      (q.approval_token ? `${window.location.origin}/approve/${q.approval_token}` : '');
    const link = buildWhatsAppLink(draft.client.phone ?? '', url, `#${created.number}`);
    if (tabRef) tabRef.location.href = link;
    else window.location.href = link;
    setDraft((d) => ({ ...d, result: { id: created.id, number: created.number, total } }));
    go('done');
  };

  const pdf = async () => {
    const tabRef = window.open('', '_blank');
    setBusy(true);
    const created = await create();
    setBusy(false);
    if (!created) return tabRef?.close();
    if (tabRef) tabRef.location.href = `/api/quotes/${created.id}/pdf`;
    toast('PDF pronto. O orçamento ficou guardado como rascunho.');
    setDraft(emptyDraft());
    tab('quotes');
  };

  const bits = [
    Number(discount) > 0 ? `Desconto de ${formatMoney(discount)}` : null,
    `Vale por ${draft.validityDays} dias`,
    draft.terms.trim() ? 'com condições' : null,
  ].filter(Boolean);

  return (
    <>
      <H1 size={32}>Revisar e enviar</H1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            borderRadius: 24,
            background: C.purple50,
            border: `1px solid ${C.purple200}`,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 600, color: C.purple800 }}>Total</span>
          <span
            style={{
              fontSize: 44,
              lineHeight: '52px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatMoney(total)}
          </span>
          {Number(discount) > 0 && (
            <span style={{ fontSize: 16, color: C.purple800 }}>
              Já com desconto de {formatMoney(discount)} (era {formatMoney(subtotal)})
            </span>
          )}
          <div style={{ height: 1, background: C.purple200, margin: '12px 0' }} />
          {draft.client && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 9999,
                  background: '#FFFFFF',
                  color: C.purple800,
                  fontSize: 17,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {draft.client.name.slice(0, 1).toUpperCase()}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{draft.client.name}</span>
                <span style={{ fontSize: 16, color: C.fg2, fontVariantNumeric: 'tabular-nums' }}>
                  {maskPhone(draft.client.phone)}
                </span>
              </span>
            </div>
          )}
        </div>

        <div style={{ ...card, padding: '6px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>
              {draft.items.length === 1 ? '1 item' : `${draft.items.length} itens`}
            </span>
            <Btn tone="link" onClick={back}>
              Alterar
            </Btn>
          </div>
          {draft.items.map((i) => (
            <div
              key={i.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderTop: `1px solid ${C.line}`,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>{i.name}</span>
                <span style={{ fontSize: 15, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}>
                  {i.qty} × {formatMoney(i.price)}
                </span>
              </span>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatMoney(multiplyDecimal(i.price, String(i.qty)))}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            ...card,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: C.purple50,
                color: C.purple,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PenLine size={22} aria-hidden="true" />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>Sua assinatura</span>
              <span style={{ fontSize: 15, color: C.fg3 }}>{savedChecked ? sigStatus : '…'}</span>
            </span>
          </div>
          {sigImg && (
            <div
              style={{
                height: 72,
                borderRadius: 14,
                background: C.bg,
                border: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sigImg}
                alt="Sua assinatura"
                style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
          {saved && draft.signature.mode !== 'once' && (
            <Toggle
              on={draft.signature.mode === 'saved'}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  signature: { mode: d.signature.mode === 'saved' ? 'none' : 'saved' },
                }))
              }
              label="Pôr minha assinatura neste orçamento"
            />
          )}
          <Btn tone="soft" icon={PenLine} height={56} onClick={() => go('sign')}>
            {saved || draft.signature.mode !== 'none' ? 'Trocar assinatura' : 'Assinar'}
          </Btn>
        </div>

        <button
          type="button"
          onClick={() => go('approvals')}
          style={{
            ...card,
            minHeight: 76,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            color: C.ink,
            width: '100%',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Como o cliente aprova</span>
            <span style={{ fontSize: 15, lineHeight: '20px', color: C.fg3 }}>
              {approvals.data ? approvalsSummary(approvals.data) : '…'}. Vale para todos os
              orçamentos.
            </span>
          </span>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.purple700, flexShrink: 0 }}>
            Mudar
          </span>
        </button>

        <div style={{ ...card, overflow: 'hidden' }}>
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            style={{
              width: '100%',
              minHeight: 72,
              border: 'none',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              color: C.ink,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Mais opções</span>
              <span style={{ fontSize: 15, color: C.fg3 }}>{bits.join(' · ')}</span>
            </span>
            {moreOpen ? (
              <ChevronUp size={26} color={C.fg2} aria-hidden="true" />
            ) : (
              <ChevronDown size={26} color={C.fg2} aria-hidden="true" />
            )}
          </button>
          {moreOpen && (
            <div
              style={{
                padding: '4px 16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                borderTop: `1px solid ${C.line}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>Desconto</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      border: `1.5px solid ${C.borderStrong}`,
                      borderRadius: 14,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {(['PERCENT', 'FIXED'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={draft.discountType === t}
                        onClick={() =>
                          setDraft((d) => ({ ...d, discountType: t, discountDigits: '' }))
                        }
                        style={{
                          width: 60,
                          height: 56,
                          border: 'none',
                          background: draft.discountType === t ? C.purple : '#FFFFFF',
                          color: draft.discountType === t ? '#FFFFFF' : C.ink,
                          fontSize: 18,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {t === 'PERCENT' ? '%' : 'R$'}
                      </button>
                    ))}
                  </div>
                  <input
                    inputMode="numeric"
                    aria-label="Valor do desconto"
                    value={
                      draft.discountDigits
                        ? draft.discountType === 'PERCENT'
                          ? `${draft.discountDigits}%`
                          : formatMoney(centsToDecimal(draft.discountDigits))
                        : ''
                    }
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        discountDigits: e.target.value
                          .replace(/\D/g, '')
                          .replace(/^0+/, '')
                          .slice(0, d.discountType === 'PERCENT' ? 2 : 8),
                      }))
                    }
                    placeholder={draft.discountType === 'PERCENT' ? '0%' : 'R$ 0,00'}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 56,
                      borderRadius: 14,
                      border: `1.5px solid ${C.borderStrong}`,
                      padding: '0 14px',
                      fontSize: 18,
                      fontWeight: 600,
                      color: C.ink,
                      background: '#FFFFFF',
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>Vale por</span>
                <Options
                  options={[7, 15, 30].map((d) => ({ value: d, label: `${d} dias` }))}
                  value={draft.validityDays}
                  onPick={(v) => setDraft((d) => ({ ...d, validityDays: v }))}
                />
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>Condições</span>
                <textarea
                  value={draft.terms}
                  onChange={(e) => setDraft((d) => ({ ...d, terms: e.target.value }))}
                  rows={3}
                  placeholder="Ex.: 50% na aprovação e 50% no fim do serviço."
                  style={{
                    borderRadius: 14,
                    border: `1.5px solid ${C.borderStrong}`,
                    padding: 14,
                    fontSize: 18,
                    lineHeight: 1.4,
                    color: C.ink,
                    background: '#FFFFFF',
                    resize: 'none',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
      <ActionBar>
        <Btn icon={MessageCircle} disabled={busy} onClick={() => void send()}>
          {busy ? 'Enviando…' : 'Enviar no WhatsApp'}
        </Btn>
        <Btn tone="outline" icon={Download} height={56} disabled={busy} onClick={() => void pdf()}>
          Baixar PDF
        </Btn>
      </ActionBar>
    </>
  );
}

// ── Assinatura do técnico ─────────────────────────────────────────────
type SigMethod = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE' | 'PHOTO_SIGNATURE';
const SIG_METHODS: Array<{ k: SigMethod; label: string; icon: typeof XCircle }> = [
  { k: 'APPROVE_BUTTON', label: 'Sem assinatura', icon: XCircle },
  { k: 'TYPED_NAME', label: 'Nome digitado', icon: Type },
  { k: 'DRAWN_SIGNATURE', label: 'Desenhar com o dedo', icon: PenLine },
  { k: 'PHOTO_SIGNATURE', label: 'Foto da assinatura', icon: Camera },
];

function typedToDataUrl(name: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0A0A0F';
  ctx.font = 'italic 64px Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 28, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

function Sign() {
  const { setDraft, back, params } = useNav();
  // Opened from Configurações or a receipt: only saves the reusable signature.
  const standalone = params.standalone === '1';
  const toast = useToast();
  const [method, setMethod] = useState<SigMethod>('DRAWN_SIGNATURE');
  const [typed, setTyped] = useState('');
  const [drawn, setDrawn] = useState('');
  const [photo, setPhoto] = useState('');
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);

  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await downscale(file));
      toast('Foto da assinatura pronta.');
    } catch {
      toast('Não foi possível ler a foto. Tente outra.');
    }
  };

  const ok =
    method === 'APPROVE_BUTTON' ||
    (method === 'TYPED_NAME' && typed.trim().length > 1) ||
    (method === 'DRAWN_SIGNATURE' && !!drawn) ||
    (method === 'PHOTO_SIGNATURE' && !!photo);

  const confirm = async () => {
    if (!ok || busy) return;
    if (method === 'APPROVE_BUTTON') {
      setDraft((d) => ({ ...d, signature: { mode: 'none' } }));
      toast('O orçamento vai sem a sua assinatura.');
      return back();
    }
    const dataUrl =
      method === 'TYPED_NAME'
        ? typedToDataUrl(typed.trim())
        : method === 'DRAWN_SIGNATURE'
          ? drawn
          : photo;
    if (!save && !standalone) {
      setDraft((d) => ({ ...d, signature: { mode: 'once', dataUrl } }));
      toast('Assinatura pronta. Vai só neste orçamento.');
      return back();
    }
    setBusy(true);
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
    const form = new FormData();
    form.append('file', new File([blob], `assinatura.${ext}`, { type: blob.type || 'image/png' }));
    const r = await saveTechnicianSignature(form);
    setBusy(false);
    if (!r.ok) return toast(r.message);
    if (!standalone) setDraft((d) => ({ ...d, signature: { mode: 'saved' } }));
    toast(
      standalone ? 'Assinatura salva. Vale para orçamentos e recibos.' : 'Assinatura guardada.',
    );
    back();
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <H1 size={32}>Sua assinatura</H1>
        <span style={{ fontSize: 17, color: C.fg3 }}>
          {standalone
            ? 'Fica salva para usar nos orçamentos e recibos.'
            : 'Escolha como quer assinar.'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SIG_METHODS.filter((m) => !standalone || m.k !== 'APPROVE_BUTTON').map((m) => {
          const on = method === m.k;
          const Icon = m.icon;
          return (
            <button
              key={m.k}
              type="button"
              aria-pressed={on}
              onClick={() => setMethod(m.k)}
              style={{
                minHeight: 104,
                borderRadius: 20,
                border: `2px solid ${on ? C.purple : C.border}`,
                background: on ? C.purple50 : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 10,
                padding: 14,
                textAlign: 'left',
                cursor: 'pointer',
                color: C.ink,
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: on ? C.purple : C.purple50,
                  color: on ? '#FFFFFF' : C.purple,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={22} aria-hidden="true" />
              </span>
              <span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {method === 'APPROVE_BUTTON' && (
        <div style={{ ...card, padding: 16, fontSize: 17, lineHeight: '24px', color: C.fg2 }}>
          O orçamento vai sem a sua assinatura. Sua assinatura salva continua guardada para as
          próximas vezes.
        </div>
      )}
      {method === 'TYPED_NAME' && (
        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field
            label="Seu nome"
            value={typed}
            onChange={setTyped}
            placeholder="Ex.: Carlos Mendes"
          />
          <div
            style={{
              height: 96,
              borderRadius: 14,
              background: C.bg,
              border: `1px solid ${C.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '0 18px 14px',
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 30,
                fontStyle: 'italic',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'Georgia, serif',
              }}
            >
              {typed.trim() || 'Seu nome aqui'}
            </span>
            <div style={{ height: 1, background: '#94A3B8' }} />
          </div>
          <span style={{ fontSize: 15, color: C.fg3 }}>Assim o nome aparece no documento.</span>
        </div>
      )}
      {method === 'DRAWN_SIGNATURE' && (
        <div
          style={{
            ...card,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: C.purple200,
            padding: 12,
          }}
        >
          <SignatureCanvas onSign={setDrawn} />
        </div>
      )}
      {method === 'PHOTO_SIGNATURE' &&
        (!photo ? (
          <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 17, lineHeight: '24px', color: C.fg2 }}>
              Assine num papel branco e tire uma foto. Também dá para escolher da galeria.
            </span>
            <label style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                hidden
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
              <span
                style={{
                  height: 60,
                  borderRadius: 16,
                  background: C.purple,
                  color: '#FFFFFF',
                  fontSize: 19,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <Camera size={24} aria-hidden="true" /> Tirar foto
              </span>
            </label>
            <label style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
              <span
                style={{
                  height: 56,
                  borderRadius: 16,
                  border: `1.5px solid ${C.borderStrong}`,
                  background: '#FFFFFF',
                  color: C.ink,
                  fontSize: 18,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={22} aria-hidden="true" /> Escolher da galeria
              </span>
            </label>
          </div>
        ) : (
          <div style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                height: 170,
                borderRadius: 14,
                background: C.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Foto da assinatura"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
            <Btn tone="link" icon={RotateCcw} onClick={() => setPhoto('')}>
              Tirar outra foto
            </Btn>
          </div>
        ))}

      {method !== 'APPROVE_BUTTON' && !standalone && (
        <div style={{ ...card, padding: '8px 16px' }}>
          <CheckRow
            on={save}
            onClick={() => setSave((v) => !v)}
            label="Salvar para usar nas próximas vezes"
            sub="Fica no lugar da assinatura salva."
          />
        </div>
      )}
      <ActionBar>
        {!ok && (
          <Hint>
            {method === 'TYPED_NAME'
              ? 'Escreva seu nome'
              : method === 'DRAWN_SIGNATURE'
                ? 'Faça sua assinatura no quadro acima'
                : 'Tire ou escolha a foto'}
          </Hint>
        )}
        <Btn icon={Check} disabled={!ok || busy} onClick={() => void confirm()}>
          {busy
            ? 'Guardando…'
            : method === 'APPROVE_BUTTON'
              ? 'Enviar sem assinatura'
              : standalone
                ? 'Salvar assinatura'
                : 'Usar esta assinatura'}
        </Btn>
      </ActionBar>
    </>
  );
}

// ── Pronto ────────────────────────────────────────────────────────────
function Done() {
  const { draft, setDraft, tab } = useNav();
  const r = draft.result;
  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center',
          padding: '48px 8px 0',
        }}
      >
        <span
          style={{
            width: 104,
            height: 104,
            borderRadius: 9999,
            background: '#DCFCE7',
            color: C.green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={56} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h1
          style={{
            margin: '8px 0 0',
            fontSize: 30,
            lineHeight: '36px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Pronto! Orçamento enviado
        </h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: C.fg2 }}>
          {draft.client?.name ?? 'O cliente'} recebe no WhatsApp. Quando aprovar, aparece em
          Orçamentos.
        </p>
        {r && (
          <div
            style={{
              ...card,
              width: '100%',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
              marginTop: 8,
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 17, fontWeight: 600 }}>Orçamento #{r.number}</span>
              <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(r.total)}
              </span>
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 12px',
                borderRadius: 9999,
                background: '#FEF3C7',
                color: '#92400E',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#D97706' }} />
              Esperando resposta
            </span>
          </div>
        )}
      </div>
      <ActionBar>
        <Btn
          onClick={() => {
            setDraft(emptyDraft());
            tab('home');
          }}
        >
          Voltar ao início
        </Btn>
        <Btn
          tone="outline"
          icon={FileText}
          height={56}
          onClick={() => {
            setDraft(emptyDraft());
            tab('quotes');
          }}
        >
          Ver orçamentos
        </Btn>
      </ActionBar>
    </>
  );
}
