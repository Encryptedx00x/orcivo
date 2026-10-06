import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ClipboardList,
  FileText,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import { formatMoney, maskPhone } from '@orcivo/shared-types';
import { easy, errorText, type EasyClient } from '../data';
import { emptyDraft, useDraft, useEasyNav } from '../draft';
import type { EasyStackParamList } from '../EasyNavigator';
import {
  Avatar,
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
  Row,
  Search,
  Sub,
  firstName,
  s,
  useLoad,
} from '../ui';
import { quoteChip } from './Quotes';

const PAGE = 20;
const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const call = (phone: string) => void Linking.openURL(`tel:${phone.replace(/\D/g, '')}`);
const whats = (phone: string) =>
  void Linking.openURL(`https://wa.me/55${phone.replace(/\D/g, '')}`);

export function ClientsScreen() {
  const nav = useEasyNav();
  const clients = useLoad(easy.clients, 'Não foi possível carregar seus clientes.');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const list = useMemo(() => {
    const qq = norm(q.trim());
    const digits = qq.replace(/\D/g, '');
    const all = clients.data ?? [];
    if (!qq) return all;
    return all.filter(
      (c) =>
        norm(c.name).includes(qq) ||
        (!!digits && (c.phone ?? '').replace(/\D/g, '').includes(digits)),
    );
  }, [clients.data, q]);
  const shown = list.slice(0, limit);

  return (
    <Page top>
      <H1>Clientes</H1>
      <Search
        value={q}
        onChange={(v) => {
          setQ(v);
          setLimit(PAGE);
        }}
        placeholder="Buscar por nome ou telefone"
      />
      <Btn tone="dashed" icon={UserPlus} height={64} onPress={() => nav.navigate('ClientNew')}>
        Cliente novo
      </Btn>
      {clients.error ? <ErrorBox message={clients.error} onRetry={clients.refresh} /> : null}
      {!clients.data && !clients.error ? <Loading /> : null}
      {clients.data && !list.length ? (
        <EmptyBox>
          {q.trim() ? 'Nenhum cliente com esse nome ou telefone.' : 'Você ainda não tem clientes.'}
        </EmptyBox>
      ) : null}
      {shown.map((c) => (
        <Card key={c.id} style={{ padding: 14, gap: 12 }}>
          <Card
            onPress={() => nav.navigate('ClientDetail', { id: c.id })}
            label={`Ver ${c.name}`}
            style={{ borderWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            <Avatar name={c.name} />
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '600' }]}>{c.name}</Text>
              <Text style={s.muted}>{maskPhone(c.phone) || 'Sem telefone'}</Text>
            </View>
          </Card>
          {c.phone ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn
                tone="outline"
                icon={Phone}
                height={52}
                style={{ flex: 1, width: undefined }}
                onPress={() => call(c.phone!)}
              >
                Ligar
              </Btn>
              <Btn
                tone="outline"
                icon={MessageCircle}
                height={52}
                style={{ flex: 1, width: undefined }}
                onPress={() => whats(c.phone!)}
              >
                WhatsApp
              </Btn>
            </View>
          ) : null}
        </Card>
      ))}
      {list.length > shown.length ? (
        <Btn tone="link" onPress={() => setLimit((l) => l + PAGE)}>
          Ver mais {Math.min(PAGE, list.length - shown.length)} de {list.length - shown.length}
        </Btn>
      ) : null}
    </Page>
  );
}

