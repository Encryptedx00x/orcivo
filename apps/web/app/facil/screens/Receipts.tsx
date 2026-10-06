'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  MessageCircle,
  Plus,
  ReceiptText,
  UserPlus,
} from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import {
  createReceipt,
  getReceipt,
  listReceipts,
  receiptFormData,
  setReceiptSignature,
} from '../../(app)/documentos/receipt-actions';
import {
  RECEIPT_METHODS,
  methodLabel,
  receiptNo,
  receiptPdfUrl,
  shareReceipt,
  type Receipt,
} from '../../../lib/receipts';
import { ReceiptPaper } from '../../../components/ReceiptPaper';
import { createClient, getCompany } from '../actions';
import { ActionBar, Hint, useLoad, useNav } from '../EasyApp';
import {
  Btn,
  C,
  Chip,
  EmptyBox,
  ErrorBox,
  Field,
  H1,
  Loading,
  Options,
  Search,
  Toggle,
  card,
  useToast,
} from '../ui';
import { DateField, centsToDecimal, ymd } from '../rows';
import { NewClientForm } from './QuoteFlow';

const PAGE = 10;
const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const shortDate = (r: Receipt) => {
  const d = new Date(r.paid_at ?? r.created_at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'hoje';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export function ReceiptsScreen(): React.JSX.Element {
  const { go } = useNav();
  const toast = useToast();
  const receipts = useLoad(listReceipts);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const list = useMemo(() => {
    const qq = norm(q.trim());
    return (receipts.data ?? []).filter(
      (r) => !qq || norm(r.customer.name).includes(qq) || receiptNo(r.receipt_number).includes(qq),
    );
  }, [receipts.data, q]);

  const send = async (r: Receipt) => {
    const full = await getReceipt(r.id);
    const how = await shareReceipt(full.ok ? full.data : r);
    if (how === 'whatsapp') toast(`Abrindo o WhatsApp de ${r.customer.name.split(' ')[0]}…`);
  };

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Recibos</H1>
      </div>
      <Btn icon={Plus} onClick={() => go('receiptNew')}>
        Novo recibo
      </Btn>
      {receipts.loading && !receipts.data ? (
        <Loading />
      ) : receipts.error ? (
        <ErrorBox title="Não foi possível carregar seus recibos." onRetry={receipts.reload} />
      ) : (receipts.data ?? []).length === 0 ? (
        <EmptyBox
          icon={ReceiptText}
          title="Você ainda não tem recibos."
          text="O recibo aparece quando você marca um pagamento como recebido. Também dá para criar um agora."
          action="Novo recibo"
          onAction={() => go('receiptNew')}
        />
      ) : (
        <>
          <Search
            value={q}
            onChange={(v) => {
              setQ(v);
              setLimit(PAGE);
            }}
            placeholder="Buscar cliente"
          />
          <span style={{ fontSize: 15, color: C.fg3, padding: '0 4px' }}>
            Quando você marca um pagamento como recebido, o recibo aparece aqui sozinho.
          </span>
          {list.length === 0 && (
            <p style={{ ...card, margin: 0, padding: 18, fontSize: 17, color: C.fg2 }}>
              Nenhum recibo com esse nome.
            </p>
          )}
          {list.slice(0, limit).map((r) => (
            <div
              key={r.id}
              style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 19, fontWeight: 600 }}>{r.customer.name}</span>
                <span style={{ fontSize: 15, color: C.fg3 }}>
                  Recibo nº {receiptNo(r.receipt_number)} · {shortDate(r)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(r.amount)}
                </span>
                <Chip kind="ok" label={`Pago · ${methodLabel(r.method)}`} small />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Btn
                  tone="outline"
                  icon={ReceiptText}
                  height={56}
                  onClick={() => go('receipt', { id: r.id })}
                >
                  Abrir
                </Btn>
                <Btn tone="soft" icon={MessageCircle} height={56} onClick={() => void send(r)}>
                  Enviar
                </Btn>
              </div>
            </div>
          ))}
          {list.length > limit && (
            <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, list.length - limit)} de {list.length - limit}
            </Btn>
          )}
        </>
      )}
    </>
  );
}

