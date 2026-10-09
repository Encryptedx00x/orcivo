import React, { useCallback, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Calendar as CalendarIcon,
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileText,
  HandCoins,
  Hourglass,
  Image as ImageIcon,
  MoreHorizontal,
  Play,
  ShieldAlert,
  Undo2,
  X,
} from 'lucide-react-native';
import { easy, errorText, type EasyWorkOrder } from '../data';
import {
  cleanWorkOrderDetails,
  WORK_ORDER_FIELDS,
  type WorkOrderDetails,
  type WorkOrderField,
} from '@orcivo/shared-types';
import { useEasyNav } from '../draft';
import { reasonSheet, useSheet, type SheetAction } from '../sheet';
import type { EasyStackParamList } from '../EasyNavigator';
import {
  EASY_STATUS,
  EXTRA_ACTION_UI,
  isExtraAction,
  woIsClosed,
  type WorkOrderExtraAction,
} from '../../screens/os/os-status';
import {
  Btn,
  C,
  Card,
  Chip,
  EmptyBox,
  ErrorBox,
  Field,
  H1,
  Loading,
  More,
  Page,
  ReasonModal,
  Row,
  Sub,
  hhmm,
  longDate,
  s,
  useLoad,
} from '../ui';

/** Ícones das ações de status extra (R5b) — mesmo conjunto do web. */
const EXTRA_ICONS: Record<WorkOrderExtraAction, typeof Hourglass> = {
  aguardar_pagamento: Hourglass,
  receber_pagamento: HandCoins,
  acionar_garantia: ShieldAlert,
};

const STAGE_LABEL = { BEFORE: 'Antes', DURING: 'Durante', AFTER: 'Depois' } as const;

const PAGE = 10;

