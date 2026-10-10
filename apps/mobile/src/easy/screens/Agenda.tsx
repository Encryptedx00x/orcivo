import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Alert, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Minus,
  MoreHorizontal,
  Phone,
  Plus,
  User,
  XCircle,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import type {
  AppointmentCreateDto,
  AppointmentPeriod,
  AppointmentRecurrence,
  AppointmentStatus,
} from '@orcivo/shared-types';
import { useSheet } from '../sheet';
import { easy, errorText, type EasyAppointment } from '../data';
import { useEasyNav } from '../draft';
import type { EasyStackParamList, EasyTabsParamList } from '../EasyNavigator';
import {
  Btn,
  C,
  Card,
  EmptyBox,
  ErrorBox,
  Field,
  H1,
  Loading,
  Options,
  Page,
  Search,
  firstName,
  hhmm,
  s,
  useLoad,
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
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Next half hour from now: a booking for today never starts in the past by default. */
const nextSlot = () => {
  const d = new Date();
  return Math.min(23 * 60 + 30, Math.ceil((d.getHours() * 60 + d.getMinutes() + 1) / 30) * 30);
};
/** "hoje", "amanhã" or "qui., 08/10" for the confirmation. */
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
const fromYmd = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const monthDays = (value: string) => {
  const selected = fromYmd(value);
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
};
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const mm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

function dayTitle(v: string) {
  const label = fromYmd(v).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  if (v === ymd(new Date())) return `Hoje · ${label}`;
  if (v === ymd(addDays(new Date(), 1))) return `Amanhã · ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Hoje / Amanhã plus day-by-day arrows: any day is reachable without a date-picker dependency. */
function DayPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = ymd(new Date());
  const tomorrow = ymd(addDays(new Date(), 1));
  const shift = (n: number) => onChange(ymd(addDays(fromYmd(value), n)));
  return (
    <View style={{ gap: 8 }}>
      <Options
        cols={2}
        value={value === today || value === tomorrow ? value : null}
        onPick={onChange}
        options={[
          { value: today, label: 'Hoje' },
          { value: tomorrow, label: 'Amanhã' },
        ]}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Arrow label="Dia anterior" onPress={() => shift(-1)} left />
        <Text style={[s.body, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>
          {fromYmd(value).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </Text>
        <Arrow label="Próximo dia" onPress={() => shift(1)} />
      </View>
    </View>
  );
}
function Arrow({ label, onPress, left }: { label: string; onPress: () => void; left?: boolean }) {
  const Icon = left ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: C.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <Icon size={26} color={C.ink} />
    </Pressable>
  );
}

export function AgendaScreen() {
  const nav = useEasyNav();
  const route = useRoute<RouteProp<EasyTabsParamList, 'Agenda'>>();
  const [day, setDay] = useState(route.params?.day ?? ymd(new Date()));
  // Coming back from "Marcar": show the day that was just booked.
  useEffect(() => {
    if (route.params?.day) setDay(route.params.day);
  }, [route.params?.day]);
  const load = useCallback(() => {
    const selected = fromYmd(day);
    const from = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const to = new Date(selected.getFullYear(), selected.getMonth() + 1, 1);
    return easy.appointments(from.toISOString(), to.toISOString());
  }, [day]);
  const appts = useLoad(load, 'Não foi possível carregar a agenda.');
  const events = (appts.data ?? [])
    .filter((appointment) => ymd(new Date(appointment.starts_at)) === day)
    .slice()
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const selectedMonth = fromYmd(day);
  const days = monthDays(day);
  const appointmentDays = new Set((appts.data ?? []).map((item) => ymd(new Date(item.starts_at))));
  const shiftMonth = (amount: number) =>
    setDay(ymd(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + amount, 1)));

  const sheet = useSheet();
  const call = async (clientId: string) => {
    try {
      const c = await easy.client(clientId);
      const digits = (c.phone ?? '').replace(/\D/g, '');
      if (!digits) return Alert.alert('Atenção', 'Este cliente não tem telefone.');
      await Linking.openURL(`tel:${digits}`);
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível ligar.'));
    }
  };
  const unmark = (a: EasyAppointment) =>
    Alert.alert('Desmarcar', `Desmarcar ${a.title}?`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Desmarcar',
        style: 'destructive',
        onPress: async () => {
          try {
            await easy.deleteAppointment(a.id);
            void appts.refresh();
            Alert.alert('Desmarcado', `${a.title} desmarcado.`, [
              { text: 'OK' },
              {
                text: 'Desfazer',
                onPress: async () => {
                  await easy
                    .createAppointment({
                      title: a.title,
                      type: a.type ?? 'OUTRO',
                      customer_id: a.customer?.id,
                      starts_at: a.starts_at,
                      ends_at: a.ends_at ?? a.starts_at,
                    })
                    .catch(() => Alert.alert('Não deu certo', 'Não foi possível desfazer.'));
                  void appts.refresh();
                },
              },
            ]);
          } catch (err) {
            Alert.alert('Não deu certo', errorText(err, 'Não foi possível desmarcar.'));
          }
        },
      },
    ]);

  const blocks: React.ReactNode[] = [];
  events.forEach((e, i) => {
    const end = e.ends_at ? new Date(e.ends_at) : null;
    blocks.push(
      <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ width: 64, paddingTop: 14 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{hhmm(e.starts_at)}</Text>
          {end ? <Text style={s.muted}>até {hhmm(e.ends_at!)}</Text> : null}
        </View>
        <Card style={{ flex: 1, padding: 14, gap: 4 }}>
          <Text style={[s.body, { fontWeight: '600', fontSize: 18 }]}>{e.title}</Text>
          <Text style={[s.muted, { fontSize: 16, color: C.fg2 }]}>
            {e.customer?.name ?? 'Sem cliente'}
          </Text>
          <Text style={s.muted}>{typeLabel(e.type)}</Text>
          <Btn
            tone="link"
            icon={MoreHorizontal}
            onPress={() =>
              sheet({
                title: e.title,
                sub: e.ends_at ? `${hhmm(e.starts_at)} até ${hhmm(e.ends_at)}` : hhmm(e.starts_at),
                actions: [
                  {
                    label: 'Remarcar',
                    sub: 'Escolher outro dia ou hora',
                    icon: CalendarIcon,
                    run: () => nav.navigate('AgendaNew', { edit: e }),
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
                          run: () => nav.navigate('ClientDetail', { id: e.customer!.id }),
                        },
                      ]
                    : []),
                  { label: 'Desmarcar', icon: XCircle, danger: true, run: () => unmark(e) },
                ],
              })
            }
          >
            Mais
          </Btn>
        </Card>
      </View>,
    );
    const next = events[i + 1];
    if (end && next && minutesOf(new Date(next.starts_at)) - minutesOf(end) >= 60) {
      blocks.push(
        <Card
          key={`free-${e.id}`}
          onPress={() => nav.navigate('AgendaNew', { day, time: String(minutesOf(end)) })}
          label="Marcar no horário livre"
          style={{
            padding: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderStyle: 'dashed',
            backgroundColor: 'transparent',
          }}
        >
          <Text style={[s.muted, { fontSize: 16 }]}>
            Livre das {hhmm(e.ends_at!)} às {hhmm(next.starts_at)}
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.purple700 }}>+ Marcar</Text>
        </Card>,
      );
    }
  });

  return (
    <Page top>
      <H1>Agenda</H1>
      <Btn icon={Plus} onPress={() => nav.navigate('AgendaNew', { day })}>
        Marcar
      </Btn>
      <Card style={{ padding: 14, gap: 10 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Arrow label="Mês anterior" onPress={() => shiftMonth(-1)} left />
          <Text style={[s.body, { fontWeight: '700', textTransform: 'capitalize' }]}>
            {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Text>
          <Arrow label="Próximo mês" onPress={() => shiftMonth(1)} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((label) => (
            <Text
              key={label}
              style={{ width: '14.285%', textAlign: 'center', fontSize: 11, color: C.fg3 }}
            >
              {label}
            </Text>
          ))}
          {days.map((date) => {
            const value = ymd(date);
            const selected = value === day;
            const muted = date.getMonth() !== selectedMonth.getMonth();
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Selecionar ${date.toLocaleDateString('pt-BR')}`}
                accessibilityState={{ selected }}
                onPress={() => setDay(value)}
                style={{
                  width: '14.285%',
                  minHeight: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: selected ? C.purple : 'transparent',
                }}
              >
                <Text style={{ color: selected ? '#FFFFFF' : muted ? C.fg3 : C.ink }}>
                  {date.getDate()}
                </Text>
                {appointmentDays.has(value) ? (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      marginTop: 3,
                      backgroundColor: selected ? '#FFFFFF' : C.purple,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Card>
      <DayPicker value={day} onChange={setDay} />
      <Text style={s.section}>{dayTitle(day)}</Text>
      {appts.error ? <ErrorBox message={appts.error} onRetry={appts.refresh} /> : null}
      {!appts.data && !appts.error ? <Loading /> : null}
      {appts.data && !events.length ? <EmptyBox>Nada marcado para este dia.</EmptyBox> : null}
      {blocks}
    </Page>
  );
}

export function AgendaNewScreen({
  navigation,
  route,
}: NativeStackScreenProps<EasyStackParamList, 'AgendaNew'>) {
  const p = route.params ?? {};
  const editing = p.edit;
  const start0 = editing ? new Date(editing.starts_at) : null;
  const clients = useLoad(easy.clients, 'Não foi possível carregar seus clientes.');
  const [type, setType] = useState<string | null>(editing?.type ?? p.type ?? null);
  const [client, setClient] = useState<{ id: string; name: string } | null>(
    editing?.customer ?? p.client ?? null,
  );
  const [clientQ, setClientQ] = useState('');
  const [day, setDay] = useState(p.day ?? (start0 ? ymd(start0) : ymd(new Date())));
  const [time, setTime] = useState(
    p.time
      ? Number(p.time)
      : start0
        ? minutesOf(start0)
        : (p.day ?? ymd(new Date())) === ymd(new Date())
          ? nextSlot()
          : 630,
  );
  const [dur, setDur] = useState(
    editing?.ends_at && start0
      ? Math.max(30, Math.round((new Date(editing.ends_at).getTime() - start0.getTime()) / 60000))
      : 60,
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<AppointmentStatus>(editing?.status ?? 'SCHEDULED');
  const [period, setPeriod] = useState<AppointmentPeriod | ''>(editing?.schedule_period ?? '');
  const [reminder, setReminder] = useState<5 | 15 | 30 | 60 | 1440 | ''>(
    (editing?.reminder_minutes as 5 | 15 | 30 | 60 | 1440 | null) ?? '',
  );
  const [recurrence, setRecurrence] = useState<AppointmentRecurrence | ''>('');
  const [interval, setInterval] = useState('6');
  const [amount, setAmount] = useState('');

  const options = useMemo(() => {
    const all = clients.data ?? [];
    const qq = clientQ.trim().toLowerCase();
    const list = (
      qq ? all.filter((c) => c.name.toLowerCase().includes(qq)) : all.slice(0, 3)
    ).slice(0, 5);
    if (client && !list.some((c) => c.id === client.id)) return [client, ...list];
    return list;
  }, [clients.data, clientQ, client]);

  const submit = async () => {
    if (!type || saving) return;
    if (!editing && recurrence && !client)
      return Alert.alert('Escolha um cliente', 'A manutenção recorrente precisa de um cliente.');
    if (!editing && recurrence && !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.')))
      return Alert.alert('Valor inválido', 'Informe o valor da cobrança recorrente.');
    setSaving(true);
    const start = fromYmd(day);
    start.setMinutes(time);
    const end = new Date(start.getTime() + dur * 60000);
    const title =
      editing?.title ??
      (client ? `${typeLabel(type)} · ${firstName(client.name)}` : typeLabel(type));
    const body: AppointmentCreateDto = {
      title,
      type: type as AppointmentCreateDto['type'],
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status,
      schedule_period: period || undefined,
      reminder_minutes: reminder || undefined,
      recurrence_type: editing ? undefined : recurrence || undefined,
      recurrence_interval:
        !editing && recurrence === 'CUSTOM_MONTHS' ? Number(interval) : undefined,
      recurrence_amount: !editing && recurrence ? amount.replace(',', '.') : undefined,
    };
    try {
      if (editing)
        await easy.updateAppointment(editing.id, { ...body, customer_id: client?.id ?? null });
      else await easy.createAppointment({ ...body, customer_id: client?.id });
      Alert.alert(
        'Pronto!',
        `${editing ? 'Remarcado' : 'Marcado'} para ${dayWord(day)} às ${mm(time)}.`,
      );
      navigation.navigate('EasyTabs', { screen: 'Agenda', params: { day } });
    } catch (err) {
      Alert.alert(
        'Não deu certo',
        errorText(
          err,
          editing ? 'Não foi possível remarcar.' : 'Não foi possível marcar o horário.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page
      bar={
        <Btn disabled={!type} busy={saving} onPress={() => void submit()}>
          {editing ? 'Remarcar' : 'Marcar'} para {mm(time)}
        </Btn>
      }
    >
      <H1>{editing ? 'Remarcar horário' : 'Marcar horário'}</H1>
      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>O que é?</Text>
      <Options cols={2} options={TYPES} value={type} onPick={setType} />

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Com quem? (opcional)</Text>
      <Search value={clientQ} onChange={setClientQ} placeholder="Buscar cliente" />
      {options.map((c) => {
        const on = client?.id === c.id;
        return (
          <Card
            key={c.id}
            onPress={() => setClient(on ? null : c)}
            label={c.name}
            style={[
              { padding: 14 },
              on && { borderColor: C.purple, borderWidth: 2, backgroundColor: C.purple50 },
            ]}
          >
            <Text style={[s.body, { fontWeight: on ? '700' : '500' }]}>{c.name}</Text>
          </Card>
        );
      })}

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Que dia?</Text>
      <DayPicker value={day} onChange={setDay} />

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Que horas?</Text>
      <Stepper
        value={mm(time)}
        onMinus={() => setTime((t) => Math.max(0, t - 30))}
        onPlus={() => setTime((t) => Math.min(23 * 60 + 30, t + 30))}
      />

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Quanto tempo?</Text>
      <Options
        value={dur}
        onPick={setDur}
        options={[
          { value: 30, label: '30 min' },
          { value: 60, label: '1 hora' },
          { value: 120, label: '2 horas' },
          { value: 180, label: '3 horas' },
          { value: 240, label: '4 horas' },
          { value: 480, label: 'O dia' },
        ]}
      />

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Status</Text>
      <Options
        cols={3}
        value={status}
        onPick={setStatus}
        options={[
          { value: 'UNCONFIRMED' as const, label: 'Não confirmado' },
          { value: 'SCHEDULED' as const, label: 'Agendado' },
          { value: 'COMPLETED' as const, label: 'Concluído' },
        ]}
      />

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Período</Text>
      <Options
        cols={2}
        value={period}
        onPick={setPeriod}
        options={[
          { value: '' as const, label: 'Horário exato' },
          { value: 'MORNING' as const, label: 'Manhã' },
          { value: 'AFTERNOON' as const, label: 'Tarde' },
          { value: 'EVENING' as const, label: 'Noite' },
          { value: 'BUSINESS_HOURS' as const, label: 'Comercial' },
        ]}
      />

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Lembrete</Text>
      <Options
        cols={3}
        value={reminder}
        onPick={setReminder}
        options={[
          { value: '' as const, label: 'Sem lembrete' },
          { value: 5 as const, label: '5 min' },
          { value: 15 as const, label: '15 min' },
          { value: 30 as const, label: '30 min' },
          { value: 60 as const, label: '1 hora' },
          { value: 1440 as const, label: '1 dia' },
        ]}
      />

      {!editing ? (
        <>
          <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>
            Repetir (Orcivo Mais/Equipe)
          </Text>
          <Options
            cols={2}
            value={recurrence}
            onPick={setRecurrence}
            options={[
              { value: '' as const, label: 'Não repetir' },
              { value: 'WEEKLY' as const, label: 'Semanal' },
              { value: 'MONTHLY' as const, label: 'Mensal' },
              { value: 'CUSTOM_MONTHS' as const, label: 'A cada N meses' },
            ]}
          />
          {recurrence === 'CUSTOM_MONTHS' ? (
            <Field
              label="Intervalo em meses"
              value={interval}
              onChange={setInterval}
              keyboard="number-pad"
            />
          ) : null}
          {recurrence ? (
            <Field
              label="Valor da cobrança"
              value={amount}
              onChange={setAmount}
              keyboard="number-pad"
              placeholder="180,00"
            />
          ) : null}
        </>
      ) : null}
    </Page>
  );
}

function Stepper({
  value,
  onMinus,
  onPlus,
}: {
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const btn = {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#FFFFFF',
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Meia hora antes"
        onPress={onMinus}
        style={btn}
      >
        <Minus size={26} color={C.ink} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: 'center', fontSize: 34, fontWeight: '800', color: C.ink }}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Meia hora depois"
        onPress={onPlus}
        style={btn}
      >
        <Plus size={26} color={C.ink} />
      </Pressable>
    </View>
  );
}