export function ClientDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<EasyStackParamList, 'ClientDetail'>) {
  const { id } = route.params;
  const { setDraft } = useDraft();
  const loadClient = useCallback(() => easy.client(id), [id]);
  const client = useLoad(loadClient, 'Não foi possível carregar este cliente.');
  const quotes = useLoad(easy.quotes, 'Não foi possível carregar o histórico.');
  const [histLimit, setHistLimit] = useState(3);

  if (client.error)
    return (
      <Page>
        <ErrorBox message={client.error} onRetry={client.refresh} />
      </Page>
    );
  if (!client.data)
    return (
      <Page>
        <Loading />
      </Page>
    );
  const c = client.data;
  const addr = [
    c.street && `${c.street}${c.number ? `, ${c.number}` : ''}`,
    c.neighborhood,
    c.city && `${c.city}${c.state ? `/${c.state}` : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const hist = (quotes.data ?? []).filter((q) => q.customer?.id === c.id);

  const remove = () =>
    Alert.alert(
      'Excluir cliente',
      `Excluir ${c.name}? O histórico de orçamentos e serviços continua guardado.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await easy.deleteClient(c.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Não deu certo', errorText(err, 'Não foi possível excluir o cliente.'));
            }
          },
        },
      ],
    );

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={c.name} size={64} />
        <View style={{ flex: 1 }}>
          <H1 size={26}>{c.name}</H1>
          <Text style={[s.body, { color: C.fg2 }]}>{maskPhone(c.phone) || 'Sem telefone'}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MapPin size={20} color={C.fg3} />
        <Text style={[s.muted, { flex: 1 }]}>{addr || 'Endereço não informado'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn
          icon={FileText}
          height={88}
          style={{ flex: 1, width: undefined, flexDirection: 'column', gap: 4 }}
          onPress={() => {
            setDraft({ ...emptyDraft(), client: c });
            navigation.navigate('QuoteItems');
          }}
        >
          Orçamento
        </Btn>
        <Btn
          tone="outline"
          icon={ClipboardList}
          height={88}
          style={{ flex: 1, width: undefined, flexDirection: 'column', gap: 4 }}
          onPress={() =>
            navigation.navigate('AgendaNew', {
              client: { id: c.id, name: c.name },
              type: 'INSTALACAO',
            })
          }
        >
          Serviço
        </Btn>
        <Btn
          tone="outline"
          icon={Phone}
          height={88}
          disabled={!c.phone}
          style={{
            flex: 1,
            width: undefined,
            flexDirection: 'column',
            gap: 4,
            opacity: c.phone ? 1 : 0.5,
          }}
          onPress={() => c.phone && call(c.phone)}
        >
          Ligar
        </Btn>
      </View>

      <Card style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={[s.body, { fontWeight: '700', fontSize: 19, paddingVertical: 12 }]}>
          Histórico
        </Text>
        {hist.slice(0, histLimit).map((q) => {
          const chip = quoteChip(q.status);
          return (
            <Card
              key={q.id}
              onPress={() => navigation.navigate('QuoteDetail', { id: q.id })}
              label={`Orçamento ${q.number}`}
              style={{
                borderWidth: 0,
                borderTopWidth: 1,
                borderColor: C.line,
                borderRadius: 0,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              <Text style={[s.body, { fontWeight: '600' }]}>Orçamento #{q.number}</Text>
              <Text style={s.muted}>{formatMoney(q.total)}</Text>
              <Chip kind={chip.kind} label={chip.label} />
            </Card>
          );
        })}
        {hist.length > histLimit ? (
          <Btn tone="link" onPress={() => setHistLimit((l) => l + 5)}>
            Ver mais {Math.min(5, hist.length - histLimit)}
          </Btn>
        ) : null}
        {quotes.data && !hist.length ? (
          <Text
            style={[
              s.body,
              { color: C.fg2, paddingVertical: 12, borderTopWidth: 1, borderColor: C.line },
            ]}
          >
            Nenhum orçamento com {firstName(c.name)} ainda.
          </Text>
        ) : null}
      </Card>

      <More label="Mais opções · WhatsApp, editar, excluir">
        <Card style={{ overflow: 'hidden' }}>
          {c.phone ? (
            <Row icon={MessageCircle} label="Mandar WhatsApp" onPress={() => whats(c.phone!)} />
          ) : null}
          <Row
            icon={Pencil}
            label="Editar nome e telefone"
            onPress={() => navigation.navigate('ClientNew', { edit: c })}
          />
          <Row icon={Trash2} label="Excluir cliente" danger onPress={remove} />
        </Card>
      </More>
    </Page>
  );
}

export function ClientNewScreen({
  navigation,
  route,
}: NativeStackScreenProps<EasyStackParamList, 'ClientNew'>) {
  const edit = route.params?.edit;
  const forQuote = route.params?.forQuote;
  const { setDraft } = useDraft();
  const [name, setName] = useState(edit?.name ?? '');
  const [phone, setPhone] = useState(maskPhone(edit?.phone ?? ''));
  const [busy, setBusy] = useState(false);
  const ok = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 10;

  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const saved: EasyClient = edit
        ? await easy.updateClient(edit.id, name, phone)
        : await easy.createClient(name, phone);
      if (forQuote) {
        setDraft((d) => ({ ...d, client: saved }));
        navigation.replace('QuoteItems');
      } else if (edit) {
        navigation.goBack();
      } else {
        navigation.replace('ClientDetail', { id: saved.id });
      }
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível salvar o cliente.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      bar={
        <Btn disabled={!ok} busy={busy} onPress={() => void save()}>
          {edit ? 'Salvar' : forQuote ? 'Salvar e continuar' : 'Salvar cliente'}
        </Btn>
      }
    >
      <H1 size={32}>{edit ? 'Editar cliente' : 'Cliente novo'}</H1>
      <Field label="Nome" value={name} onChange={setName} placeholder="Nome do cliente" />
      <Field
        label="Telefone (WhatsApp)"
        value={phone}
        onChange={(v) => setPhone(maskPhone(v))}
        placeholder="(00) 00000-0000"
        keyboard="phone-pad"
      />
      {!ok ? <Sub>Preencha nome e telefone</Sub> : null}
      <Text style={s.muted}>Endereço e documento você completa depois, no modo completo.</Text>
    </Page>
  );
}
