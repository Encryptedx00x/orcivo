'use client';

import { useMemo, useState } from 'react';
import { Calendar, Check, Minus, MoreHorizontal, Phone, Plus, User, XCircle } from 'lucide-react';
import {
  createAppointment,
  deleteAppointment,
  getClient,
  listAppointments,
  listClients,
  updateAppointment,
  type EasyAppointment,
} from '../actions';
import { ActionBar, Hint, useLoad, useNav } from '../EasyApp';
import { MoreButton, useSheet } from '../sheet';
import { openPicker } from '../rows';
import {
  Btn,
  C,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  Options,
  Search,
  card,
  firstName,
  hhmm,
  useToast,
} from '../ui';

const TYPES = [
  { value: 'VISITA', label: 'Visita' },
  { value: 'INSTALACAO', label: 'Instalação' },
  { value: 'ORCAMENTO', label: 'Orçamento' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'OUTRO', label: 'Outro' },
];
const typeLabel = (t: string | null) => TYPES.find((x) => x.value === t)?.label ?? 'Outro';

const ymd = (d: Date) => d.toLocaleDateString('sv-SE');
/** "hoje", "amanhã" or "qui, 08/10" for toasts. */
const dayWord = (day: string) => {
  const today = new Date();
  if (day === ymd(today)) return 'hoje';
  if (day === ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)))
    return 'amanhã';
  return new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fromYmd = (s: string) => new Date(`${s}T00:00:00`);
