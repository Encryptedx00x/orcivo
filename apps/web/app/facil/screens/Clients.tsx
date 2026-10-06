'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  FileText,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
  UserPlus,
  Users,
  Trash2,
} from 'lucide-react';
import { formatMoney, maskPhone, onlyDigits } from '@orcivo/shared-types';
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  listQuotes,
  type EasyQuote,
} from '../actions';
import { ActionBar, Hint, emptyDraft, useLoad, useNav } from '../EasyApp';
import {
  Avatar,
  Btn,
  C,
  Chip,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  Search,
  card,
  firstName,
  useToast,
} from '../ui';
import { NewClientForm } from './QuoteFlow';
import { quoteChip } from './Quotes';

const PAGE = 20;
const tel = (phone: string | null) => (phone ? `tel:${onlyDigits(phone)}` : undefined);
const wa = (phone: string | null) => (phone ? `https://wa.me/55${onlyDigits(phone)}` : undefined);

export function ClientsScreen(): JSX.Element {
  const { go } = useNav();
  const clients = useLoad(listClients);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const qq = q.trim().toLowerCase();
  const qDigits = qq.replace(/\D/g, '');
  const all = clients.data ?? [];
  const list = all.filter(
    (c) =>
      !qq || c.name.toLowerCase().includes(qq) || (qDigits && (c.phone ?? '').includes(qDigits)),
  );
  const shown = list.slice(0, limit);

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '8px 4px 0',
        }}
      >
        <H1>Clientes</H1>
        {clients.data && (
          <span style={{ fontSize: 16, color: C.fg3 }}>
            {list.length} {list.length === 1 ? 'cliente' : 'clientes'}
          </span>
        )}
      </div>
      {clients.loading && !clients.data ? (
        <Loading />
      ) : clients.error ? (
        <ErrorBox title="Não foi possível carregar seus clientes." onRetry={clients.reload} />
      ) : all.length === 0 ? (
        <EmptyBox
          icon={Users}
          title="Você ainda não cadastrou clientes."
          text="Cadastre seu primeiro cliente para criar orçamentos e serviços."
          action="Novo cliente"
          onAction={() => go('clientNew')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn icon={UserPlus} onClick={() => go('clientNew')}>
            Novo cliente
          </Btn>
          <Search
            value={q}
            onChange={(v) => {
              setQ(v);
              setLimit(PAGE);
            }}
            placeholder="Buscar nome ou telefone"
          />
          {shown.map((c) => (
            <div
              key={c.id}
              style={{
                ...card,
                padding: '12px 16px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => go('client', { id: c.id })}
                style={{
                  minHeight: 60,
                  border: 'none',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: C.ink,
                  width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                <Avatar name={c.name} />
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 17, color: C.fg2, fontVariantNumeric: 'tabular-nums' }}>
                    {maskPhone(c.phone) || 'Sem telefone'}
                  </span>
                </span>
                <ChevronRight size={24} color={C.fg4} aria-hidden="true" />
              </button>
              {c.phone && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <a href={tel(c.phone)} style={linkBtn}>
                    <Phone size={22} color={C.purple} aria-hidden="true" /> Ligar
                  </a>
                  <a href={wa(c.phone)} target="_blank" rel="noopener noreferrer" style={linkBtn}>
                    <MessageCircle size={22} color={C.green} aria-hidden="true" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          ))}
          {qq && list.length === 0 && (
            <div style={{ ...card, padding: 18, fontSize: 17, color: C.fg2 }}>
              Nenhum cliente com esse nome ou telefone.
            </div>
          )}
          {list.length > shown.length && (
            <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, list.length - shown.length)} de {list.length - shown.length}
            </Btn>
          )}
        </div>
      )}
    </>
  );
}

const linkBtn: React.CSSProperties = {
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
  gap: 8,
  textDecoration: 'none',
};

