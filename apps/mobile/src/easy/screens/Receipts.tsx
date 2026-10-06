// Recibos (app): list, receipt and "Novo recibo". Registered in the easy stack and
// in the full app's Mais stack, so both modes have the same receipts.
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useNavigation, type RouteProp, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  QrCode,
  ReceiptText,
  Share2,
  UserPlus,
} from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import {
  RECEIPT_METHODS,
  easy,
  errorText,
  methodLabel,
  receiptNo,
  receiptRef,
  type EasyCompany,
  type EasyReceipt,
} from '../data';
import { shareReceiptPdf } from '../share';
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
  Options,
  Page,
  Search,
  Sub,
  Toggle,
  s,
  useLoad,
} from '../ui';

type Params = {
  Receipts: undefined;
  Receipt: { id: string };
  ReceiptNew: { link?: boolean; clientId?: string; due?: boolean } | undefined;
  ClientNew: { forQuote?: boolean; forReceipt?: boolean } | undefined;
  QuoteSign: { standalone?: boolean } | undefined;
};
type Nav = NativeStackNavigationProp<Params>;

const PAGE = 10;
const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const shortDate = (r: EasyReceipt) => {
  const d = new Date(r.paid_at ?? r.created_at);
  return d.toDateString() === new Date().toDateString()
    ? 'hoje'
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

async function send(r: EasyReceipt) {
  try {
    await shareReceiptPdf(r.id, receiptNo(r.receipt_number));
  } catch (err) {
    Alert.alert('Não deu certo', errorText(err, 'Não foi possível preparar o recibo.'));
  }
}

export function ReceiptsScreen() {
  const nav = useNavigation<Nav>();
  const receipts = useLoad(easy.receipts, 'Não foi possível carregar seus recibos.');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const list = useMemo(() => {
    const qq = norm(q.trim());
    return (receipts.data ?? []).filter(
      (r) => !qq || norm(r.customer.name).includes(qq) || receiptNo(r.receipt_number).includes(qq),
    );
  }, [receipts.data, q]);

  return (
    <Page>
      <H1>Recibos</H1>
      <Btn icon={Plus} onPress={() => nav.navigate('ReceiptNew')}>
        Novo recibo
      </Btn>
      {receipts.error ? <ErrorBox message={receipts.error} onRetry={receipts.refresh} /> : null}
      {!receipts.data && !receipts.error ? <Loading /> : null}
      {receipts.data && receipts.data.length === 0 ? (
        <EmptyBox>
          Você ainda não tem recibos. O recibo aparece quando você marca um pagamento como recebido.
          Também dá para criar um agora.
        </EmptyBox>
      ) : null}
      {receipts.data && receipts.data.length > 0 ? (
        <>
          <Search
            value={q}
            onChange={(v) => {
              setQ(v);
              setLimit(PAGE);
            }}
            placeholder="Buscar cliente"
          />
          <Text style={[s.muted, { marginHorizontal: 4 }]}>
            Quando você marca um pagamento como recebido, o recibo aparece aqui sozinho.
          </Text>
          {list.length === 0 ? <EmptyBox>Nenhum recibo com esse nome.</EmptyBox> : null}
          {list.slice(0, limit).map((r) => (
            <Card key={r.id} style={{ padding: 16, gap: 12 }}>
              <View>
                <Text style={[s.body, { fontWeight: '600', fontSize: 19 }]}>{r.customer.name}</Text>
                <Text style={s.muted}>
                  Recibo nº {receiptNo(r.receipt_number)} · {shortDate(r)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>
                  {formatMoney(r.amount)}
                </Text>
                <Chip kind="ok" label={`Pago · ${methodLabel(r.method)}`} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn
                  tone="outline"
                  icon={ReceiptText}
                  height={56}
                  style={{ flex: 1, width: undefined }}
                  onPress={() => nav.navigate('Receipt', { id: r.id })}
                >
                  Abrir
                </Btn>
                <Btn
                  tone="soft"
                  icon={Share2}
                  height={56}
                  style={{ flex: 1, width: undefined }}
                  onPress={() => void send(r)}
                >
                  Enviar
                </Btn>
              </View>
            </Card>
          ))}
          {list.length > limit ? (
            <Btn tone="link" onPress={() => setLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, list.length - limit)} de {list.length - limit}
            </Btn>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}

/** On-screen receipt, same layout as the PDF ("Recibo Papel"). */
export function ReceiptPaperView({ r, company }: { r: EasyReceipt; company: EasyCompany | null }) {
  const initials =
    (company?.trade_name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'O';
  return (
    <Card style={{ padding: 20, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {company?.logo_url ? (
          <Image
            source={{ uri: company.logo_url }}
            style={{ height: 44, width: 88 }}
            resizeMode="contain"
            accessibilityLabel="Logo"
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: C.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.body, { fontWeight: '700' }]}>{company?.trade_name ?? ''}</Text>
          {company?.document ? (
            <Text style={s.muted}>
              {company.document_type ?? 'Documento'} {company.document}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[s.muted, { fontWeight: '600' }]}>Recibo nº {receiptNo(r.receipt_number)}</Text>
      <View style={{ height: 1, backgroundColor: C.line }} />
      <View>
        <Text style={[s.muted, { fontWeight: '600' }]}>Valor recebido</Text>
        <Text style={{ fontSize: 32, fontWeight: '800', color: C.ink }}>
          {formatMoney(r.amount)}
        </Text>
      </View>
      <Text style={s.body}>
        Recebi de <Text style={{ fontWeight: '700' }}>{r.customer.name}</Text> o valor acima,
        referente a {receiptRef(r)}.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.muted}>Forma de pagamento</Text>
          <Text style={[s.body, { fontWeight: '600' }]}>{methodLabel(r.method)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.muted}>Data</Text>
          <Text style={[s.body, { fontWeight: '600' }]}>
            {new Date(r.paid_at ?? r.created_at).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>
      {r.receipt_signature_key ? (
        <View style={{ gap: 6, maxWidth: 280 }}>
          {r.receipt_signature_url ? (
            <Image
              source={{ uri: r.receipt_signature_url }}
              style={{ height: 56, width: 200 }}
              resizeMode="contain"
              accessibilityLabel="Assinatura do técnico"
            />
          ) : null}
          <View style={{ height: 1, backgroundColor: '#94A3B8' }} />
          <Text style={s.muted}>
            {r.receipt_signer_name ? `${r.receipt_signer_name} · Técnico` : 'Técnico'}
          </Text>
        </View>
      ) : null}
      {company?.pix_key ? (
        <View
          style={{
            borderRadius: 12,
            backgroundColor: C.bg,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <QrCode size={20} color={C.fg2} />
          <Text style={[s.muted, { flex: 1 }]}>Chave Pix: {company.pix_key}</Text>
        </View>
      ) : null}
    </Card>
  );
}

export function ReceiptScreen() {
  const nav = useNavigation<Nav>();
  const { id } = useRoute<RouteProp<Params, 'Receipt'>>().params;
  const load = useCallback(() => easy.receipt(id), [id]);
  const receipt = useLoad(load, 'Não foi possível carregar este recibo.');
  const company = useLoad(easy.company, 'Não foi possível carregar a empresa.');
  const [busy, setBusy] = useState(false);

  if (receipt.error)
    return (
      <Page>
        <ErrorBox message={receipt.error} onRetry={receipt.refresh} />
      </Page>
    );
  if (!receipt.data)
    return (
      <Page>
        <Loading />
      </Page>
    );
  const r = receipt.data;
  const signed = !!r.receipt_signature_key;

  const toggle = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      receipt.setData(await easy.setReceiptSignature(r.id, on));
    } catch (err) {
      const msg = /404$/.test(String(err))
        ? 'Você ainda não tem assinatura salva. Salve uma em Trocar assinatura.'
        : errorText(err, 'Não foi possível mudar a assinatura do recibo.');
      Alert.alert('Não deu certo', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      bar={
        <>
          <Btn icon={Share2} onPress={() => void send(r)}>
            Enviar no WhatsApp
          </Btn>
          <Btn tone="outline" icon={Download} height={56} onPress={() => void send(r)}>
            Baixar PDF
          </Btn>
        </>
      }
    >
      <H1 size={28}>Recibo nº {receiptNo(r.receipt_number)}</H1>
      <ReceiptPaperView r={r} company={company.data} />
      <Card style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <Toggle
          on={signed}
          onChange={(on) => void toggle(on)}
          label="Pôr minha assinatura no recibo"
        />
        <Btn tone="link" onPress={() => nav.navigate('QuoteSign', { standalone: true })}>
          Trocar assinatura
        </Btn>
      </Card>
    </Page>
  );
}

const WHENS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'other', label: 'Outro dia' },
];

export function ReceiptNewScreen() {
  const nav = useNavigation<Nav>();
  const params = useRoute<RouteProp<Params, 'ReceiptNew'>>().params;
  const clients = useLoad(easy.clients, 'Não foi possível carregar seus clientes.');
  const links = useLoad(
    useCallback(async () => {
      const [wos, quotes] = await Promise.all([easy.workOrders100(), easy.quotes()]);
      return [
        ...wos.map((w) => ({
          key: `work_order:${w.id}`,
          customer: w.customer.id,
          label: `Serviço #${w.number} · ${w.title}`,
        })),
        ...quotes
          .filter((q) => q.status === 'APPROVED' || q.status === 'SENT')
          .map((q) => ({
            key: `quote:${q.id}`,
            customer: q.customer.id,
            label: `Orçamento #${q.number}`,
          })),
      ];
    }, []),
    'Não foi possível carregar serviços e orçamentos.',
  );
  const [clientId, setClientId] = useState<string | null>(params?.clientId ?? null);
  const [q, setQ] = useState('');
  const [digits, setDigits] = useState('');
  const [ref, setRef] = useState('');
  const [method, setMethod] = useState('PIX');
  const [when, setWhen] = useState('today');
  const [otherDay, setOtherDay] = useState(1);
  const [moreOpen, setMoreOpen] = useState(!!params?.link);
  const due = !!params?.due;
  const [dueIn, setDueIn] = useState(7);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const all = clients.data ?? [];
  const qq = norm(q.trim());
  const shown = (qq ? all.filter((c) => norm(c.name).includes(qq)) : all.slice(0, 3)).slice(0, 5);
  const picked = all.find((c) => c.id === clientId);
  if (picked && !shown.some((c) => c.id === picked.id)) shown.unshift(picked);
  const clientLinks = (links.data ?? []).filter((l) => l.customer === clientId);
  const n = digits.replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  const ok = !!clientId && Number(amount) > 0;
  const chosen = clientLinks.find((l) => l.key === link);

  const paidAt = () => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - (when === 'yesterday' ? 1 : when === 'other' ? otherDay : 0));
    return d.toISOString();
  };

  const submit = async () => {
    if (!ok || busy || !clientId) return;
    setBusy(true);
    try {
      const [kind, linkId] = (chosen?.key ?? '').split(':');
      if (due) {
        const day = new Date();
        day.setHours(12, 0, 0, 0);
        day.setDate(day.getDate() + dueIn);
        await easy.createDue({
          customer_id: clientId,
          amount,
          due_date: day.toISOString(),
          description: ref.trim() || undefined,
          work_order_id: kind === 'work_order' ? linkId : undefined,
          quote_id: kind === 'quote' ? linkId : undefined,
        });
        Alert.alert('Pronto!', `Cobrança de ${formatMoney(amount)} em A receber.`);
        return nav.goBack();
      }
      const r = await easy.createReceipt({
        customer_id: clientId,
        amount,
        method,
        paid_at: paidAt(),
        description: ref,
        work_order_id: kind === 'work_order' ? linkId : undefined,
        quote_id: kind === 'quote' ? linkId : undefined,
      });
      Alert.alert('Pronto!', `Recibo nº ${receiptNo(r.receipt_number)} criado.`);
      nav.replace('Receipt', { id: r.id });
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível criar o recibo.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      bar={
        <>
          {!ok ? (
            <Text style={[s.muted, { textAlign: 'center' }]}>
              {clientId
                ? 'Falta o valor'
                : due
                  ? 'Escolha quem vai pagar'
                  : 'Escolha de quem recebeu'}
            </Text>
          ) : null}
          <Btn disabled={!ok} busy={busy} onPress={() => void submit()}>
            {due ? 'Criar cobrança' : 'Criar recibo'}
          </Btn>
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <H1 size={32}>{due ? 'Nova cobrança' : 'Novo recibo'}</H1>
        <Sub>
          {due
            ? 'Para um valor que o cliente ainda vai pagar.'
            : 'Para um pagamento que você já recebeu.'}
        </Sub>
      </View>
      {clients.error ? <ErrorBox message={clients.error} onRetry={clients.refresh} /> : null}
      {!clients.data && !clients.error ? <Loading /> : null}

      <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>
        {due ? 'Quem vai pagar?' : 'De quem recebeu?'}
      </Text>
      {all.length > 3 ? <Search value={q} onChange={setQ} placeholder="Buscar cliente" /> : null}
      {shown.map((c) => {
        const on = c.id === clientId;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              setClientId(c.id);
              setLink('');
            }}
            style={{
              minHeight: 60,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: on ? C.purple : C.border,
              backgroundColor: on ? C.purple50 : '#FFFFFF',
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
          >
            <Text style={[s.body, { fontWeight: on ? '700' : '500' }]}>{c.name}</Text>
          </Pressable>
        );
      })}
      <Btn
        tone="dashed"
        icon={UserPlus}
        height={60}
        onPress={() => nav.navigate('ClientNew', { forReceipt: true })}
      >
        Cliente novo
      </Btn>

      <Field
        label="Quanto?"
        value={digits ? formatMoney(amount) : ''}
        onChange={(v) => setDigits(v.replace(/\D/g, '').slice(0, 10))}
        placeholder="R$ 0,00"
        keyboard="number-pad"
        big
      />
      <Field
        label="Referente a quê?"
        value={ref}
        onChange={(v) => setRef(v.slice(0, 200))}
        placeholder="Ex.: Troca de 2 tomadas"
      />

      {due ? (
        <>
          <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Vence em</Text>
          <Options
            cols={3}
            value={dueIn}
            onPick={setDueIn}
            options={[7, 15, 30].map((d) => {
              const day = new Date();
              day.setDate(day.getDate() + d);
              return {
                value: d,
                label: `${d} dias (${day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`,
              };
            })}
          />
        </>
      ) : (
        <>
          <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Como recebeu?</Text>
          <Options cols={2} options={RECEIPT_METHODS} value={method} onPick={setMethod} />

          <Text style={[s.body, { fontWeight: '700', fontSize: 19 }]}>Quando?</Text>
          <Options cols={3} options={WHENS} value={when} onPick={setWhen} />
          {when === 'other' ? (
            <Options
              cols={3}
              value={otherDay}
              onPick={setOtherDay}
              options={[2, 3, 4, 5, 6, 7].map((d) => {
                const day = new Date();
                day.setDate(day.getDate() - d);
                return {
                  value: d,
                  label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                };
              })}
            />
          ) : null}
        </>
      )}

      <Card style={{ overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          onPress={() => setMoreOpen((v) => !v)}
          style={{
            minHeight: 72,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.body, { fontWeight: '700', fontSize: 18 }]}>Mais opções</Text>
            <Text style={s.muted}>
              {chosen ? `Ligado a ${chosen.label}` : 'Ligar a um orçamento ou serviço'}
            </Text>
          </View>
          {moreOpen ? (
            <ChevronUp size={26} color={C.fg2} />
          ) : (
            <ChevronDown size={26} color={C.fg2} />
          )}
        </Pressable>
        {moreOpen ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
            {!clientId ? (
              <Text style={s.muted}>Escolha o cliente primeiro.</Text>
            ) : clientLinks.length === 0 ? (
              <Text style={s.muted}>Este cliente não tem serviço nem orçamento aberto.</Text>
            ) : (
              <Options
                cols={1}
                value={link}
                onPick={setLink}
                options={[
                  { value: '', label: 'Nenhum' },
                  ...clientLinks.map((l) => ({ value: l.key, label: l.label })),
                ]}
              />
            )}
          </View>
        ) : null}
      </Card>
      <Text style={[s.muted, { textAlign: 'center' }]}>
        {due
          ? 'Aparece em A receber no Financeiro. O recibo sai quando o cliente pagar.'
          : 'O valor também entra no Financeiro como recebido.'}
      </Text>
    </Page>
  );
}