function dayTitle(s: string) {
  const today = ymd(new Date());
  const tomorrow = ymd(addDays(new Date(), 1));
  const label = fromYmd(s).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s === today
    ? `Hoje · ${label}`
    : s === tomorrow
      ? `Amanhã · ${label}`
      : label.charAt(0).toUpperCase() + label.slice(1);
}
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
/** Next half hour from now: a booking for today never starts in the past by default. */
const nextSlot = () => {
  const d = new Date();
  return Math.min(23 * 60 + 30, Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 30) * 30);
};
const mm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function DayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = ymd(new Date());
  const tomorrow = ymd(addDays(new Date(), 1));
  const isOther = value !== today && value !== tomorrow;
  const chip = (on: boolean): React.CSSProperties => ({
    height: 56,
    borderRadius: 14,
    border: `1.5px solid ${on ? C.purple : C.borderStrong}`,
    background: on ? C.purple : '#FFFFFF',
    color: on ? '#FFFFFF' : C.ink,
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      <button
        type="button"
        aria-pressed={value === today}
        onClick={() => onChange(today)}
        style={chip(value === today)}
      >
        Hoje
      </button>
      <button
        type="button"
        aria-pressed={value === tomorrow}
        onClick={() => onChange(tomorrow)}
        style={chip(value === tomorrow)}
      >
        Amanhã
      </button>
      {/* Any day: native date picker under a big chip. */}
      <label style={chip(isOther)}>
        {isOther
          ? fromYmd(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : 'Outro dia'}
        <input
          type="date"
          aria-label="Escolher outro dia"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={openPicker}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        />
      </label>
    </div>
  );
}

export function AgendaScreen(): JSX.Element {
  const { go, params } = useNav();
  const toast = useToast();
  // Opens on the day just booked (params.day) so the new appointment is in view.
  const [day, setDay] = useState(params.day ?? ymd(new Date()));
  const range = useMemo(() => {
    const from = fromYmd(day);
    return { from: from.toISOString(), to: addDays(from, 1).toISOString() };
  }, [day]);
  const appts = useLoad(() => listAppointments(range.from, range.to), [range.from]);
  const events = (appts.data ?? []).slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const sheet = useSheet();
  const call = async (clientId: string) => {
    const r = await getClient(clientId);
    const digits = r.ok ? (r.data.phone ?? '').replace(/\D/g, '') : '';
    if (!digits) return toast('Este cliente não tem telefone.');
    window.location.href = `tel:${digits}`;
  };
  const unmark = async (a: EasyAppointment) => {
    const r = await deleteAppointment(a.id);
    if (!r.ok) return toast(r.message);
    appts.reload();
    toast(`${a.title} desmarcado.`, async () => {
      const back = await createAppointment({
        title: a.title,
        type: a.type ?? 'OUTRO',
        customer_id: a.customer?.id,
        starts_at: a.starts_at,
        ends_at: a.ends_at ?? a.starts_at,
      });
      if (!back.ok) return toast(back.message);
      appts.reload();
    });
  };

  const blocks: React.ReactNode[] = [];
  events.forEach((e, i) => {
    const start = new Date(e.starts_at);
    const end = e.ends_at ? new Date(e.ends_at) : null;
    blocks.push(
      <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div
          style={{
            width: 76,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 14,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {hhmm(start)}
          </span>
          {end && (
            <span
              style={{
                fontSize: 15,
                color: C.fg3,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              até {hhmm(end)}
            </span>
          )}
        </div>
        <div
          style={{
            ...card,
            flex: 1,
            minWidth: 0,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: '23px', fontWeight: 600 }}>{e.title}</span>
          <span style={{ fontSize: 16, color: C.fg2 }}>{e.customer?.name ?? 'Sem cliente'}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 30,
              padding: '0 12px',
              borderRadius: 9999,
              background: C.purple50,
              color: C.purple800,
              fontSize: 15,
              fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            {typeLabel(e.type)}
          </span>
          <MoreButton
            icon={MoreHorizontal}
            onClick={() =>
              sheet({
                title: e.title,
                sub: end ? `${hhmm(start)} até ${hhmm(end)}` : hhmm(start),
                actions: [
                  {
                    label: 'Remarcar',
                    sub: 'Escolher outro dia ou hora',
                    icon: Calendar,
                    run: () =>
                      go('agNew', {
                        edit: e.id,
                        type: e.type ?? 'OUTRO',
                        client: e.customer?.id,
                        clientName: e.customer?.name,
                        start: e.starts_at,
                        end: e.ends_at ?? undefined,
                        title: e.title,
                      }),
                  },
                  ...(e.customer
                    ? [
                        {
                          label: 'Ligar para o cliente',
                          icon: Phone,
                          run: () => void call(e.customer!.id),
                        },
                        {
                          label: 'Ver cliente',
                          icon: User,
                          run: () => go('client', { id: e.customer!.id }),
                        },
                      ]
                    : []),
                  { label: 'Desmarcar', icon: XCircle, danger: true, run: () => void unmark(e) },
                ],
              })
            }
          />
        </div>
      </div>,
    );
    const next = events[i + 1];
    if (end && next && minutesOf(new Date(next.starts_at)) - minutesOf(end) >= 60) {
      blocks.push(
        <button
          key={`free-${e.id}`}
          type="button"
          onClick={() => go('agNew', { day, time: String(minutesOf(end)) })}
          style={{
            minHeight: 64,
            marginLeft: 88,
            borderRadius: 20,
            border: `2px dashed ${C.borderStrong}`,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '0 16px',
            cursor: 'pointer',
            color: C.fg2,
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            Livre das {hhmm(end)} às {hhmm(new Date(next.starts_at))}
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.purple700, whiteSpace: 'nowrap' }}>
            + Marcar
          </span>
        </button>,
      );
    }
  });

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Agenda</H1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Btn icon={Plus} onClick={() => go('agNew', { day })}>
          Marcar
        </Btn>
        <DayPicker value={day} onChange={setDay} />
        <span style={{ fontSize: 17, fontWeight: 700, color: C.fg2, margin: '4px 4px 0' }}>
          {dayTitle(day)}
        </span>
      </div>
      {appts.loading && !appts.data ? (
        <Loading />
      ) : appts.error ? (
        <ErrorBox title="Não foi possível carregar a agenda." onRetry={appts.reload} />
      ) : events.length === 0 ? (
        <EmptyBox
          icon={Calendar}
          title="Nada marcado para este dia."
          text="Toque em Marcar para guardar um horário."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{blocks}</div>
      )}
    </>
  );
}

export function AgendaNewScreen(): JSX.Element {
  const { params, tab } = useNav();
  const toast = useToast();
  const clients = useLoad(listClients);
  const editing = params.edit;
  const startParam = params.start ? new Date(params.start) : null;
  const [type, setType] = useState<string | null>(params.type ?? null);
  const [clientId, setClientId] = useState<string | null>(params.client ?? null);
  const [clientQ, setClientQ] = useState('');
  const [day, setDay] = useState(params.day ?? (startParam ? ymd(startParam) : ymd(new Date())));
  const [time, setTime] = useState(
    params.time
      ? Number(params.time)
      : startParam
        ? minutesOf(startParam)
        : (params.day ?? ymd(new Date())) === ymd(new Date())
          ? nextSlot()
          : 630,
  );
  const [dur, setDur] = useState(
    params.start && params.end
      ? Math.max(
          30,
          Math.round((new Date(params.end).getTime() - new Date(params.start).getTime()) / 60000),
        )
      : 60,
  );
  const [saving, setSaving] = useState(false);

  const all = clients.data ?? [];
  const qq = clientQ.trim().toLowerCase();
  const picked = all.find((c) => c.id === clientId);
  const options = (
    qq ? all.filter((c) => c.name.toLowerCase().includes(qq)) : all.slice(0, 3)
  ).slice(0, 5);
  if (picked && !options.some((c) => c.id === picked.id)) options.unshift(picked);

  const submit = async () => {
    if (!type) return;
    setSaving(true);
    const start = fromYmd(day);
    start.setMinutes(time);
    const end = new Date(start.getTime() + dur * 60000);
    const name = picked?.name ?? params.clientName;
    const title =
      params.title && editing
        ? params.title
        : name
          ? `${typeLabel(type)} · ${firstName(name)}`
          : typeLabel(type);
    const body = {
      title,
      type,
      customer_id: clientId ?? undefined,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    };
    const r = editing
      ? await updateAppointment(editing, { ...body, customer_id: clientId })
      : await createAppointment(body);
    setSaving(false);
    if (!r.ok) return toast(r.message);
    toast(`Pronto! ${editing ? 'Remarcado' : 'Marcado'} para ${dayWord(day)} às ${mm(time)}.`);
    tab('agenda', { day });
  };

  const pill = (on: boolean): React.CSSProperties => ({
    minHeight: 56,
    borderRadius: 14,
    border: `1.5px solid ${on ? C.purple : C.borderStrong}`,
    background: on ? C.purple : '#FFFFFF',
    color: on ? '#FFFFFF' : C.ink,
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    padding: '0 16px',
    fontFamily: 'inherit',
  });
  const stepBtn: React.CSSProperties = {
    width: 72,
    height: 72,
    border: 'none',
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <>
      <H1>{editing ? 'Remarcar horário' : 'Marcar horário'}</H1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>O que é?</span>
          <Options cols={2} options={TYPES} value={type} onPick={setType} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>Com quem?</span>
          {all.length > 3 && (
            <Search value={clientQ} onChange={setClientQ} placeholder="Buscar cliente" />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={clientId === c.id}
                onClick={() => setClientId(c.id)}
                style={pill(clientId === c.id)}
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={clientId === null}
              onClick={() => setClientId(null)}
              style={pill(clientId === null)}
            >
              Sem cliente
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>Que dia?</span>
          <DayPicker value={day} onChange={setDay} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>Que horas?</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: `1.5px solid ${C.borderStrong}`,
              borderRadius: 18,
              background: '#FFFFFF',
              height: 72,
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              aria-label="30 minutos antes"
              onClick={() => setTime((t) => Math.max(0, t - 30))}
              style={{ ...stepBtn, color: C.ink }}
            >
              <Minus size={28} aria-hidden="true" />
            </button>
            <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {mm(time)}
            </span>
            <button
              type="button"
              aria-label="30 minutos depois"
              onClick={() => setTime((t) => Math.min(23 * 60 + 30, t + 30))}
              style={{ ...stepBtn, color: C.purple }}
            >
              <Plus size={28} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>Quanto tempo?</span>
          <Options
            cols={4}
            options={[30, 60, 120, 240].map((m) => ({
              value: m,
              label: m < 60 ? `${m} min` : `${m / 60} h`,
            }))}
            value={dur}
            onPick={setDur}
          />
        </div>
      </div>
      <ActionBar>
        {!type && <Hint>Escolha o que é</Hint>}
        <Btn icon={Check} disabled={!type || saving} onClick={() => void submit()}>
          {saving ? 'Salvando…' : editing ? 'Remarcar' : 'Marcar'}
        </Btn>
      </ActionBar>
    </>
  );
}
