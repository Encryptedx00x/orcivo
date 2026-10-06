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
  Image as ImageIcon,
  Play,
  Undo2,
  X,
} from 'lucide-react-native';
import { easy, errorText, type EasyWorkOrder } from '../data';
import { useEasyNav } from '../draft';
import type { EasyStackParamList } from '../EasyNavigator';
import {
  Btn,
  C,
  Card,
  Chip,
  EmptyBox,
  ErrorBox,
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
  type ChipKind,
} from '../ui';

const STATUS: Record<EasyWorkOrder['status'], { kind: ChipKind; label: string }> = {
  PENDING: { kind: 'wait', label: 'Para fazer' },
  IN_PROGRESS: { kind: 'doing', label: 'Fazendo' },
  DONE: { kind: 'ok', label: 'Feito' },
  CANCELLED: { kind: 'draft', label: 'Cancelado' },
};
const STAGE_LABEL = { BEFORE: 'Antes', DURING: 'Durante', AFTER: 'Depois' } as const;

export function ServicesScreen() {
  const nav = useEasyNav();
  const orders = useLoad(easy.workOrders, 'Não foi possível carregar os serviços de hoje.');
  const today = new Date().toDateString();
  // Today's scheduled services plus anything already in progress (it must not disappear).
  const list = (orders.data ?? [])
    .filter((o) => o.status !== 'CANCELLED')
    .filter(
      (o) =>
        o.status === 'IN_PROGRESS' ||
        (o.scheduled_at && new Date(o.scheduled_at).toDateString() === today),
    )
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));

  const open = async (o: EasyWorkOrder) => {
    if (o.status === 'DONE') return nav.navigate('WorkOrderDetail', { id: o.id });
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
        <H1>Serviços de hoje</H1>
        <Sub>{longDate(new Date())}</Sub>
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
        const st = STATUS[o.status];
        const Icon =
          o.status === 'PENDING' ? Play : o.status === 'IN_PROGRESS' ? ChevronRight : FileText;
        return (
          <Card key={o.id} style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', width: 64, color: C.ink }}>
                {o.scheduled_at ? hhmm(o.scheduled_at) : '—'}
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
          </Card>
        );
      })}
      <Btn tone="link" onPress={() => nav.navigate('EasyTabs', { screen: 'Agenda' })}>
        Ver outros dias na Agenda
      </Btn>
      <Btn tone="outline" icon={FileText} height={56} onPress={() => nav.navigate('WorkOrderList')}>
        Todas as ordens de serviço
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
  return (
    <Page
      bar={
        open ? (
          <Btn icon={CheckCircle} busy={finishing} onPress={() => void finish()}>
            Finalizar serviço
          </Btn>
        ) : undefined
      }
    >
      <View style={{ gap: 6 }}>
        <Chip kind={STATUS[o.status].kind} label={STATUS[o.status].label} />
        <H1 size={28}>{o.title}</H1>
        <Sub>{o.customer?.name}</Sub>
      </View>
      <Card style={{ padding: 16, gap: 8 }}>
        <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>O que fazer</Text>
        <Text style={[s.body, { color: o.notes ? C.ink : C.fg3 }]}>
          {o.notes?.trim() || 'Sem observações neste serviço.'}
        </Text>
      </Card>
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
          {open ? (
            <Row icon={X} label="Cancelar serviço" danger onPress={() => setAction('cancel')} />
          ) : null}
          {o.status === 'DONE' || o.status === 'CANCELLED' ? (
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
