// Novo orçamento in three steps (mirrors apps/web/app/facil/screens/QuoteFlow.tsx).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, PanResponder, Pressable, Share, Text, View } from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Check,
  Download,
  MessageCircle,
  Image as ImageIcon,
  Minus,
  PenLine,
  Plus,
  Trash2,
  Type,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import {
  formatMoney,
  maskPhone,
  multiplyDecimal,
  type QuoteCreateDto,
  QUOTE_DOC_TITLES,
  resolveQuoteDocOptions,
  isFeminineDocTitle,
} from '@orcivo/shared-types';
import { PaymentTermsFields } from '../PaymentTerms';
import { newIdempotencyKey } from '../../services/api';
import { easy, errorText, type EasyCatalogItem, type EasyClient } from '../data';
import {
  DEFAULT_TERMS,
  approvalUrl,
  centsToDecimal,
  emptyDraft,
  openWhatsApp,
  useDraft,
  useEasyNav,
  useTotals,
} from '../draft';
import {
  Avatar,
  Btn,
  C,
  Card,
  EmptyBox,
  ErrorBox,
  Field,
  H1,
  Loading,
  More,
  Options,
  Page,
  Search,
  SectionLabel,
  Sub,
  Toggle,
  s,
  useLoad,
} from '../ui';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { EasyStackParamList } from '../EasyNavigator';
import { approvalsSummary } from './Settings';
import { shareQuotePdf } from '../share';
import { DocOptionsFields } from '../DocOptions';

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const key = () => Math.random().toString(36).slice(2);

// ── 1. Para quem? ─────────────────────────────────────────────────────
export function QuoteClientScreen() {
  const nav = useEasyNav();
  const { draft, setDraft } = useDraft();
  const clients = useLoad(easy.clients, 'Não foi possível carregar seus clientes.');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const qq = norm(q.trim());
    const digits = qq.replace(/\D/g, '');
    const all = clients.data ?? [];
    if (!qq) return all.slice(0, 6);
    return all
      .filter(
        (c) =>
          norm(c.name).includes(qq) ||
          (!!digits && (c.phone ?? '').replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 20);
  }, [clients.data, q]);

  const pick = (c: EasyClient) => {
    setDraft((d) => ({ ...d, client: c }));
    nav.navigate('QuoteItems');
  };

  return (
    <Page>
      <H1 size={32}>Para quem?</H1>
      <Search value={q} onChange={setQ} placeholder="Buscar por nome ou telefone" />
      <Btn
        tone="dashed"
        icon={UserPlus}
        height={72}
        onPress={() => nav.navigate('ClientNew', { forQuote: true })}
      >
        Cliente novo
      </Btn>
      <SectionLabel>{q.trim() ? 'Encontrados' : 'Recentes'}</SectionLabel>
      {clients.error ? <ErrorBox message={clients.error} onRetry={clients.refresh} /> : null}
      {!clients.data && !clients.error ? <Loading /> : null}
      {clients.data && list.length === 0 ? (
        <EmptyBox>
          {q.trim() ? 'Nenhum cliente com esse nome.' : 'Você ainda não tem clientes.'}
        </EmptyBox>
      ) : null}
      {list.map((c) => {
        const on = draft.client?.id === c.id;
        return (
          <Card
            key={c.id}
            onPress={() => pick(c)}
            label={`Escolher ${c.name}`}
            style={[
              { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
              on && { borderColor: C.purple, borderWidth: 2 },
            ]}
          >
            <Avatar name={c.name} />
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '600' }]}>{c.name}</Text>
              {c.phone ? <Text style={s.muted}>{maskPhone(c.phone)}</Text> : null}
            </View>
            {on ? <Check size={24} color={C.purple} /> : null}
          </Card>
        );
      })}
    </Page>
  );
}