function EasyDetailsCard({
  id,
  fields,
  initial,
  editable,
}: {
  id: string;
  fields: WorkOrderField[];
  initial: WorkOrderDetails;
  editable: boolean;
}) {
  const [saved, setSaved] = useState<WorkOrderDetails>(initial);
  const [value, setValue] = useState<WorkOrderDetails>(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const shown = (Object.keys(WORK_ORDER_FIELDS) as WorkOrderField[]).filter(
    (key) => fields.includes(key) || saved[key],
  );
  if (!shown.length) return null;

  const save = async () => {
    setBusy(true);
    try {
      const clean = cleanWorkOrderDetails(value);
      await easy.updateWorkOrderDetails(id, clean);
      setSaved(clean);
      setEditing(false);
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível salvar os dados do serviço.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[s.body, { flex: 1, fontWeight: '700', fontSize: 19 }]}>
          Dados do equipamento
        </Text>
        {editable && !editing ? (
          <Btn tone="link" height={44} onPress={() => setEditing(true)}>
            Editar
          </Btn>
        ) : null}
      </View>
      {editing ? (
        <>
          {shown.map((key) => (
            <Field
              key={key}
              label={WORK_ORDER_FIELDS[key].label}
              placeholder={WORK_ORDER_FIELDS[key].placeholder}
              value={value[key] ?? ''}
              maxLength={300}
              onChange={(next) => setValue((current) => ({ ...current, [key]: next }))}
            />
          ))}
          <Btn busy={busy} onPress={() => void save()}>
            Salvar
          </Btn>
          <Btn
            tone="outline"
            disabled={busy}
            onPress={() => {
              setValue(saved);
              setEditing(false);
            }}
          >
            Cancelar
          </Btn>
        </>
      ) : (
        shown.map((key) => (
          <View key={key} style={{ gap: 2 }}>
            <Text style={s.muted}>{WORK_ORDER_FIELDS[key].label}</Text>
            <Text style={s.body}>{saved[key]?.trim() || '—'}</Text>
          </View>
        ))
      )}
    </Card>
  );
}

/** "Mais ações" of a service card (same as the web): remarcar, abrir completo, extras (R5b), cancelar/reabrir. */
function useServiceMore(onChanged: () => void) {
  const nav = useEasyNav();
  const sheet = useSheet();
  const act = (o: EasyWorkOrder, action: 'cancel' | 'reopen') =>
    reasonSheet(
      sheet,
      action === 'cancel' ? 'Por que cancelar?' : 'Por que reabrir?',
      action === 'cancel'
        ? ['Cliente desistiu', 'Cliente remarcou', 'Feito por engano', 'Outro motivo']
        : ['Faltou terminar', 'Cliente pediu ajuste', 'Finalizado por engano', 'Outro motivo'],
      async (reason) => {
        try {
          await easy.workOrderAction(o.id, action, reason);
          onChanged();
        } catch (err) {
          Alert.alert('Não deu certo', errorText(err, 'Não foi possível concluir agora.'));
        }
      },
      action === 'cancel' ? X : Undo2,
    );
  // Status extras (R5b): transições diretas, sem motivo — só aparecem quando
  // a empresa ligou o extra e o backend liberou a ação (allowed_actions).
  const extra = async (o: EasyWorkOrder, action: WorkOrderExtraAction) => {
    try {
      await easy.workOrderAction(o.id, action);
      Alert.alert('Pronto', EXTRA_ACTION_UI[action].doneEasy);
      onChanged();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível concluir agora.'));
    }
  };
  return (o: EasyWorkOrder) => {
    const open = o.status === 'PENDING' || o.status === 'IN_PROGRESS';
    const allowed = o.allowed_actions;
    const canReopen = allowed ? allowed.includes('reabrir') : !open;
    const actions: SheetAction[] = [
      {
        label: 'Remarcar',
        sub: 'Escolher outro dia ou hora',
        icon: CalendarIcon,
        run: () =>
          nav.navigate('AgendaNew', {
            client: { id: o.customer.id, name: o.customer.name },
            type: 'INSTALACAO',
          }),
      },
      {
        label: 'Abrir serviço completo',
        sub: 'Itens, fotos, histórico e correções',
        icon: FileText,
        run: () => nav.navigate('WorkOrderDetail', { id: o.id }),
      },
    ];
    for (const a of allowed ?? []) {
      if (!isExtraAction(a)) continue;
      actions.push({
        label: EXTRA_ACTION_UI[a].label,
        sub: EXTRA_ACTION_UI[a].sub,
        icon: EXTRA_ICONS[a],
        run: () => void extra(o, a),
      });
    }
    if (open) {
      actions.push({
        label: 'Cancelar serviço',
        icon: X,
        danger: true,
        run: () => act(o, 'cancel'),
      });
    } else if (canReopen) {
      actions.push({
        label: 'Reabrir serviço',
        sub: 'Para serviço já finalizado ou cancelado',
        icon: Undo2,
        run: () => act(o, 'reopen'),
      });
    }
    sheet({ title: o.title, sub: o.customer?.name ?? `Serviço #${o.number}`, actions });
  };
}

export function ServicesScreen() {
  const nav = useEasyNav();
  const orders = useLoad(easy.workOrders, 'Não foi possível carregar os serviços de hoje.');
  const more = useServiceMore(() => void orders.refresh());
  const today = new Date().toDateString();
  // "Todos": every service without leaving Modo fácil (open first, then the finished ones).
  const [all, setAll] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const rank = (st: string) => (st === 'IN_PROGRESS' ? 0 : st === 'PENDING' ? 1 : 2);
  const everything = (orders.data ?? [])
    .filter((o) => o.status !== 'CANCELLED')
    .sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        (b.scheduled_at ?? b.created_at ?? '').localeCompare(a.scheduled_at ?? a.created_at ?? ''),
    );
  // Today's scheduled services plus anything already in progress (it must not disappear).
  const list = all
    ? everything.slice(0, limit)
    : everything
        .filter(
          (o) =>
            o.status === 'IN_PROGRESS' ||
            (o.scheduled_at && new Date(o.scheduled_at).toDateString() === today),
        )
        .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));

  const open = async (o: EasyWorkOrder) => {
    if (o.status === 'PENDING') {
      try {
        await easy.startWorkOrder(o.id);
      } catch (err) {
        return Alert.alert('Não deu certo', errorText(err, 'Não foi possível começar o serviço.'));
      }
    }
    nav.navigate('Run', { id: o.id });
  };

  return (
    <Page>
      <View style={{ gap: 2 }}>
        <H1>{all ? 'Todos os serviços' : 'Serviços de hoje'}</H1>
        <Sub>{all ? 'Em andamento primeiro, depois os feitos' : longDate(new Date())}</Sub>
      </View>
      {orders.error ? <ErrorBox message={orders.error} onRetry={orders.refresh} /> : null}
      {!orders.data && !orders.error ? <Loading /> : null}
      {orders.data && !list.length ? (
        <>
          <EmptyBox>
            Nenhum serviço para hoje. Os serviços marcados para hoje aparecem aqui.
          </EmptyBox>
          <Btn
            tone="soft"
            icon={ClipboardList}
            onPress={() => nav.navigate('AgendaNew', { type: 'INSTALACAO' })}
          >
            Marcar na agenda
          </Btn>
        </>
      ) : null}
      {list.map((o) => {
        const st = EASY_STATUS[o.status];
        const Icon =
          o.status === 'PENDING' ? Play : o.status === 'IN_PROGRESS' ? ChevronRight : FileText;
        return (
          <Card key={o.id} style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', width: 64, color: C.ink }}>
                {!o.scheduled_at
                  ? '—'
                  : all && new Date(o.scheduled_at).toDateString() !== today
                    ? new Date(o.scheduled_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })
                    : hhmm(o.scheduled_at)}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.body, { fontWeight: '600', fontSize: 19 }]}>{o.title}</Text>
                <Text style={[s.muted, { fontSize: 16, color: C.fg2 }]}>{o.customer?.name}</Text>
              </View>
            </View>
            <Chip kind={st.kind} label={st.label} />
            <Btn
              tone={o.status === 'DONE' ? 'outline' : 'primary'}
              icon={Icon}
              height={56}
              onPress={() => void open(o)}
            >
              {o.status === 'PENDING'
                ? 'Começar'
                : o.status === 'IN_PROGRESS'
                  ? 'Continuar'
                  : 'Ver'}
            </Btn>
            <Btn tone="link" icon={MoreHorizontal} onPress={() => more(o)}>
              Mais ações
            </Btn>
          </Card>
        );
      })}
      {all && everything.length > limit ? (
        <Btn tone="link" onPress={() => setLimit((l) => l + PAGE)}>
          Ver mais {Math.min(PAGE, everything.length - limit)} de {everything.length - limit}
        </Btn>
      ) : null}
      <Btn tone="link" onPress={() => nav.navigate('EasyTabs', { screen: 'Agenda' })}>
        Ver outros dias na Agenda
      </Btn>
      <Btn
        tone="link"
        onPress={() => {
          setAll((a) => !a);
          setLimit(PAGE);
        }}
      >
        {all ? 'Só os serviços de hoje' : 'Ver todos os serviços'}
      </Btn>
    </Page>
  );
}