export function ClientScreen(): JSX.Element {
  const { params, go, tab, setDraft } = useNav();
  const toast = useToast();
  const id = params.id ?? '';
  const client = useLoad(() => getClient(id), [id]);
  const quotes = useLoad(listQuotes);
  const [more, setMore] = useState(false);
  const [histLimit, setHistLimit] = useState(3);

  if (client.loading && !client.data) return <Loading />;
  if (client.error || !client.data)
    return <ErrorBox title="Não foi possível carregar este cliente." onRetry={client.reload} />;
  const c = client.data;
  const addr = [
    c.street && `${c.street}${c.number ? `, ${c.number}` : ''}`,
    c.neighborhood,
    c.city && `${c.city}${c.state ? `/${c.state}` : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const hist: EasyQuote[] = (quotes.data ?? []).filter((q) => q.customer?.id === c.id);
  const remove = async () => {
    if (
      !window.confirm(`Excluir ${c.name}? O histórico de orçamentos e serviços continua guardado.`)
    )
      return;
    const r = await deleteClient(c.id);
    if (!r.ok) return toast(r.message);
    toast(`${firstName(c.name)} excluído.`);
    tab('clients');
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar name={c.name} size={64} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <H1 size={26}>{c.name}</H1>
          <span style={{ fontSize: 17, color: C.fg2, fontVariantNumeric: 'tabular-nums' }}>
            {maskPhone(c.phone) || 'Sem telefone'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, color: C.fg3 }}>
          <MapPin size={20} aria-hidden="true" />
          <span>{addr || 'Endereço não informado'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setDraft({ ...emptyDraft(), client: { id: c.id, name: c.name, phone: c.phone } });
              go('q2');
            }}
            style={{ ...bigAction, border: 'none', background: C.purple, color: '#FFFFFF' }}
          >
            <FileText size={30} aria-hidden="true" />
            <span style={{ fontSize: 16, fontWeight: 700 }}>Orçamento</span>
          </button>
          <button
            type="button"
            onClick={() => go('agNew', { client: c.id, clientName: c.name, type: 'INSTALACAO' })}
            style={bigAction}
          >
            <ClipboardList size={30} aria-hidden="true" />
            <span style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Serviço</span>
          </button>
          {c.phone ? (
            <a href={tel(c.phone)} style={{ ...bigAction, textDecoration: 'none' }}>
              <Phone size={30} aria-hidden="true" />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Ligar</span>
            </a>
          ) : (
            <span style={{ ...bigAction, opacity: 0.5 }}>
              <Phone size={30} aria-hidden="true" />
              <span style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Ligar</span>
            </span>
          )}
        </div>

        <div style={{ ...card, padding: '6px 16px 8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 52,
            }}
          >
            <span style={{ fontSize: 19, fontWeight: 700 }}>Histórico</span>
          </div>
          {hist.slice(0, histLimit).map((q) => {
            const chip = quoteChip(q.status);
            return (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '12px 0',
                  borderTop: `1px solid ${C.line}`,
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 600 }}>Orçamento #{q.number}</span>
                  <span style={{ fontSize: 15, color: C.fg3, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(q.total)}
                  </span>
                </span>
                <Chip kind={chip.kind} label={chip.label} small />
              </div>
            );
          })}
          {hist.length > histLimit && (
            <Btn tone="link" onClick={() => setHistLimit((l) => l + 5)}>
              Ver mais {Math.min(5, hist.length - histLimit)}
            </Btn>
          )}
          {hist.length === 0 && !quotes.loading && (
            <p
              style={{
                margin: 0,
                padding: '12px 0 10px',
                borderTop: `1px solid ${C.line}`,
                fontSize: 17,
                color: C.fg2,
              }}
            >
              Nenhum orçamento com {firstName(c.name)} ainda.
            </p>
          )}
        </div>

        <div style={{ ...card, overflow: 'hidden' }}>
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((v) => !v)}
            style={{
              width: '100%',
              minHeight: 64,
              border: 'none',
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
            <span style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Mais opções</span>
              <span style={{ fontSize: 15, color: C.fg3 }}>WhatsApp, editar dados</span>
            </span>
            {more ? (
              <ChevronUp size={26} color={C.fg2} aria-hidden="true" />
            ) : (
              <ChevronDown size={26} color={C.fg2} aria-hidden="true" />
            )}
          </button>
          {more && (
            <div
              style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${C.line}` }}
            >
              {c.phone && (
                <a href={wa(c.phone)} target="_blank" rel="noopener noreferrer" style={menuRow}>
                  <MessageCircle size={22} color={C.green} aria-hidden="true" /> Mandar mensagem no
                  WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => go('edit', { kind: 'client', id: c.id })}
                style={{
                  ...menuRow,
                  border: 'none',
                  borderBottom: `1px solid ${C.line}`,
                  background: '#FFFFFF',
                  width: '100%',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <PenLine size={22} color={C.purple} aria-hidden="true" /> Editar dados do cliente
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                style={{
                  ...menuRow,
                  borderBottom: 'none',
                  border: 'none',
                  background: '#FFFFFF',
                  color: C.red,
                  width: '100%',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Trash2 size={22} color={C.red} aria-hidden="true" /> Excluir cliente
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const bigAction: React.CSSProperties = {
  minHeight: 108,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  background: '#FFFFFF',
  color: C.purple,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
export const menuRow: React.CSSProperties = {
  minHeight: 60,
  borderBottom: `1px solid ${C.line}`,
  background: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 16px',
  fontSize: 18,
  fontWeight: 600,
  color: C.ink,
  textDecoration: 'none',
};

export function ClientNewScreen(): JSX.Element {
  const { tab } = useNav();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 10;
  const save = async () => {
    setSaving(true);
    const r = await createClient({ name, phone });
    setSaving(false);
    if (!r.ok) return toast(r.message);
    toast(`Pronto! ${firstName(r.data.name)} salvo nos clientes.`);
    tab('clients');
  };
  return (
    <>
      <H1>Cliente novo</H1>
      <NewClientForm
        name={name}
        phone={phone}
        onName={setName}
        onPhone={(v) => setPhone(maskPhone(v))}
      />
      <ActionBar>
        {!valid && <Hint>Preencha nome e telefone</Hint>}
        <Btn disabled={!valid || saving} onClick={() => void save()}>
          {saving ? 'Salvando…' : 'Salvar cliente'}
        </Btn>
      </ActionBar>
    </>
  );
}