export function ReceiptScreen(): React.JSX.Element {
  const { params, go } = useNav();
  const toast = useToast();
  const id = params.id ?? '';
  const receipt = useLoad(() => getReceipt(id), [id]);
  const company = useLoad(getCompany);
  const [busy, setBusy] = useState(false);

  if (receipt.loading && !receipt.data) return <Loading />;
  if (receipt.error || !receipt.data)
    return <ErrorBox title="Não foi possível carregar este recibo." onRetry={receipt.reload} />;
  const r = receipt.data;
  const signed = !!r.receipt_signature_key;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const res = await setReceiptSignature(r.id, !signed);
    setBusy(false);
    if (!res.ok) return toast(res.message);
    receipt.setData(res.data);
    toast(signed ? 'Assinatura tirada do recibo.' : 'Sua assinatura vai no recibo.');
  };

  return (
    <>
      <H1 size={28}>Recibo nº {receiptNo(r.receipt_number)}</H1>
      <ReceiptPaper receipt={r} company={company.data ?? { trade_name: '' }} large />
      <div
        style={{
          ...card,
          padding: '6px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <Toggle on={signed} onClick={() => void toggle()} label="Pôr minha assinatura no recibo" />
        <Btn tone="link" onClick={() => go('sign', { standalone: '1' })}>
          Trocar assinatura
        </Btn>
      </div>
      <ActionBar>
        <Btn
          icon={MessageCircle}
          onClick={async () => {
            const how = await shareReceipt(r);
            if (how === 'whatsapp') toast('Abrindo o WhatsApp…');
          }}
        >
          Enviar no WhatsApp
        </Btn>
        <a
          href={receiptPdfUrl(r.id, true)}
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
            textDecoration: 'none',
          }}
        >
          <Download size={22} aria-hidden="true" /> Baixar PDF
        </a>
      </ActionBar>
    </>
  );
}

const WHENS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'other', label: 'Outro dia' },
] as const;
type When = (typeof WHENS)[number]['value'];