export function RunScreen({
  navigation,
  route,
}: NativeStackScreenProps<EasyStackParamList, 'Run'>) {
  const { id } = route.params;
  const load = useCallback(() => easy.workOrder(id), [id]);
  const order = useLoad(load, 'Não foi possível carregar este serviço.');
  const company = useLoad(easy.company, 'Não foi possível carregar os campos do serviço.');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [action, setAction] = useState<'cancel' | 'reopen' | null>(null);

  if (order.error)
    return (
      <Page>
        <ErrorBox message={order.error} onRetry={order.refresh} />
      </Page>
    );
  if (!order.data)
    return (
      <Page>
        <Loading />
      </Page>
    );
  const o = order.data;
  const photos = o.photos ?? [];
  const stage: 'BEFORE' | 'DURING' = photos.length === 0 ? 'BEFORE' : 'DURING';

  const addPhoto = async (camera: boolean) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted')
      return Alert.alert('Permissão negada', 'Libere o acesso nas configurações do celular.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const r = camera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets[0]) return;
    setUploading(true);
    try {
      await easy.uploadPhoto(o.id, r.assets[0].uri, stage);
      Alert.alert('Pronto', `Foto guardada como "${STAGE_LABEL[stage]}".`);
      void order.refresh();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível guardar a foto.'));
    } finally {
      setUploading(false);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await easy.completeWorkOrder(o.id);
      setDone(true);
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível finalizar o serviço.'));
    } finally {
      setFinishing(false);
    }
  };

  // R5b: extra "Aguardando pagamento" ligado — recebe e conclui o serviço.
  const extra = async (action: WorkOrderExtraAction) => {
    try {
      await easy.workOrderAction(o.id, action);
      Alert.alert('Pronto', EXTRA_ACTION_UI[action].doneEasy);
      void order.refresh();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível concluir agora.'));
    }
  };

  if (done)
    return (
      <Page
        bar={
          <Btn onPress={() => navigation.reset({ index: 0, routes: [{ name: 'EasyTabs' }] })}>
            Voltar ao início
          </Btn>
        }
      >
        <View style={{ alignItems: 'center', gap: 12, paddingTop: 32 }}>
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: 52,
              backgroundColor: '#DCFCE7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={56} strokeWidth={2.5} color={C.green} />
          </View>
          <H1>Pronto! Serviço finalizado</H1>
          <Text style={[s.body, { textAlign: 'center', color: C.fg2 }]}>
            {o.title} em {o.customer?.name} ficou como Feito.
          </Text>
        </View>
        <Card style={{ padding: 16 }}>
          <Text style={[s.body, { fontWeight: '600' }]}>Serviço #{o.number}</Text>
        </Card>
      </Page>
    );

  const open = o.status === 'PENDING' || o.status === 'IN_PROGRESS';
  const canReceive =
    o.status === 'AWAITING_PAYMENT' && o.allowed_actions?.includes('receber_pagamento');
  return (
    <Page
      bar={
        open ? (
          <Btn icon={CheckCircle} busy={finishing} onPress={() => void finish()}>
            Finalizar serviço
          </Btn>
        ) : canReceive ? (
          <Btn icon={HandCoins} onPress={() => void extra('receber_pagamento')}>
            Receber pagamento
          </Btn>
        ) : undefined
      }
    >
      <View style={{ gap: 6 }}>
        <Chip kind={EASY_STATUS[o.status].kind} label={EASY_STATUS[o.status].label} />
        <H1 size={28}>{o.title}</H1>
        <Sub>{o.customer?.name}</Sub>
      </View>
      <Card style={{ padding: 16, gap: 8 }}>
        <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>O que fazer</Text>
        <Text style={[s.body, { color: o.notes ? C.ink : C.fg3 }]}>
          {o.notes?.trim() || 'Sem observações neste serviço.'}
        </Text>
      </Card>
      <EasyDetailsCard
        id={o.id}
        fields={company.data?.work_order_fields ?? []}
        initial={o.details ?? {}}
        editable={open}
      />
      <Card style={{ padding: 16, gap: 12 }}>
        <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Fotos</Text>
        {photos.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((p) => (
              <View key={p.id} style={{ width: '31%', gap: 2 }}>
                <Image
                  source={{ uri: p.file_url }}
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 12,
                    backgroundColor: C.line,
                  }}
                  accessibilityLabel={`Foto ${STAGE_LABEL[p.photo_stage]}`}
                />
                <Text style={[s.muted, { fontSize: 13 }]}>{STAGE_LABEL[p.photo_stage]}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.muted}>Tire uma foto antes de começar.</Text>
        )}
        {open ? (
          <>
            <Btn tone="soft" icon={Camera} busy={uploading} onPress={() => void addPhoto(true)}>
              Tirar foto
            </Btn>
            <Btn
              tone="outline"
              icon={ImageIcon}
              height={56}
              disabled={uploading}
              onPress={() => void addPhoto(false)}
            >
              Escolher da galeria
            </Btn>
          </>
        ) : null}
      </Card>
      <More>
        <Card style={{ overflow: 'hidden' }}>
          <Row
            icon={CalendarIcon}
            label="Remarcar"
            sub="Escolher outro dia ou hora"
            onPress={() =>
              navigation.navigate('AgendaNew', {
                client: { id: o.customer.id, name: o.customer.name },
                type: 'INSTALACAO',
              })
            }
          />
          <Row
            icon={FileText}
            label="Abrir ordem de serviço completa"
            onPress={() => navigation.navigate('WorkOrderDetail', { id: o.id })}
          />
          {(o.allowed_actions ?? []).filter(isExtraAction).map((a) => (
            <Row
              key={a}
              icon={EXTRA_ICONS[a]}
              label={EXTRA_ACTION_UI[a].label}
              sub={EXTRA_ACTION_UI[a].sub}
              onPress={() => void extra(a)}
            />
          ))}
          {open ? (
            <Row icon={X} label="Cancelar serviço" danger onPress={() => setAction('cancel')} />
          ) : null}
          {woIsClosed(o.status) ? (
            <Row icon={Undo2} label="Reabrir serviço" onPress={() => setAction('reopen')} />
          ) : null}
        </Card>
      </More>
      <ReasonModal
        title={
          action === 'cancel' ? 'Cancelar serviço' : action === 'reopen' ? 'Reabrir serviço' : null
        }
        confirm={action === 'cancel' ? 'Cancelar serviço' : 'Reabrir serviço'}
        danger={action === 'cancel'}
        onClose={() => setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          try {
            await easy.workOrderAction(o.id, action, reason);
            setAction(null);
            void order.refresh();
          } catch (err) {
            Alert.alert('Não deu certo', errorText(err, 'Não foi possível concluir agora.'));
          }
        }}
      />
    </Page>
  );
}