// ── 2. O que vai fazer? ───────────────────────────────────────────────
export function QuoteItemsScreen() {
  const nav = useEasyNav();
  const { draft, setDraft } = useDraft();
  const totals = useTotals(draft);
  const catalog = useLoad(easy.catalog, 'Não foi possível carregar seus serviços e preços.');
  const [all, setAll] = useState(false);
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(5);
  const [newOpen, setNewOpen] = useState(false);
  const [nName, setNName] = useState('');
  const [nDigits, setNDigits] = useState('');
  const [keep, setKeep] = useState(true);
  const [saving, setSaving] = useState(false);

  const items = catalog.data ?? [];
  const filtered = all
    ? items.filter((c) => norm(c.name).includes(norm(q.trim())))
    : items.slice(0, 6);
  const visible = all ? filtered.slice(0, shown) : filtered;

  const add = (c: EasyCatalogItem) =>
    setDraft((d) => {
      const hit = d.items.find((i) => i.catalog_item_id === c.id);
      if (hit)
        return { ...d, items: d.items.map((i) => (i === hit ? { ...i, qty: i.qty + 1 } : i)) };
      return {
        ...d,
        items: [
          ...d.items,
          { key: key(), catalog_item_id: c.id, name: c.name, price: c.unit_price, qty: 1 },
        ],
      };
    });
  const setQty = (k: string, qty: number) =>
    setDraft((d) => ({
      ...d,
      items:
        qty <= 0
          ? d.items.filter((i) => i.key !== k)
          : d.items.map((i) => (i.key === k ? { ...i, qty } : i)),
    }));

  const price = centsToDecimal(nDigits);
  const newOk = nName.trim().length > 1 && Number(price) > 0;
  const addNew = async () => {
    if (!newOk || saving) return;
    let catalogId: string | undefined;
    if (keep) {
      setSaving(true);
      try {
        const created = await easy.createCatalogItem(nName, price);
        catalogId = created.id;
        void catalog.refresh();
      } catch (err) {
        setSaving(false);
        return Alert.alert('Não deu certo', errorText(err, 'Não foi possível guardar o item.'));
      }
      setSaving(false);
    }
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { key: key(), catalog_item_id: catalogId, name: nName.trim(), price, qty: 1 },
      ],
    }));
    setNName('');
    setNDigits('');
    setNewOpen(false);
  };

  return (
    <Page
      bar={
        <>
          {draft.items.length ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[s.body, { color: C.fg3 }]}>Total</Text>
              <Text style={[s.body, { fontWeight: '800', fontSize: 20 }]}>
                {formatMoney(totals.subtotal)}
              </Text>
            </View>
          ) : (
            <Text style={[s.muted, { textAlign: 'center' }]}>
              Toque em um serviço para pôr no orçamento
            </Text>
          )}
          <Btn disabled={!draft.items.length} onPress={() => nav.navigate('QuoteReview')}>
            Continuar
          </Btn>
        </>
      }
    >
      <View style={{ gap: 4 }}>
        <H1 size={32}>O que vai fazer?</H1>
        <Sub>Para {draft.client?.name ?? 'cliente'}</Sub>
      </View>

      {draft.items.length ? (
        <>
          <SectionLabel>No orçamento</SectionLabel>
          {draft.items.map((i) => (
            <Card key={i.key} style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text style={[s.body, { fontWeight: '600', flex: 1 }]}>{i.name}</Text>
                <Text style={[s.body, { fontWeight: '700' }]}>{formatMoney(i.price)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <StepBtn
                  icon={i.qty === 1 ? Trash2 : Minus}
                  label={i.qty === 1 ? `Tirar ${i.name}` : 'Menos um'}
                  onPress={() => setQty(i.key, i.qty - 1)}
                />
                <Text style={[s.body, { fontWeight: '700', minWidth: 32, textAlign: 'center' }]}>
                  {i.qty}
                </Text>
                <StepBtn icon={Plus} label="Mais um" onPress={() => setQty(i.key, i.qty + 1)} />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionLabel>Seus serviços</SectionLabel>
        {items.length > 6 && !all ? (
          <Btn tone="link" style={{ width: undefined }} onPress={() => setAll(true)}>
            Ver todos
          </Btn>
        ) : null}
      </View>
      {all ? (
        <Search
          value={q}
          onChange={(v) => {
            setQ(v);
            setShown(5);
          }}
          placeholder="Buscar serviço"
        />
      ) : null}
      {catalog.error ? <ErrorBox message={catalog.error} onRetry={catalog.refresh} /> : null}
      {!catalog.data && !catalog.error ? <Loading /> : null}
      {catalog.data && !items.length ? (
        <EmptyBox>Você ainda não tem serviços guardados.</EmptyBox>
      ) : null}
      {visible.map((c) => {
        const qty = draft.items.find((i) => i.catalog_item_id === c.id)?.qty ?? 0;
        return (
          <Card
            key={c.id}
            onPress={() => add(c)}
            label={`Pôr ${c.name}`}
            style={[
              { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 68 },
              qty > 0 && { borderColor: C.purple, backgroundColor: C.purple50 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '600' }]}>{c.name}</Text>
              <Text style={s.muted}>{formatMoney(c.unit_price)}</Text>
            </View>
            {qty > 0 ? (
              <Text style={[s.body, { color: C.purple, fontWeight: '800' }]}>{qty}×</Text>
            ) : (
              <Plus size={24} color={C.purple} />
            )}
          </Card>
        );
      })}
      {all && filtered.length > shown ? (
        <Btn tone="outline" onPress={() => setShown((n) => n + 5)}>
          Ver mais {Math.min(5, filtered.length - shown)}
        </Btn>
      ) : null}

      {newOpen ? (
        <Card style={{ padding: 16, gap: 14 }}>
          <Text style={[s.body, { fontWeight: '700', fontSize: 20 }]}>Item novo</Text>
          <Field
            label="O que é"
            value={nName}
            onChange={setNName}
            placeholder="Ex.: Instalação de câmera"
          />
          <Field
            label="Preço"
            value={nDigits ? formatMoney(price) : ''}
            onChange={(v) => setNDigits(v.replace(/\D/g, '').slice(0, 10))}
            placeholder="R$ 0,00"
            keyboard="number-pad"
            big
          />
          <Toggle on={keep} onChange={setKeep} label="Guardar em Meus serviços e preços" />
          <Btn disabled={!newOk} busy={saving} onPress={() => void addNew()}>
            Pôr no orçamento
          </Btn>
          <Btn tone="link" onPress={() => setNewOpen(false)}>
            Cancelar
          </Btn>
        </Card>
      ) : (
        <Btn tone="dashed" icon={Plus} height={64} onPress={() => setNewOpen(true)}>
          Item novo
        </Btn>
      )}
    </Page>
  );
}

function StepBtn({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: C.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <Icon size={22} color={C.ink} />
    </Pressable>
  );
}

// ── 3. Revisar e enviar ───────────────────────────────────────────────

export function QuoteReviewScreen() {
  const nav = useEasyNav();
  const { draft, setDraft } = useDraft();
  const totals = useTotals(draft);
  const approvals = useLoad(
    easy.approvalMethods,
    'Não foi possível carregar as formas de aprovação.',
  );
  const [busy, setBusy] = useState(false);
  const createKey = useRef(newIdempotencyKey());
  const saved = draft.savedSignature;

  useEffect(() => {
    // First visit: the company's Condições padrão fill terms and validity.
    if (draft.terms === '' && !draft.id) {
      setDraft((d) => ({ ...d, terms: DEFAULT_TERMS }));
      easy
        .company()
        .then((c) =>
          setDraft((d) => ({
            ...d,
            terms: c.quote_default_terms ?? d.terms,
            validityDays: c.quote_default_validity_days ?? d.validityDays,
            docOptions: c.quote_default_doc_options ?? d.docOptions,
            paymentTerms: c.quote_default_payment_terms ?? d.paymentTerms,
            warranty: c.quote_default_warranty ?? d.warranty,
          })),
        )
        .catch(() => undefined);
    }
    if (draft.savedSignature !== undefined) return;
    easy
      .signature()
      .then((r) =>
        setDraft((d) => ({
          ...d,
          savedSignature: r.signature_url,
          // First visit: a saved signature goes in by default (same as the web).
          signature:
            r.signature_url && d.signature.mode === 'none' ? { mode: 'saved' } : d.signature,
        })),
      )
      .catch(() => setDraft((d) => ({ ...d, savedSignature: null })));
  }, []);

  const sigStatus =
    draft.signature.mode === 'once'
      ? 'Vai só neste orçamento.'
      : draft.signature.mode === 'saved'
        ? 'Sua assinatura salva vai no PDF.'
        : saved
          ? 'Não vai neste orçamento.'
          : 'Ainda não assinou. É opcional.';
  const sigImg =
    draft.signature.mode === 'once'
      ? draft.signature.uri
      : draft.signature.mode === 'saved'
        ? saved
        : null;

  const buildDto = (): QuoteCreateDto => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + draft.validityDays);
    validUntil.setHours(23, 59, 59, 0);
    return {
      customer_id: draft.client?.id ?? '',
      notes: draft.terms.trim() || undefined,
      valid_until: validUntil.toISOString(),
      discount_type: draft.discountType,
      doc_options: draft.docOptions ?? undefined,
      payment_terms: draft.paymentTerms,
      warranty: draft.warranty.trim() || undefined,
      discount_value:
        draft.discountType === 'PERCENT'
          ? draft.discountDigits || '0'
          : centsToDecimal(draft.discountDigits),
      items: draft.items.map((i) => ({
        catalog_item_id: i.catalog_item_id,
        description: i.name.slice(0, 300),
        quantity: i.qty.toFixed(3),
        unit_price: i.price,
      })),
    } as QuoteCreateDto;
  };

  const send = async () => {
    if (busy || !draft.client) return;
    setBusy(true);
    const dto = buildDto();
    let created: { id: string; number: number };
    try {
      created = draft.id
        ? await easy.updateQuote(draft.id, dto, createKey.current)
        : await easy.createQuote(dto, createKey.current);
    } catch (err) {
      setBusy(false);
      return Alert.alert('Não deu certo', errorText(err, 'Não foi possível guardar o orçamento.'));
    }
    try {
      const sig = draft.signature;
      const sent =
        sig.mode === 'once' && sig.uri
          ? await easy.sendQuoteOnce(created.id, sig.uri)
          : await easy.sendQuote(created.id, sig.mode === 'saved');
      const url = sent.approvalUrl ?? (sent.approval_token ? approvalUrl(sent.approval_token) : '');
      const client = draft.client;
      createKey.current = newIdempotencyKey();
      setBusy(false);
      // Registered: the Pronto screen sends it (WhatsApp, PDF or link).
      nav.reset({
        index: 1,
        routes: [
          { name: 'EasyTabs' },
          {
            name: 'QuoteDone',
            params: {
              id: created.id,
              number: created.number,
              total: totals.total,
              name: client.name,
              phone: client.phone,
              url,
              docTitle: resolveQuoteDocOptions(draft.docOptions).title,
            },
          },
        ],
      });
      setDraft(emptyDraft());
    } catch {
      setBusy(false);
      createKey.current = newIdempotencyKey();
      setDraft(emptyDraft());
      Alert.alert(
        'Não deu certo',
        'Não foi possível concluir agora. O orçamento ficou guardado como rascunho.',
      );
      nav.reset({
        index: 1,
        routes: [{ name: 'EasyTabs' }, { name: 'QuoteDetail', params: { id: created.id } }],
      });
    }
  };

  const saveDraft = async () => {
    if (busy || !draft.client) return;
    setBusy(true);
    try {
      const dto = buildDto();
      const saved = draft.id
        ? await easy.updateQuote(draft.id, dto, createKey.current)
        : await easy.createQuote(dto, createKey.current);
      createKey.current = newIdempotencyKey();
      setDraft(emptyDraft());
      Alert.alert('Pronto', `Rascunho #${saved.number} guardado em Orçamentos.`);
      nav.reset({ index: 0, routes: [{ name: 'EasyTabs', params: { screen: 'Orcamentos' } }] });
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível guardar o orçamento.'));
    } finally {
      setBusy(false);
    }
  };

  const pct = draft.discountType === 'PERCENT';
  return (
    <Page
      bar={
        <>
          <Btn icon={Check} busy={busy} onPress={() => void send()}>
            Concluir orçamento
          </Btn>
          <Btn tone="link" disabled={busy} onPress={() => void saveDraft()}>
            Guardar rascunho
          </Btn>
        </>
      }
    >
      <H1 size={32}>Revisar e enviar</H1>
      <Card style={{ padding: 18, gap: 6, backgroundColor: C.purple50, borderColor: C.purple200 }}>
        <Text style={[s.body, { color: C.purple800, fontWeight: '600' }]}>Total</Text>
        <Text style={{ fontSize: 36, fontWeight: '800', color: C.ink }}>
          {formatMoney(totals.total)}
        </Text>
        <Text style={s.muted}>
          Para {draft.client?.name} · {draft.items.length}{' '}
          {draft.items.length === 1 ? 'item' : 'itens'}
          {Number(totals.discount) > 0 ? ` · desconto de ${formatMoney(totals.discount)}` : ''}
        </Text>
      </Card>

      <Card style={{ padding: 16, gap: 8 }}>
        {draft.items.map((i) => (
          <View
            key={i.key}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}
          >
            <Text style={[s.body, { flex: 1 }]}>
              {i.qty}× {i.name}
            </Text>
            <Text style={[s.body, { fontWeight: '600' }]}>
              {formatMoney(multiplyDecimal(i.price, String(i.qty)))}
            </Text>
          </View>
        ))}
        <Btn tone="link" onPress={() => nav.goBack()}>
          Alterar
        </Btn>
      </Card>

      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <PenLine size={22} color={C.purple} />
          <View style={{ flex: 1 }}>
            <Text style={[s.body, { fontWeight: '600', fontSize: 18 }]}>Sua assinatura</Text>
            <Text style={s.muted}>{saved === undefined ? '…' : sigStatus}</Text>
          </View>
        </View>
        {sigImg ? (
          <View
            style={{
              height: 72,
              borderRadius: 14,
              backgroundColor: C.bg,
              borderWidth: 1,
              borderColor: C.border,
              padding: 4,
            }}
          >
            <Image
              source={{ uri: sigImg }}
              style={{ flex: 1 }}
              resizeMode="contain"
              accessibilityLabel="Sua assinatura"
            />
          </View>
        ) : null}
        {saved && draft.signature.mode !== 'once' ? (
          <Toggle
            on={draft.signature.mode === 'saved'}
            onChange={(on) =>
              setDraft((d) => ({ ...d, signature: { mode: on ? 'saved' : 'none' } }))
            }
            label="Pôr minha assinatura neste orçamento"
          />
        ) : null}
        <Btn tone="soft" icon={PenLine} height={56} onPress={() => nav.navigate('QuoteSign')}>
          {saved || draft.signature.mode !== 'none' ? 'Trocar assinatura' : 'Assinar'}
        </Btn>
      </Card>

      <Card
        onPress={() => nav.navigate('Approvals')}
        label="Mudar como o cliente aprova"
        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[s.body, { fontWeight: '700', fontSize: 18 }]}>Como o cliente aprova</Text>
          <Text style={s.muted}>
            {approvals.data ? approvalsSummary(approvals.data) : '…'}. Vale para todos os
            orçamentos.
          </Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.purple700 }}>Mudar</Text>
      </Card>

      <More>
        <Card style={{ padding: 16, gap: 14 }}>
          <Text style={[s.body, { fontWeight: '600' }]}>Desconto</Text>
          <Options
            cols={2}
            value={draft.discountType}
            onPick={(t) => setDraft((d) => ({ ...d, discountType: t, discountDigits: '' }))}
            options={[
              { value: 'PERCENT', label: '%' },
              { value: 'FIXED', label: 'R$' },
            ]}
          />
          <Field
            label={pct ? 'Quantos por cento' : 'Quanto em reais'}
            value={
              draft.discountDigits
                ? pct
                  ? draft.discountDigits
                  : formatMoney(centsToDecimal(draft.discountDigits))
                : ''
            }
            onChange={(v) => {
              const d = v.replace(/\D/g, '');
              setDraft((x) => ({
                ...x,
                discountDigits: pct ? String(Math.min(Number(d || 0), 100) || '') : d.slice(0, 10),
              }));
            }}
            placeholder={pct ? '0' : 'R$ 0,00'}
            keyboard="number-pad"
          />
          <Text style={[s.body, { fontWeight: '600' }]}>Condição de pagamento</Text>
          <PaymentTermsFields
            value={draft.paymentTerms}
            onChange={(v) => setDraft((d) => ({ ...d, paymentTerms: v }))}
          />
          <Field
            label="Garantia"
            value={draft.warranty}
            onChange={(v) => setDraft((d) => ({ ...d, warranty: v.slice(0, 2000) }))}
            placeholder="Ex.: 90 dias sobre a mão de obra"
          />
          <DocOptionsFields
            value={draft.docOptions}
            onChange={(v) => setDraft((d) => ({ ...d, docOptions: v }))}
          />
          <Text style={[s.body, { fontWeight: '600' }]}>Vale por</Text>
          <Options
            value={draft.validityDays}
            onPick={(v) => setDraft((d) => ({ ...d, validityDays: v }))}
            options={[
              { value: 7, label: '7 dias' },
              { value: 15, label: '15 dias' },
              { value: 30, label: '30 dias' },
            ]}
          />
          <Field
            label={draft.docOptions?.title === 'LAUDO' ? 'Laudo técnico' : 'Condições'}
            value={draft.terms}
            onChange={(v) => setDraft((d) => ({ ...d, terms: v.slice(0, 2000) }))}
            multiline
          />
        </Card>
      </More>
    </Page>
  );
}

