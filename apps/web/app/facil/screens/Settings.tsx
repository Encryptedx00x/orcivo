'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  FileText,
  Image as ImageIcon,
  PenLine,
  Plus,
  QrCode,
  Trash2,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { setEasyMode } from '../../../components/EasyMode';
import { LogoField } from '../../../components/LogoField';
import { getTechnicianSignature } from '../../(app)/orcamentos/[id]/signature-actions';
import {
  createCatalogItem,
  deleteCatalogItem,
  getApprovalMethods,
  getClientFull,
  getCompany,
  listCatalog,
  setApprovalMethods,
  updateCatalogItem,
  updateClient,
  updateCompany,
  updatePayment,
  type ApprovalMethod,
} from '../actions';
import { ActionBar, Hint, useLoad, useNav } from '../EasyApp';
import {
  Btn,
  C,
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
import { DateField, MenuRow, TextArea, box, centsToDecimal, decimalToDigits } from '../rows';

export const APPROVALS: Array<{ k: ApprovalMethod; label: string; sub: string }> = [
  { k: 'APPROVE_BUTTON', label: 'Botão Aprovar', sub: 'O cliente só toca em Aprovar' },
  { k: 'TYPED_NAME', label: 'Nome digitado', sub: 'O cliente escreve o nome completo' },
  {
    k: 'DRAWN_SIGNATURE',
    label: 'Assinatura com o dedo',
    sub: 'O cliente assina na tela do celular',
  },
  { k: 'PHOTO_SIGNATURE', label: 'Foto da assinatura', sub: 'O cliente manda foto da assinatura' },
];
export const approvalsSummary = (on: ApprovalMethod[]) =>
  APPROVALS.filter((a) => on.includes(a.k))
    .map((a) => a.label)
    .join(', ') || 'Botão Aprovar';

const DEFAULT_TERMS =
  'Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.';
const PIX_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Aleatória' },
];