export function ReceiptNewScreen(): React.JSX.Element {
  const { params, replace } = useNav();
  const toast = useToast();
  const form = useLoad(receiptFormData);
  const [clientId, setClientId] = useState<string | null>(params.client ?? null);
  const [extraClients, setExtraClients] = useState<Array<{ id: string; name: string }>>([]);
  const [q, setQ] = useState('');
  const [ncOpen, setNcOpen] = useState(false);
  const [ncName, setNcName] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [digits, setDigits] = useState('');
  const [ref, setRef] = useState('');
  const [method, setMethod] = useState('PIX');
  const [when, setWhen] = useState<When>('today');
  const [otherDay, setOtherDay] = useState(ymd(new Date()));
  const [moreOpen, setMoreOpen] = useState(params.link === '1');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const clients = [...extraClients, ...(form.data?.customers ?? [])];
  const qq = norm(q.trim());
  const shown = (qq ? clients.filter((c) => norm(c.name).includes(qq)) : clients.slice(0, 3)).slice(
    0,
    5,
  );
  const picked = clients.find((c) => c.id === clientId);
  if (picked && !shown.some((c) => c.id === picked.id)) shown.unshift(picked);
  const links = (form.data?.links ?? []).filter((l) => l.customer_id === clientId);
  const amount = centsToDecimal(digits);
  const ok = !!clientId && Number(amount) > 0;

  const saveClient = async () => {
    const r = await createClient({ name: ncName, phone: ncPhone });
    if (!r.ok) return toast(r.message);
    setExtraClients((x) => [{ id: r.data.id, name: r.data.name }, ...x]);
    setClientId(r.data.id);
    setNcOpen(false);
    setNcName('');
    setNcPhone('');
    toast(`Pronto! Cliente salvo: ${r.data.name.split(' ')[0]}.`);
  };

  const paidAt = () => {
    const d = when === 'other' ? new Date(`${otherDay}T12:00:00`) : new Date();
    if (when === 'yesterday') d.setDate(d.getDate() - 1);
    return d.toISOString();
  };

  const submit = async () => {
    if (!ok || busy || !clientId) return;
    setBusy(true);
    const chosen = links.find((l) => `${l.kind}:${l.id}` === link);
    const r = await createReceipt({
      customer_id: clientId,
      amount,
      method,
      paid_at: paidAt(),
      description: ref,
      work_order_id: chosen?.kind === 'work_order' ? chosen.id : undefined,
      quote_id: chosen?.kind === 'quote' ? chosen.id : undefined,
    });
    setBusy(false);
    if (!r.ok) return toast(r.message);
    toast(`Pronto! Recibo nº ${receiptNo(r.data.receipt_number)} criado.`);
    replace('receipt', { id: r.data.id });
  };

  const chosenLink = links.find((l) => `${l.kind}:${l.id}` === link);
  const sectionTitle: React.CSSProperties = { fontSize: 19, fontWeight: 700 };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <H1 size={32}>Novo recibo</H1>
        <span style={{ fontSize: 17, color: C.fg3 }}>Para um pagamento que você já recebeu.</span>
      </div>
      {form.loading && !form.data ? (
        <Loading />
      ) : form.error ? (
        <ErrorBox title="Não foi possível carregar seus clientes." onRetry={form.reload} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={sectionTitle}>De quem recebeu?</span>
            {clients.length > 3 && (
              <Search value={q} onChange={setQ} placeholder="Buscar cliente" />
            )}
            {shown.map((c) => {
              const on = c.id === clientId;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setClientId(c.id);
                    setLink('');
                  }}
                  style={{
                    minHeight: 60,
                    borderRadius: 16,
                    border: `2px solid ${on ? C.purple : C.border}`,
                    background: on ? C.purple50 : '#FFFFFF',
                    color: C.ink,
                    fontSize: 18,
                    fontWeight: on ? 700 : 500,
                    textAlign: 'left',
                    padding: '0 16px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {c.name}
                </button>
              );
            })}
            {ncOpen ? (
              <>
                <NewClientForm
                  name={ncName}
                  phone={ncPhone}
                  onName={setNcName}
                  onPhone={setNcPhone}
                  onClose={() => setNcOpen(false)}
                />
                <Btn
                  tone="soft"
                  onClick={() => void saveClient()}
                  disabled={ncName.trim().length < 2 || ncPhone.replace(/\D/g, '').length < 10}
                >
                  Salvar cliente
                </Btn>
              </>
            ) : (
              <Btn tone="dashed" icon={UserPlus} height={60} onClick={() => setNcOpen(true)}>
                Cliente novo
              </Btn>
            )}
          </div>

          <Field
            label="Quanto?"
            value={digits ? formatMoney(amount) : ''}
            onChange={(v) => setDigits(v.replace(/\D/g, '').slice(0, 10))}
            placeholder="R$ 0,00"
            inputMode="numeric"
            big
          />
          <Field
            label="Referente a quê?"
            value={ref}
            onChange={(v) => setRef(v.slice(0, 200))}
            placeholder="Ex.: Troca de 2 tomadas"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={sectionTitle}>Como recebeu?</span>
            <Options
              cols={2}
              options={RECEIPT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
              value={method}
              onPick={setMethod}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={sectionTitle}>Quando?</span>
            <Options
              cols={3}
              options={WHENS.map((w) => ({ value: w.value, label: w.label }))}
              value={when}
              onPick={setWhen}
            />
            {when === 'other' && (
              <DateField
                label="Dia do pagamento"
                value={otherDay}
                onChange={setOtherDay}
                max={ymd(new Date())}
              />
            )}
          </div>

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
                <span style={{ fontSize: 15, color: C.fg3 }}>
                  {chosenLink ? `Ligado a ${chosenLink.label}` : 'Ligar a um orçamento ou serviço'}
                </span>
              </span>
              {moreOpen ? (
                <ChevronUp size={26} color={C.fg2} aria-hidden="true" />
              ) : (
                <ChevronDown size={26} color={C.fg2} aria-hidden="true" />
              )}
            </button>
            {moreOpen && (
              <div
                style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {!clientId ? (
                  <span style={{ fontSize: 16, color: C.fg3 }}>Escolha o cliente primeiro.</span>
                ) : links.length === 0 ? (
                  <span style={{ fontSize: 16, color: C.fg3 }}>
                    Este cliente não tem serviço nem orçamento aberto.
                  </span>
                ) : (
                  [
                    { key: '', label: 'Nenhum' },
                    ...links.map((l) => ({ key: `${l.kind}:${l.id}`, label: l.label })),
                  ].map((o) => {
                    const on = o.key === link;
                    return (
                      <button
                        key={o.key || 'none'}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setLink(o.key)}
                        style={{
                          minHeight: 56,
                          borderRadius: 14,
                          border: `1.5px solid ${on ? C.purple : C.borderStrong}`,
                          background: on ? C.purple : '#FFFFFF',
                          color: on ? '#FFFFFF' : C.ink,
                          fontSize: 17,
                          fontWeight: 600,
                          textAlign: 'left',
                          padding: '0 14px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <Hint>O valor também entra no Financeiro como recebido.</Hint>
        </div>
      )}
      <ActionBar>
        {!ok && <Hint>{clientId ? 'Falta o valor' : 'Escolha de quem recebeu'}</Hint>}
        <Btn onClick={() => void submit()} disabled={!ok || busy}>
          {busy ? 'Criando…' : 'Criar recibo'}
        </Btn>
      </ActionBar>
    </>
  );
}