// ── Assinatura do técnico ─────────────────────────────────────────────
type SigMethod = 'NONE' | 'TYPED' | 'DRAWN' | 'PHOTO';
const SIG_METHODS: Array<{ k: SigMethod; label: string; icon: LucideIcon }> = [
  { k: 'NONE', label: 'Sem assinatura', icon: XCircle },
  { k: 'TYPED', label: 'Nome digitado', icon: Type },
  { k: 'DRAWN', label: 'Desenhar com o dedo', icon: PenLine },
  { k: 'PHOTO', label: 'Foto da assinatura', icon: Camera },
];

/** Rasterizes an <Svg> (react-native-svg toDataURL) into a cache PNG for upload. */
function svgToFile(svg: Svg | null): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!svg) return reject(new Error('svg'));
    svg.toDataURL(async (b64: string) => {
      try {
        const uri = `${FileSystem.cacheDirectory}assinatura-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
        resolve(uri);
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function QuoteSignScreen() {
  const nav = useEasyNav();
  const route = useRoute<RouteProp<EasyStackParamList, 'QuoteSign'>>();
  // From Configurações or a receipt: only saves the reusable signature.
  const standalone = !!route.params?.standalone;
  const { setDraft } = useDraft();
  const [method, setMethod] = useState<SigMethod>('DRAWN');
  const [typed, setTyped] = useState('');
  const [paths, setPaths] = useState<string[]>([]);
  const [photo, setPhoto] = useState('');
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const typedRef = useRef<Svg>(null);
  const drawnRef = useRef<Svg>(null);

  const ok =
    method === 'NONE' ||
    (method === 'TYPED' && typed.trim().length > 1) ||
    (method === 'DRAWN' && paths.length > 0) ||
    (method === 'PHOTO' && !!photo);

  const pickPhoto = async (camera: boolean) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted')
      return Alert.alert('Permissão negada', 'Libere o acesso nas configurações do celular.');
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
    };
    const r = camera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
  };

  const confirm = async () => {
    if (!ok || busy) return;
    if (method === 'NONE') {
      setDraft((d) => ({ ...d, signature: { mode: 'none' } }));
      return nav.goBack();
    }
    setBusy(true);
    try {
      const uri =
        method === 'PHOTO'
          ? photo
          : await svgToFile(method === 'TYPED' ? typedRef.current : drawnRef.current);
      if (!save && !standalone) {
        setDraft((d) => ({ ...d, signature: { mode: 'once', uri } }));
      } else {
        const r = await easy.saveSignature(uri);
        if (standalone) Alert.alert('Pronto', 'Assinatura salva. Vale para orçamentos e recibos.');
        else
          setDraft((d) => ({
            ...d,
            savedSignature: r.signature_url,
            signature: { mode: 'saved' },
          }));
      }
      nav.goBack();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível preparar a assinatura.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      bar={
        <Btn disabled={!ok} busy={busy} onPress={() => void confirm()}>
          {method === 'NONE'
            ? 'Enviar sem assinatura'
            : standalone
              ? 'Salvar assinatura'
              : 'Usar esta assinatura'}
        </Btn>
      }
    >
      <View style={{ gap: 4 }}>
        <H1 size={32}>Sua assinatura</H1>
        <Sub>
          {standalone
            ? 'Fica salva para usar nos orçamentos e recibos.'
            : 'Escolha como quer assinar.'}
        </Sub>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {SIG_METHODS.filter((m) => !standalone || m.k !== 'NONE').map((m) => {
          const on = method === m.k;
          const Icon = m.icon;
          return (
            <Pressable
              key={m.k}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setMethod(m.k)}
              style={{
                width: '48%',
                flexGrow: 1,
                minHeight: 88,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: on ? C.purple : C.border,
                backgroundColor: on ? C.purple50 : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 10,
              }}
            >
              <Icon size={26} color={on ? C.purple : C.fg3} />
              <Text style={[s.body, { fontWeight: '600', textAlign: 'center', fontSize: 16 }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {method === 'NONE' ? <Sub>O orçamento vai sem a sua assinatura.</Sub> : null}

      {method === 'TYPED' ? (
        <>
          <Field
            label="Seu nome"
            value={typed}
            onChange={(v) => setTyped(v.slice(0, 60))}
            placeholder="Nome e sobrenome"
          />
          <Text style={s.muted}>Assim o nome aparece no documento.</Text>
          <Card style={{ overflow: 'hidden' }}>
            <Svg
              ref={typedRef}
              width="100%"
              height={120}
              viewBox="0 0 720 180"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <SvgText
                x={28}
                y={112}
                fontSize={64}
                fontStyle="italic"
                fontFamily="serif"
                fill={C.ink}
              >
                {typed.trim() || ' '}
              </SvgText>
            </Svg>
          </Card>
        </>
      ) : null}

      {method === 'DRAWN' ? <DrawPad svgRef={drawnRef} paths={paths} setPaths={setPaths} /> : null}

      {method === 'PHOTO' ? (
        <>
          {photo ? (
            <Card style={{ height: 160, padding: 6 }}>
              <Image
                source={{ uri: photo }}
                style={{ flex: 1 }}
                resizeMode="contain"
                accessibilityLabel="Foto da assinatura"
              />
            </Card>
          ) : (
            <Sub>Assine num papel branco e tire uma foto bem de perto.</Sub>
          )}
          <Btn tone="soft" icon={Camera} onPress={() => void pickPhoto(true)}>
            Tirar foto
          </Btn>
          <Btn tone="outline" icon={ImageIcon} height={56} onPress={() => void pickPhoto(false)}>
            Escolher da galeria
          </Btn>
        </>
      ) : null}

      {method !== 'NONE' && !standalone ? (
        <Toggle
          on={save}
          onChange={setSave}
          label="Salvar para usar nas próximas vezes"
          sub={save ? 'Fica guardada no seu perfil.' : 'Vai só neste orçamento.'}
        />
      ) : null}
    </Page>
  );
}

function DrawPad({
  svgRef,
  paths,
  setPaths,
}: {
  svgRef: React.RefObject<Svg | null>;
  paths: string[];
  setPaths: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [current, setCurrent] = useState('');
  const cur = useRef('');
  const finish = useCallback(() => {
    if (cur.current) setPaths((p) => [...p, cur.current]);
    cur.current = '';
    setCurrent('');
  }, [setPaths]);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
          setCurrent(cur.current);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
          setCurrent(cur.current);
        },
        onPanResponderRelease: finish,
        onPanResponderTerminate: finish,
      }),
    [finish],
  );
  return (
    <View style={{ gap: 8 }}>
      <View
        {...responder.panHandlers}
        style={{
          height: 220,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: C.borderStrong,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
        accessibilityLabel="Área de assinatura"
      >
        <Svg ref={svgRef} width="100%" height="100%" style={{ backgroundColor: '#FFFFFF' }}>
          {[...paths, current].filter(Boolean).map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={C.ink}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        {!paths.length && !current ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={[s.muted, { color: '#94A3B8' }]}>Use o dedo para assinar</Text>
          </View>
        ) : null}
      </View>
      <Btn tone="link" disabled={!paths.length} onPress={() => setPaths([])}>
        Limpar assinatura
      </Btn>
    </View>
  );
}

// ── Pronto ────────────────────────────────────────────────────────────
export function QuoteDoneScreen({
  navigation,
  route,
}: NativeStackScreenProps<EasyStackParamList, 'QuoteDone'>) {
  const { id, number, total, name, phone, url, docTitle = 'ORCAMENTO' } = route.params;
  const docName = QUOTE_DOC_TITLES[docTitle];
  const fem = isFeminineDocTitle(docTitle);
  const pdf = async () => {
    try {
      await shareQuotePdf(id, number);
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível preparar o PDF.'));
    }
  };
  return (
    <Page
      bar={
        <>
          <Btn icon={MessageCircle} onPress={() => void openWhatsApp(phone, url, `#${number}`)}>
            Enviar no WhatsApp
          </Btn>
          <Btn tone="outline" icon={Download} height={56} onPress={() => void pdf()}>
            Baixar ou compartilhar PDF
          </Btn>
          <Btn tone="link" onPress={() => void Share.share({ message: url })}>
            Compartilhar link de aprovação
          </Btn>
          <Btn
            tone="link"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'EasyTabs', params: { screen: 'Orcamentos' } }],
              })
            }
          >
            Ver orçamentos
          </Btn>
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 24 }}>
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
        <H1>{`Pronto! ${docName} ${fem ? 'concluída' : 'concluído'}`}</H1>
        <Text style={[s.body, { textAlign: 'center', color: C.fg2 }]}>
          Ficou registrado. Agora mande para {name}: quando aprovar, aparece em Orçamentos.
        </Text>
      </View>
      <Card style={{ padding: 16, gap: 8 }}>
        <Text style={[s.body, { fontWeight: '600' }]}>
          {docName} #{number}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{formatMoney(total)}</Text>
      </Card>
    </Page>
  );
}
