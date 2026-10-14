// Recibos (app): list, receipt and "Novo recibo". Registered in the easy stack and
// in the full app's Mais stack, so both modes have the same receipts.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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
import {
  formatMoney,
  isPositiveDecimal,
  maskCpfCnpj,
  maskPhone,
  resolveReceiptDocOptions,
} from '@orcivo/shared-types';
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
/** Document, phone and address of a party, formatted; empty parts are skipped. */
function partyLines(
  document: string | null | undefined,
  phone: string | null | undefined,
  address: Array<string | null | undefined>,
): string[] {
  const doc = document ? maskCpfCnpj(document) : '';
  return [
    doc ? `${doc.length > 14 ? 'CNPJ' : 'CPF'} ${doc}` : '',
    phone ? maskPhone(phone) : '',
    address.filter(Boolean).join(' · '),
  ].filter(Boolean);
}

export function ReceiptPaperView({ r, company }: { r: EasyReceipt; company: EasyCompany | null }) {
  const opts = resolveReceiptDocOptions(r.receipt_doc_options);
  const paidDate = new Date(r.paid_at ?? r.created_at).toLocaleDateString('pt-BR');
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
          {opts.company_details && company?.document ? (
            <Text style={s.muted}>
              {company.document_type ?? 'Documento'} {company.document}
            </Text>
          ) : null}
          {opts.company_details && (company?.phone || company?.address) ? (
            <Text style={s.muted}>
              {[company?.phone ? maskPhone(company.phone) : '', company?.address]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          {opts.company_details && (company?.instagram || company?.website) ? (
            <Text style={s.muted}>
              {[
                company?.instagram ? `@${company.instagram.replace(/^@/, '')}` : '',
                company?.website ?? '',
              ]
                .filter(Boolean)
                .join(' · ')}
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
        Declaro que recebi de <Text style={{ fontWeight: '700' }}>{r.customer.name}</Text> o valor
        de <Text style={{ fontWeight: '700' }}>{formatMoney(r.amount)}</Text>, referente a{' '}
        {receiptRef(r)}, em {paidDate}.
      </Text>
      {[
        {
          title: 'Quem recebeu',
          name: company?.trade_name ?? '',
          lines: opts.company_details
            ? partyLines(company?.document, company?.phone, [
                company?.address,
                [company?.city, company?.state].filter(Boolean).join('/'),
              ])
            : [],
        },
        {
          title: 'Quem pagou',
          name: r.customer.name,
          lines: opts.client_details
            ? partyLines(r.customer.tax_id, r.customer.phone, [
                [r.customer.street, r.customer.number].filter(Boolean).join(', '),
                r.customer.neighborhood,
                [r.customer.city, r.customer.state].filter(Boolean).join('/'),
              ])
            : [],
        },
      ].map((p) => (
        <View
          key={p.title}
          style={{ borderRadius: 12, backgroundColor: '#F8FAFC', padding: 12, gap: 2 }}
        >
          <Text style={[s.muted, { fontWeight: '600' }]}>{p.title}</Text>
          <Text style={[s.body, { fontWeight: '700' }]}>{p.name}</Text>
          {p.lines.map((l) => (
            <Text key={l} style={s.muted}>
              {l}
            </Text>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {opts.payment_details ? (
          <View style={{ flex: 1 }}>
            <Text style={s.muted}>Forma de pagamento</Text>
            <Text style={[s.body, { fontWeight: '600' }]}>{methodLabel(r.method)}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.muted}>Data</Text>
          <Text style={[s.body, { fontWeight: '600' }]}>{paidDate}</Text>
        </View>
      </View>
      {opts.additional_info && r.receipt_additional_info ? (
        <View style={{ borderRadius: 12, backgroundColor: C.bg, padding: 12, gap: 4 }}>
          <Text style={[s.muted, { fontWeight: '600' }]}>Informações adicionais</Text>
          <Text style={s.muted}>{r.receipt_additional_info}</Text>
        </View>
      ) : null}
      {r.receipt_signature_key ? (
        <View style={{ gap: 6, maxWidth: 280 }}>
          {r.receipt_signature_url ? (
            <Image
              source={{ uri: r.receipt_signature_url }}
              style={{ height: 56, width: 200 }}
              resizeMode="contain"
              accessibilityLabel="Assinatura do responsável"
            />
          ) : null}
          <View style={{ height: 1, backgroundColor: '#94A3B8' }} />
          <Text style={s.muted}>
            {[r.receipt_signer_name, 'Responsável', company?.professional_registration]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      ) : null}
      {opts.pix && company?.pix_key ? (
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
      {opts.footer && company?.document_footer ? (
        <Text style={[s.muted, { textAlign: 'center' }]}>{company.document_footer}</Text>
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
  const signature = useLoad(easy.signature, 'Não foi possível carregar sua assinatura.');
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
  const hasSavedSignature = !!signature.data?.signature_url;

  const toggle = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      receipt.setData(await easy.setReceiptSignature(r.id, on));
    } catch (err) {
      const msg = /404$/.test(String(err))
        ? 'Você ainda não tem assinatura salva. Toque em Adicionar assinatura.'
        : errorText(err, 'Não foi possível mudar a assinatura do recibo.');
      Alert.alert('Não deu certo', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleOneOffSignature = async () => {
    if (busy) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    try {
      const asset = picked.assets[0];
      receipt.setData(await easy.setReceiptSignatureOnce(r.id, asset.uri, asset.mimeType));
      Alert.alert('Assinatura incluída', 'Ela será usada somente neste recibo.');
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível usar esta assinatura.'));
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
        {signed ? <Text style={s.muted}>Assinatura incluída neste recibo.</Text> : null}
        {signed || hasSavedSignature ? (
          <Btn tone="outline" disabled={busy} onPress={() => void toggle(!signed)}>
            {signed ? 'Remover assinatura' : 'Usar assinatura salva'}
          </Btn>
        ) : (
          <Text style={s.muted}>Adicione uma assinatura para poder incluí-la neste recibo.</Text>
        )}
        <Btn tone="link" onPress={() => nav.navigate('QuoteSign', { standalone: true })}>
          {hasSavedSignature ? 'Trocar assinatura' : 'Adicionar assinatura'}
        </Btn>
        <Btn tone="outline" disabled={busy} onPress={() => void handleOneOffSignature()}>
          Usar outra só neste recibo
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
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof easy.customerOptions>>>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [customersHaveMore, setCustomersHaveMore] = useState(true);
  const [customerVisible, setCustomerVisible] = useState(5);
  const [customerRevision, setCustomerRevision] = useState(0);
  const customerRequestRef = useRef(0);
  const linkRequestRef = useRef(0);
  const [links, setLinks] = useState<Array<{ key: string; customer: string; label: string }>>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksHaveMore, setLinksHaveMore] = useState(false);
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
  const [linkQuery, setLinkQuery] = useState('');
  const [linkLimit, setLinkLimit] = useState(8);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const requestId = ++customerRequestRef.current;
      setCustomersLoading(true);
      setCustomersError('');
      void easy
        .customerOptions(q, 1)
        .then((result) => {
          if (requestId !== customerRequestRef.current) return;
          setCustomers(result);
          setCustomerPage(1);
          setCustomersHaveMore(result.length === 10);
          setCustomerVisible(5);
        })
        .catch((error) => {
          if (requestId === customerRequestRef.current) {
            setCustomersError(errorText(error, 'Não foi possível carregar seus clientes.'));
          }
        })
        .finally(() => {
          if (requestId === customerRequestRef.current) setCustomersLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      customerRequestRef.current += 1;
    };
  }, [customerRevision, q]);

  useEffect(() => {
    if (!clientId) {
      setLinks([]);
      return;
    }
    const timer = setTimeout(() => {
      const requestId = ++linkRequestRef.current;
      setLinksLoading(true);
      void easy
        .receiptLinks(clientId, linkQuery, linkLimit)
        .then((result) => {
          if (requestId !== linkRequestRef.current) return;
          setLinks(result.data);
          setLinksHaveMore(result.hasMore);
        })
        .catch((error) => {
          if (requestId === linkRequestRef.current) {
            Alert.alert('Não foi possível carregar', errorText(error, 'Tente novamente.'));
          }
        })
        .finally(() => {
          if (requestId === linkRequestRef.current) setLinksLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      linkRequestRef.current += 1;
    };
  }, [clientId, linkLimit, linkQuery]);

  const loadMoreCustomers = async () => {
    if (customerVisible < customers.length) {
      setCustomerVisible((current) => current + 5);
      return;
    }
    const nextPage = customerPage + 1;
    const requestId = ++customerRequestRef.current;
    setCustomersLoading(true);
    try {
      const next = await easy.customerOptions(q, nextPage);
      if (requestId !== customerRequestRef.current) return;
      setCustomers((current) => {
        const merged = new Map(current.map((customer) => [customer.id, customer]));
        next.forEach((customer) => merged.set(customer.id, customer));
        return [...merged.values()];
      });
      setCustomerPage(nextPage);
      setCustomersHaveMore(next.length === 10);
      setCustomerVisible((current) => current + 5);
    } catch (error) {
      if (requestId === customerRequestRef.current) {
        setCustomersError(errorText(error, 'Não foi possível carregar mais clientes.'));
      }
    } finally {
      if (requestId === customerRequestRef.current) setCustomersLoading(false);
    }
  };

  const all = customers;
  const shown = all.slice(0, customerVisible);
  const picked = all.find((c) => c.id === clientId);
  if (picked && !shown.some((c) => c.id === picked.id)) shown.unshift(picked);
  const clientLinks = links;
  const n = digits.replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  const ok = !!clientId && isPositiveDecimal(amount);
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
      {customersError ? (
        <ErrorBox
          message={customersError}
          onRetry={() => setCustomerRevision((current) => current + 1)}
        />
      ) : null}
      {customersLoading && customers.length === 0 ? <Loading /> : null}

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
      {(customerVisible < all.length || customersHaveMore) && !customersLoading ? (
        <Btn tone="soft" onPress={() => void loadMoreCustomers()}>
          Ver mais clientes
        </Btn>
      ) : null}
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
            ) : (
              <>
                <Search
                  value={linkQuery}
                  onChange={(value) => {
                    setLinkQuery(value);
                    setLinkLimit(8);
                  }}
                  placeholder="Buscar serviço ou orçamento"
                />
                {!linksLoading && clientLinks.length === 0 ? (
                  <Text style={s.muted}>Nenhum serviço ou orçamento correspondente.</Text>
                ) : null}
                <Options
                  cols={1}
                  value={link}
                  onPick={setLink}
                  options={[
                    { value: '', label: 'Nenhum' },
                    ...clientLinks.map((l) => ({ value: l.key, label: l.label })),
                  ]}
                />
                {linksLoading ? <Text style={s.muted}>Carregando…</Text> : null}
                {linksHaveMore && !linksLoading ? (
                  <Btn
                    tone="soft"
                    onPress={() => setLinkLimit((current) => Math.min(current + 8, 100))}
                  >
                    Ver mais
                  </Btn>
                ) : null}
              </>
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