// ── Configurações ─────────────────────────────────────────────────────
export function SettingsScreen(): React.JSX.Element {
  const { go } = useNav();
  const company = useLoad(getCompany);
  const sig = useLoad(async () => ({ ok: true as const, data: await getTechnicianSignature() }));
  const c = company.data;

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Configurações</H1>
      </div>
      <div
        style={{
          ...card,
          padding: '6px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Toggle
          on
          onClick={() => {
            setEasyMode(false);
            window.location.href = '/dashboard';
          }}
          label="Modo fácil"
          sub="Ligado neste aparelho"
        />
        <span style={{ fontSize: 15, color: C.fg3 }}>
          O mesmo botão fica em Configurações no modo padrão. Você pode trocar quando quiser; nada
          se perde.
        </span>
      </div>
      {company.loading && !c ? (
        <Loading />
      ) : company.error || !c ? (
        <ErrorBox title="Não foi possível carregar as configurações." onRetry={company.reload} />
      ) : (
        <div style={box}>
          <MenuRow
            icon={Building2}
            label="Minha empresa"
            sub="Nome, CPF ou CNPJ, telefone, cidade"
            onClick={() => go('edit', { kind: 'company' })}
          />
          <MenuRow
            icon={ImageIcon}
            label="Logo"
            sub="Aparece no topo dos PDFs"
            onClick={() => go('edit', { kind: 'logo' })}
          />
          <MenuRow
            icon={QrCode}
            label="Chave Pix"
            sub={c.pix_key ? c.pix_key : 'Vai nos orçamentos e recibos'}
            onClick={() => go('edit', { kind: 'pix' })}
          />
          <MenuRow
            icon={UserCheck}
            label="Como o cliente aprova"
            sub={approvalsSummary(c.allowed_approval_methods ?? ['APPROVE_BUTTON'])}
            onClick={() => go('approvals')}
          />
          <MenuRow
            icon={PenLine}
            label="Minha assinatura"
            sub={sig.data?.signature_url ? 'Assinatura salva' : 'Nenhuma salva'}
            onClick={() => go('sign', { standalone: '1' })}
          />
          <MenuRow
            icon={FileText}
            label="Condições padrão"
            sub="Texto e validade que vão nos orçamentos"
            onClick={() => go('edit', { kind: 'terms' })}
          />
          <MenuRow icon={Users} label="Equipe" sub="Membros e convites" href="/equipe" />
          <MenuRow
            icon={UserRound}
            label="Minha conta"
            sub="Nome, e-mail e senha"
            href="/configuracoes"
            last
          />
        </div>
      )}
    </>
  );
}

// ── Como o cliente aprova ─────────────────────────────────────────────
export function ApprovalsScreen(): React.JSX.Element {
  const toast = useToast();
  const methods = useLoad(getApprovalMethods);
  const on = methods.data ?? [];

  const toggle = async (k: ApprovalMethod) => {
    const next = on.includes(k) ? on.filter((m) => m !== k) : [...on, k];
    if (next.length === 0) return toast('Pelo menos uma forma fica ligada.');
    const prev = on;
    methods.setData(next);
    const r = await setApprovalMethods(next);
    if (!r.ok) {
      methods.setData(prev);
      toast(r.message);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <H1 size={30}>Como o cliente aprova</H1>
        <span style={{ fontSize: 17, lineHeight: '24px', color: C.fg3 }}>
          O cliente escolhe no link do WhatsApp entre as formas ligadas. Vale para todos os
          orçamentos. Pelo menos uma fica ligada.
        </span>
      </div>
      {methods.loading && !methods.data ? (
        <Loading />
      ) : methods.error ? (
        <ErrorBox
          title="Não foi possível carregar as formas de aprovação."
          onRetry={methods.reload}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {APPROVALS.map((a) => {
            const isOn = on.includes(a.k);
            return (
              <button
                key={a.k}
                type="button"
                role="checkbox"
                aria-checked={isOn}
                onClick={() => void toggle(a.k)}
                style={{
                  minHeight: 72,
                  width: '100%',
                  borderRadius: 16,
                  border: `2px solid ${isOn ? C.purple : C.border}`,
                  background: isOn ? C.purple50 : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: C.ink,
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    border: `2px solid ${isOn ? C.purple : '#94A3B8'}`,
                    background: isOn ? C.purple : '#FFFFFF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isOn && <Check size={18} aria-hidden="true" />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>{a.label}</span>
                  <span style={{ fontSize: 15, color: C.fg3 }}>
                    {a.sub}
                    {isOn && on.length === 1 ? ' · única ligada' : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Meus serviços e preços ────────────────────────────────────────────
const PAGE = 20;
export function CatalogScreen(): React.JSX.Element {
  const { go } = useNav();
  const catalog = useLoad(listCatalog);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (catalog.data ?? []).filter((c) => !qq || c.name.toLowerCase().includes(qq));
  }, [catalog.data, q]);

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Meus serviços e preços</H1>
      </div>
      <Btn icon={Plus} onClick={() => go('edit', { kind: 'catalogNew' })}>
        Novo item
      </Btn>
      {catalog.loading && !catalog.data ? (
        <Loading />
      ) : catalog.error ? (
        <ErrorBox
          title="Não foi possível carregar seus serviços e preços."
          onRetry={catalog.reload}
        />
      ) : (
        <>
          <Search
            value={q}
            onChange={(v) => {
              setQ(v);
              setLimit(PAGE);
            }}
            placeholder="Buscar serviço ou produto"
          />
          <span style={{ fontSize: 15, color: C.fg3, padding: '0 4px' }}>
            {list.length} {list.length === 1 ? 'item' : 'itens'}
          </span>
          <div style={box}>
            {list.length === 0 && (
              <p style={{ margin: 0, padding: 18, fontSize: 17, color: C.fg2 }}>
                {q ? 'Nenhum item com esse nome.' : 'Você ainda não tem itens. Toque em Novo item.'}
              </p>
            )}
            {list.slice(0, limit).map((c, i, arr) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  go('edit', { kind: 'catalogItem', id: c.id, name: c.name, price: c.unit_price })
                }
                style={{
                  width: '100%',
                  minHeight: 72,
                  border: 'none',
                  borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.line}`,
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
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 16, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(c.unit_price)}
                  </span>
                </span>
                <span style={{ fontSize: 17, fontWeight: 600, color: C.purple700 }}>Editar</span>
              </button>
            ))}
          </div>
          {list.length > limit && (
            <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, list.length - limit)} de {list.length - limit}
            </Btn>
          )}
          <Btn tone="link" onClick={() => (window.location.href = '/catalogo')}>
            Estoque, fotos e importação (modo completo)
          </Btn>
        </>
      )}
    </>
  );
}

// ── Editar (genérico) ─────────────────────────────────────────────────
export function EditScreen(): React.JSX.Element {
  const { params } = useNav();
  switch (params.kind) {
    case 'company':
      return <CompanyEdit />;
    case 'pix':
      return <PixEdit />;
    case 'logo':
      return <LogoEdit />;
    case 'terms':
      return <TermsEdit />;
    case 'catalogItem':
    case 'catalogNew':
      return <CatalogEdit />;
    case 'client':
      return <ClientEdit />;
    case 'payment':
      return <PaymentEdit />;
    default:
      return <ErrorBox title="Nada para editar aqui." onRetry={() => history.back()} />;
  }
}

function EditHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <H1 size={30}>{title}</H1>
      <span style={{ fontSize: 17, color: C.fg3 }}>{sub}</span>
    </div>
  );
}

function SaveBar({
  onSave,
  disabled,
  busy,
  hint,
}: {
  onSave: () => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
}) {
  return (
    <ActionBar>
      {hint && <Hint>{hint}</Hint>}
      <Btn onClick={onSave} disabled={disabled || busy}>
        {busy ? 'Salvando…' : 'Salvar'}
      </Btn>
    </ActionBar>
  );
}

function useSaver() {
  const { back } = useNav();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const save = async (fn: () => Promise<{ ok: boolean; message?: string }>, okMsg: string) => {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return toast(r.message ?? 'Não foi possível salvar.');
    toast(okMsg);
    back();
  };
  return { busy, save };
}

const fieldsGap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 18 };

function CompanyEdit() {
  const company = useLoad(getCompany);
  const { busy, save } = useSaver();
  const [f, setF] = useState<Record<string, string> | null>(null);
  const c = company.data;
  if (c && !f)
    setF({
      trade_name: c.trade_name ?? '',
      document: c.document ?? '',
      phone: c.phone ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
    });
  if (!f)
    return company.error ? (
      <ErrorBox title="Não foi possível carregar a empresa." onRetry={company.reload} />
    ) : (
      <Loading />
    );
  const set = (k: string) => (v: string) =>
    setF((x) => ({ ...(x as Record<string, string>), [k]: v }));
  const docDigits = f.document.replace(/\D/g, '');
  const docOk = !docDigits || docDigits.length === 11 || docDigits.length === 14;
  const ok = f.trade_name.trim().length >= 2 && docOk && (!f.state || f.state.trim().length === 2);
  return (
    <>
      <EditHead title="Minha empresa" sub="Aparece nos PDFs de orçamentos, serviços e recibos." />
      <div style={fieldsGap}>
        <Field label="Nome da empresa" value={f.trade_name} onChange={set('trade_name')} />
        <Field
          label="CPF ou CNPJ"
          value={f.document}
          onChange={set('document')}
          inputMode="numeric"
          placeholder="Opcional"
        />
        <Field
          label="Telefone"
          value={f.phone}
          onChange={set('phone')}
          inputMode="tel"
          placeholder="(00) 00000-0000"
        />
        <Field label="Cidade" value={f.city} onChange={set('city')} />
        <Field
          label="Estado (UF)"
          value={f.state}
          onChange={(v) => set('state')(v.toUpperCase().slice(0, 2))}
          placeholder="SP"
        />
      </div>
      <SaveBar
        busy={busy}
        disabled={!ok}
        hint={!docOk ? 'CPF tem 11 números e CNPJ tem 14' : undefined}
        onSave={() =>
          void save(
            () =>
              updateCompany({
                trade_name: f.trade_name.trim(),
                document: docDigits || null,
                document_type: docDigits ? (docDigits.length === 11 ? 'CPF' : 'CNPJ') : null,
                phone: f.phone.replace(/\D/g, '') || null,
                city: f.city.trim() || null,
                state: f.state.trim() || null,
              }),
            'Dados da empresa salvos.',
          )
        }
      />
    </>
  );
}

function LogoEdit() {
  const company = useLoad(getCompany);
  const toast = useToast();
  if (company.loading && !company.data) return <Loading />;
  if (!company.data)
    return <ErrorBox title="Não foi possível carregar a empresa." onRetry={company.reload} />;
  return (
    <>
      <EditHead title="Logo" sub="Aparece no topo dos orçamentos, serviços e recibos." />
      <div style={{ ...card, padding: 18 }}>
        <LogoField
          large
          initialUrl={company.data.logo_url ?? null}
          tradeName={company.data.trade_name}
          onMessage={toast}
        />
      </div>
    </>
  );
}

function PixEdit() {
  const company = useLoad(getCompany);
  const { busy, save } = useSaver();
  const [type, setType] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const c = company.data;
  if (c && key === null) {
    setKey(c.pix_key ?? '');
    const d = (c.pix_key ?? '').replace(/\D/g, '');
    setType(
      !c.pix_key
        ? 'CNPJ'
        : c.pix_key.includes('@')
          ? 'EMAIL'
          : d.length === 14
            ? 'CNPJ'
            : d.length === 11 && !/[()\s-]/.test(c.pix_key)
              ? 'CPF'
              : /^[0-9a-f-]{36}$/i.test(c.pix_key)
                ? 'RANDOM'
                : 'PHONE',
    );
  }
  if (key === null || type === null)
    return company.error ? (
      <ErrorBox title="Não foi possível carregar a empresa." onRetry={company.reload} />
    ) : (
      <Loading />
    );
  return (
    <>
      <EditHead title="Chave Pix" sub="Aparece nos orçamentos e recibos para o cliente pagar." />
      <div style={fieldsGap}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Tipo de chave</span>
          <Options cols={3} options={PIX_TYPES} value={type} onPick={setType} />
        </div>
        <Field
          label="Chave"
          value={key}
          onChange={setKey}
          inputMode={
            type === 'EMAIL' || type === 'RANDOM' ? 'text' : type === 'PHONE' ? 'tel' : 'numeric'
          }
        />
      </div>
      <SaveBar
        busy={busy}
        disabled={!key.trim()}
        onSave={() =>
          void save(
            () =>
              updateCompany({
                pix_key_type: type,
                pix_key:
                  type === 'EMAIL' || type === 'RANDOM' ? key.trim() : key.replace(/\D/g, ''),
              }),
            'Chave Pix salva.',
          )
        }
      />
    </>
  );
}

function TermsEdit() {
  const company = useLoad(getCompany);
  const { busy, save } = useSaver();
  const [terms, setTerms] = useState<string | null>(null);
  const [days, setDays] = useState(15);
  const c = company.data;
  if (c && terms === null) {
    setTerms(c.quote_default_terms ?? DEFAULT_TERMS);
    setDays(c.quote_default_validity_days ?? 15);
  }
  if (terms === null)
    return company.error ? (
      <ErrorBox title="Não foi possível carregar a empresa." onRetry={company.reload} />
    ) : (
      <Loading />
    );
  return (
    <>
      <EditHead
        title="Condições padrão"
        sub="Entram em todo orçamento novo. Dá para mudar em cada um."
      />
      <div style={fieldsGap}>
        <TextArea
          label="Condições"
          value={terms}
          onChange={(v) => setTerms(v.slice(0, 2000))}
          rows={5}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Validade padrão</span>
          <Options
            cols={3}
            value={days}
            onPick={setDays}
            options={[
              { value: 7, label: '7 dias' },
              { value: 15, label: '15 dias' },
              { value: 30, label: '30 dias' },
            ]}
          />
        </div>
      </div>
      <SaveBar
        busy={busy}
        onSave={() =>
          void save(
            () =>
              updateCompany({
                quote_default_terms: terms.trim() || null,
                quote_default_validity_days: days,
              }),
            'Condições salvas.',
          )
        }
      />
    </>
  );
}

function CatalogEdit() {
  const { params, back } = useNav();
  const toast = useToast();
  const isNew = params.kind === 'catalogNew';
  const { busy, save } = useSaver();
  const [name, setName] = useState(params.name ?? '');
  const [digits, setDigits] = useState(params.price ? decimalToDigits(params.price) : '');
  const price = centsToDecimal(digits);
  const ok = name.trim().length >= 2 && Number(price) > 0;
  return (
    <>
      <EditHead
        title={isNew ? 'Novo item' : `Editar ${params.name ?? 'item'}`}
        sub={isNew ? 'Fica em Meus serviços e preços.' : 'Muda para os próximos orçamentos.'}
      />
      <div style={fieldsGap}>
        <Field
          label="Nome"
          value={name}
          onChange={setName}
          placeholder="Ex.: Instalação de tomada"
        />
        <Field
          label="Preço"
          value={digits ? formatMoney(price) : ''}
          onChange={(v) => setDigits(v.replace(/\D/g, '').slice(0, 10))}
          placeholder="R$ 0,00"
          inputMode="numeric"
          big
        />
        {!isNew && params.id && (
          <Btn
            tone="outline"
            icon={Trash2}
            iconColor={C.red}
            style={{ color: '#B91C1C', borderColor: '#FECACA' }}
            onClick={async () => {
              if (
                !window.confirm(
                  `Excluir ${params.name ?? 'este item'}? Ele continua nos orçamentos antigos.`,
                )
              )
                return;
              const r = await deleteCatalogItem(params.id as string);
              if (!r.ok) return toast(r.message);
              toast('Item excluído.');
              back();
            }}
          >
            Excluir item
          </Btn>
        )}
      </div>
      <SaveBar
        busy={busy}
        disabled={!ok}
        onSave={() =>
          void save(
            () =>
              isNew
                ? createCatalogItem({ name, price })
                : updateCatalogItem(params.id as string, { name, price }),
            'Item salvo.',
          )
        }
      />
    </>
  );
}

function ClientEdit() {
  const { params } = useNav();
  const id = params.id ?? '';
  const client = useLoad(() => getClientFull(id), [id]);
  const { busy, save } = useSaver();
  const [f, setF] = useState<Record<string, string> | null>(null);
  const c = client.data;
  if (c && !f)
    setF({
      name: c.name ?? '',
      phone: c.phone ?? '',
      tax_id: c.tax_id ?? '',
      email: c.email ?? '',
      street: [c.street, c.number].filter(Boolean).join(', '),
      city: c.city ?? '',
      notes: c.notes ?? '',
    });
  if (!f)
    return client.error ? (
      <ErrorBox title="Não foi possível carregar este cliente." onRetry={client.reload} />
    ) : (
      <Loading />
    );
  const set = (k: string) => (v: string) =>
    setF((x) => ({ ...(x as Record<string, string>), [k]: v }));
  const ok = f.name.trim().length >= 2 && f.phone.replace(/\D/g, '').length >= 10;
  return (
    <>
      <EditHead title="Editar cliente" sub={c?.name ?? ''} />
      <div style={fieldsGap}>
        <Field label="Nome" value={f.name} onChange={set('name')} />
        <Field label="Telefone" value={f.phone} onChange={set('phone')} inputMode="tel" />
        <Field
          label="Endereço"
          value={f.street}
          onChange={set('street')}
          placeholder="Rua e número"
        />
        <Field label="Cidade" value={f.city} onChange={set('city')} />
        <Field
          label="CPF ou CNPJ"
          value={f.tax_id}
          onChange={set('tax_id')}
          inputMode="numeric"
          placeholder="Opcional"
        />
        <Field label="E-mail" value={f.email} onChange={set('email')} placeholder="Opcional" />
        <TextArea
          label="Observações"
          value={f.notes}
          onChange={set('notes')}
          placeholder="Opcional"
          rows={3}
        />
      </div>
      <SaveBar
        busy={busy}
        disabled={!ok}
        hint={!ok ? 'Preencha nome e telefone' : undefined}
        onSave={() => void save(() => updateClient(id, f as never), 'Dados do cliente salvos.')}
      />
    </>
  );
}

function PaymentEdit() {
  const { params } = useNav();
  const { busy, save } = useSaver();
  const [digits, setDigits] = useState(params.amount ? decimalToDigits(params.amount) : '');
  const [due, setDue] = useState(params.due ? params.due.slice(0, 10) : '');
  const [reason, setReason] = useState('');
  const amount = centsToDecimal(digits);
  const ok = Number(amount) > 0 && reason.trim().length >= 3;
  return (
    <>
      <EditHead title="Mudar recebimento" sub={params.name ?? ''} />
      <div style={fieldsGap}>
        <Field
          label="Valor"
          value={digits ? formatMoney(amount) : ''}
          onChange={(v) => setDigits(v.replace(/\D/g, '').slice(0, 10))}
          inputMode="numeric"
          big
        />
        <DateField label="Vencimento" value={due} onChange={setDue} />
        <Field
          label="Por que mudou?"
          value={reason}
          onChange={setReason}
          placeholder="Ex.: Cliente pediu mais prazo"
        />
      </div>
      <SaveBar
        busy={busy}
        disabled={!ok}
        hint={reason.trim().length < 3 ? 'Conte em poucas palavras por que mudou' : undefined}
        onSave={() =>
          void save(
            () =>
              updatePayment(params.id as string, {
                amount,
                due_date: due ? new Date(`${due}T12:00:00`).toISOString() : null,
                justification: reason.trim(),
              }),
            'Recebimento atualizado.',
          )
        }
      />
    </>
  );
}
