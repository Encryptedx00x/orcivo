// Configurações do Modo fácil (app): mirrors apps/web/app/facil/screens/Settings.tsx.
import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  Building2,
  Check,
  FileText,
  Image as ImageIcon,
  Package,
  PenLine,
  QrCode,
  Trash2,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react-native';
import { formatMoney, maskCpfCnpj, maskPhone, onlyDigits } from '@orcivo/shared-types';
import { easy, errorText, type ApprovalMethod } from '../data';
import { useEasyMode } from '../EasyModeContext';
import {
  Btn,
  C,
  Card,
  ErrorBox,
  Field,
  H1,
  Loading,
  Options,
  Page,
  Row,
  Sub,
  Toggle,
  s,
  useLoad,
} from '../ui';

type Params = {
  Settings: undefined;
  Approvals: undefined;
  Edit: { kind: string; id?: string; name?: string; price?: string; amount?: string; due?: string };
  QuoteSign: { standalone?: boolean } | undefined;
  Catalog: undefined;
  Equipe: undefined;
  Conta: undefined;
};
type Nav = NativeStackNavigationProp<Params>;

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

export const DEFAULT_TERMS =
  'Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.';

export function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const { setEasy } = useEasyMode();
  const company = useLoad(easy.company, 'Não foi possível carregar as configurações.');
  const sig = useLoad(easy.signature, 'Não foi possível carregar sua assinatura.');
  const c = company.data;
  return (
    <Page>
      <H1>Configurações</H1>
      <Card style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
        <Toggle
          on
          onChange={(on) => !on && setEasy(false)}
          label="Modo fácil"
          sub="Ligado neste aparelho"
        />
        <Text style={s.muted}>
          O mesmo botão fica em Mais › Modo fácil no modo completo. Você pode trocar quando quiser;
          nada se perde.
        </Text>
      </Card>
      {company.error ? <ErrorBox message={company.error} onRetry={company.refresh} /> : null}
      {!c && !company.error ? <Loading /> : null}
      {c ? (
        <Card style={{ overflow: 'hidden' }}>
          <Row
            icon={Building2}
            label="Minha empresa"
            sub="Nome, CPF ou CNPJ, telefone, cidade"
            onPress={() => nav.navigate('Edit', { kind: 'company' })}
          />
          <Row
            icon={ImageIcon}
            label="Logo"
            sub="Aparece no topo dos PDFs"
            onPress={() => nav.navigate('Edit', { kind: 'logo' })}
          />
          <Row
            icon={QrCode}
            label="Chave Pix"
            sub={c.pix_key ?? 'Vai nos orçamentos e recibos'}
            onPress={() => nav.navigate('Edit', { kind: 'pix' })}
          />
          <Row
            icon={UserCheck}
            label="Como o cliente aprova"
            sub={approvalsSummary(c.allowed_approval_methods ?? ['APPROVE_BUTTON'])}
            onPress={() => nav.navigate('Approvals')}
          />
          <Row
            icon={PenLine}
            label="Minha assinatura"
            sub={sig.data?.signature_url ? 'Assinatura salva' : 'Nenhuma salva'}
            onPress={() => nav.navigate('QuoteSign', { standalone: true })}
          />
          <Row
            icon={FileText}
            label="Condições padrão"
            sub="Texto e validade dos orçamentos"
            onPress={() => nav.navigate('Edit', { kind: 'terms' })}
          />
          <Row
            icon={Package}
            label="Meus serviços e preços"
            onPress={() => nav.navigate('Catalog')}
          />
          <Row
            icon={Users}
            label="Equipe"
            sub="Membros e convites"
            onPress={() => nav.navigate('Equipe')}
          />
          <Row
            icon={UserRound}
            label="Minha conta"
            sub="Nome, e-mail e senha"
            onPress={() => nav.navigate('Conta')}
          />
        </Card>
      ) : null}
    </Page>
  );
}

/** Check list of approval methods; used by the easy and the full mode. */
export function ApprovalMethodsPicker() {
  const methods = useLoad(
    easy.approvalMethods,
    'Não foi possível carregar as formas de aprovação.',
  );
  const on = methods.data ?? [];
  const toggle = async (k: ApprovalMethod) => {
    const next = on.includes(k) ? on.filter((m) => m !== k) : [...on, k];
    if (!next.length) return Alert.alert('Atenção', 'Pelo menos uma forma fica ligada.');
    const prev = on;
    methods.setData(next);
    try {
      await easy.setApprovalMethods(next);
    } catch (err) {
      methods.setData(prev);
      Alert.alert(
        'Não deu certo',
        errorText(err, 'Não foi possível salvar as formas de aprovação.'),
      );
    }
  };
  if (methods.error) return <ErrorBox message={methods.error} onRetry={methods.refresh} />;
  if (!methods.data) return <Loading />;
  return (
    <View style={{ gap: 10 }}>
      {APPROVALS.map((a) => {
        const isOn = on.includes(a.k);
        return (
          <Pressable
            key={a.k}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isOn }}
            onPress={() => void toggle(a.k)}
            style={{
              minHeight: 72,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: isOn ? C.purple : C.border,
              backgroundColor: isOn ? C.purple50 : '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: isOn ? C.purple : '#94A3B8',
                backgroundColor: isOn ? C.purple : '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isOn ? <Check size={18} color="#FFFFFF" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.body, { fontWeight: '600' }]}>{a.label}</Text>
              <Text style={s.muted}>
                {a.sub}
                {isOn && on.length === 1 ? ' · única ligada' : ''}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ApprovalsScreen() {
  return (
    <Page>
      <View style={{ gap: 4 }}>
        <H1 size={30}>Como o cliente aprova</H1>
        <Sub>
          O cliente escolhe no link do WhatsApp entre as formas ligadas. Vale para todos os
          orçamentos. Pelo menos uma fica ligada.
        </Sub>
      </View>
      <ApprovalMethodsPicker />
    </Page>
  );
}

// ── Editar (genérico) ─────────────────────────────────────────────────
export function EditScreen() {
  const { params } = useRoute<RouteProp<Params, 'Edit'>>();
  switch (params.kind) {
    case 'company':
      return <CompanyEdit />;
    case 'pix':
      return <PixEdit />;
    case 'terms':
      return <TermsEdit />;
    case 'logo':
      return <LogoEdit />;
    case 'payment':
      return <PaymentEdit />;
    default:
      return (
        <Page>
          <ErrorBox message="Nada para editar aqui." />
        </Page>
      );
  }
}

function useSave() {
  const nav = useNavigation<Nav>();
  const [busy, setBusy] = useState(false);
  const save = async (fn: () => Promise<unknown>, ok: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      Alert.alert('Pronto', ok);
      nav.goBack();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível salvar. Confira os campos.'));
    } finally {
      setBusy(false);
    }
  };
  return { busy, save };
}

function CompanyEdit() {
  const company = useLoad(easy.company, 'Não foi possível carregar a empresa.');
  const { busy, save } = useSave();
  const [f, setF] = useState<Record<string, string> | null>(null);
  const c = company.data;
  if (c && !f)
    setF({
      trade_name: c.trade_name ?? '',
      document: c.document ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
    });
  if (!f)
    return (
      <Page>
        {company.error ? (
          <ErrorBox message={company.error} onRetry={company.refresh} />
        ) : (
          <Loading />
        )}
      </Page>
    );
  const set = (k: string) => (v: string) =>
    setF((x) => ({ ...(x as Record<string, string>), [k]: v }));
  const doc = f.document.replace(/\D/g, '');
  const docOk = !doc || doc.length === 11 || doc.length === 14;
  const ok = f.trade_name.trim().length >= 2 && docOk && (!f.state || f.state.length === 2);
  return (
    <Page
      bar={
        <>
          {!docOk ? (
            <Text style={[s.muted, { textAlign: 'center' }]}>CPF tem 11 números e CNPJ tem 14</Text>
          ) : null}
          <Btn
            disabled={!ok}
            busy={busy}
            onPress={() =>
              void save(
                () =>
                  easy.updateCompany({
                    trade_name: f.trade_name.trim(),
                    document: doc || null,
                    document_type: doc ? (doc.length === 11 ? 'CPF' : 'CNPJ') : null,
                    phone: f.phone.replace(/\D/g, '') || null,
                    address: f.address.trim() || null,
                    city: f.city.trim() || null,
                    state: f.state.trim() || null,
                  }),
                'Dados da empresa salvos.',
              )
            }
          >
            Salvar
          </Btn>
        </>
      }
    >
      <H1 size={30}>Minha empresa</H1>
      <Sub>Aparece nos PDFs de orçamentos, serviços e recibos.</Sub>
      <Field label="Nome da empresa" value={f.trade_name} onChange={set('trade_name')} />
      <Field
        label="CPF ou CNPJ"
        value={maskCpfCnpj(f.document)}
        onChange={(v) => set('document')(onlyDigits(v).slice(0, 14))}
        keyboard="number-pad"
        placeholder="Opcional"
      />
      <Field
        label="Telefone"
        value={maskPhone(f.phone)}
        onChange={(v) => set('phone')(onlyDigits(v).slice(0, 11))}
        keyboard="phone-pad"
        placeholder="(00) 00000-0000"
      />
      <Field
        label="Endereço"
        value={f.address}
        onChange={(v) => set('address')(v.slice(0, 200))}
        placeholder="Rua, número e bairro"
      />
      <Field label="Cidade" value={f.city} onChange={set('city')} placeholder="Ex.: Campinas" />
      <Field
        label="Estado (UF)"
        value={f.state}
        onChange={(v) => set('state')(v.toUpperCase().slice(0, 2))}
        placeholder="SP"
      />
    </Page>
  );
}

const PIX_TYPES = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Aleatória' },
];

const PIX_EXAMPLE: Record<string, string> = {
  CPF: '000.000.000-00',
  CNPJ: '00.000.000/0000-00',
  EMAIL: 'voce@email.com',
  PHONE: '(00) 00000-0000',
  RANDOM: 'Cole a chave aleatória do banco',
};
const pixShown = (type: string, key: string) =>
  type === 'CPF' || type === 'CNPJ' ? maskCpfCnpj(key) : type === 'PHONE' ? maskPhone(key) : key;
function pixValid(type: string, key: string): boolean {
  const d = onlyDigits(key);
  if (type === 'CPF') return d.length === 11;
  if (type === 'CNPJ') return d.length === 14;
  if (type === 'PHONE') return d.length === 10 || d.length === 11;
  if (type === 'EMAIL') return /^\S+@\S+\.\S+$/.test(key.trim());
  return key.trim().length >= 32; // random key (EVP)
}

function PixEdit() {
  const company = useLoad(easy.company, 'Não foi possível carregar a empresa.');
  const { busy, save } = useSave();
  const [type, setType] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const c = company.data;
  if (c && key === null) {
    const k = c.pix_key ?? '';
    const d = k.replace(/\D/g, '');
    setKey(k);
    setType(
      !k
        ? 'CNPJ'
        : k.includes('@')
          ? 'EMAIL'
          : /^[0-9a-f-]{36}$/i.test(k)
            ? 'RANDOM'
            : d.length === 14
              ? 'CNPJ'
              : d.length === 11 && !/[()\s-]/.test(k)
                ? 'CPF'
                : 'PHONE',
    );
  }
  if (key === null || type === null)
    return (
      <Page>
        {company.error ? (
          <ErrorBox message={company.error} onRetry={company.refresh} />
        ) : (
          <Loading />
        )}
      </Page>
    );
  return (
    <Page
      bar={
        <Btn
          disabled={!pixValid(type, key)}
          busy={busy}
          onPress={() =>
            void save(
              () =>
                easy.updateCompany({
                  pix_key_type: type,
                  pix_key:
                    type === 'EMAIL' || type === 'RANDOM' ? key.trim() : key.replace(/\D/g, ''),
                }),
              'Chave Pix salva.',
            )
          }
        >
          Salvar
        </Btn>
      }
    >
      <H1 size={30}>Chave Pix</H1>
      <Sub>Aparece nos orçamentos e recibos para o cliente pagar.</Sub>
      <Text style={[s.body, { fontWeight: '600' }]}>Tipo de chave</Text>
      <Options cols={3} options={PIX_TYPES} value={type} onPick={setType} />
      <Field
        label="Chave"
        value={pixShown(type, key)}
        onChange={(v) => setKey(type === 'EMAIL' || type === 'RANDOM' ? v : onlyDigits(v))}
        placeholder={PIX_EXAMPLE[type]}
        keyboard={
          type === 'EMAIL' || type === 'RANDOM'
            ? 'default'
            : type === 'PHONE'
              ? 'phone-pad'
              : 'number-pad'
        }
      />
      {key.trim() && !pixValid(type, key) ? (
        <Text style={[s.body, { color: C.red }]}>Confira a chave: {PIX_EXAMPLE[type]}</Text>
      ) : null}
    </Page>
  );
}

function TermsEdit() {
  const company = useLoad(easy.company, 'Não foi possível carregar a empresa.');
  const { busy, save } = useSave();
  const [terms, setTerms] = useState<string | null>(null);
  const [days, setDays] = useState(15);
  const [prices, setPrices] = useState<'ITEMS' | 'TOTAL' | 'NONE'>('ITEMS');
  const c = company.data;
  if (c && terms === null) {
    setTerms(c.quote_default_terms ?? DEFAULT_TERMS);
    setDays(c.quote_default_validity_days ?? 15);
    setPrices(c.quote_default_price_display ?? 'ITEMS');
  }
  if (terms === null)
    return (
      <Page>
        {company.error ? (
          <ErrorBox message={company.error} onRetry={company.refresh} />
        ) : (
          <Loading />
        )}
      </Page>
    );
  return (
    <Page
      bar={
        <Btn
          busy={busy}
          onPress={() =>
            void save(
              () =>
                easy.updateCompany({
                  quote_default_terms: terms.trim() || null,
                  quote_default_validity_days: days,
                  quote_default_price_display: prices,
                }),
              'Condições salvas.',
            )
          }
        >
          Salvar
        </Btn>
      }
    >
      <H1 size={30}>Condições padrão</H1>
      <Sub>Entram em todo orçamento novo. Dá para mudar em cada um.</Sub>
      <Field
        label="Condições"
        value={terms}
        onChange={(v) => setTerms(v.slice(0, 2000))}
        multiline
      />
      <Text style={[s.body, { fontWeight: '600' }]}>Validade padrão</Text>
      <Options
        value={days}
        onPick={setDays}
        options={[
          { value: 7, label: '7 dias' },
          { value: 15, label: '15 dias' },
          { value: 30, label: '30 dias' },
        ]}
      />
      <Text style={[s.body, { fontWeight: '600' }]}>O que o cliente vê dos preços</Text>
      <Options
        cols={3}
        value={prices}
        onPick={setPrices}
        options={[
          { value: 'ITEMS' as const, label: 'Cada item' },
          { value: 'TOTAL' as const, label: 'Só o total' },
          { value: 'NONE' as const, label: 'Sem preços' },
        ]}
      />
      <Text style={s.muted}>Dá para mudar em cada orçamento, em Mais opções.</Text>
    </Page>
  );
}

/** Logo upload (camera or gallery) — also used by the full-mode Configurações. */
export function LogoPicker({ large = true }: { large?: boolean }) {
  const company = useLoad(easy.company, 'Não foi possível carregar a empresa.');
  const [busy, setBusy] = useState(false);
  const pick = useCallback(
    async (camera: boolean) => {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted')
        return Alert.alert('Permissão negada', 'Libere o acesso nas configurações do celular.');
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      };
      const r = camera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets[0]) return;
      setBusy(true);
      try {
        company.setData(await easy.uploadLogo(r.assets[0].uri));
        Alert.alert('Pronto', 'Logo atualizado. Ele aparece nos próximos PDFs.');
      } catch (err) {
        Alert.alert(
          'Não deu certo',
          errorText(err, 'Não foi possível enviar o logo. Use uma foto ou PNG até 2 MB.'),
        );
      } finally {
        setBusy(false);
      }
    },
    [company],
  );
  const remove = async () => {
    setBusy(true);
    try {
      company.setData(await easy.removeLogo());
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível tirar o logo.'));
    } finally {
      setBusy(false);
    }
  };
  if (company.error) return <ErrorBox message={company.error} onRetry={company.refresh} />;
  if (!company.data) return <Loading />;
  const url = company.data.logo_url;
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: url ? '#FFFFFF' : C.purple50,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ width: 110, height: 110 }}
            resizeMode="contain"
            accessibilityLabel="Logo da empresa"
          />
        ) : (
          <ImageIcon size={36} color={C.purple} />
        )}
      </View>
      <Btn
        tone="soft"
        icon={ImageIcon}
        busy={busy}
        height={large ? 60 : 48}
        onPress={() => void pick(false)}
      >
        {url ? 'Trocar logo (galeria)' : 'Escolher da galeria'}
      </Btn>
      <Btn tone="outline" height={large ? 56 : 48} disabled={busy} onPress={() => void pick(true)}>
        Tirar foto do logo
      </Btn>
      {url ? (
        <Btn
          tone="danger"
          icon={Trash2}
          height={large ? 56 : 48}
          disabled={busy}
          onPress={() => void remove()}
        >
          Tirar o logo
        </Btn>
      ) : null}
    </View>
  );
}

function LogoEdit() {
  return (
    <Page>
      <H1 size={30}>Logo</H1>
      <Sub>Aparece no topo dos orçamentos, serviços e recibos.</Sub>
      <LogoPicker />
    </Page>
  );
}

function PaymentEdit() {
  const { params } = useRoute<RouteProp<Params, 'Edit'>>();
  const { busy, save } = useSave();
  const toDigits = (v?: string) => {
    if (!v) return '';
    const [a, b = ''] = v.split('.');
    return `${a}${b.padEnd(2, '0').slice(0, 2)}`.replace(/^0+/, '');
  };
  const [digits, setDigits] = useState(toDigits(params.amount));
  const [dueDays, setDueDays] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const n = digits.replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  const amount = `${padded.slice(0, -2)}.${padded.slice(-2)}`;
  const ok = Number(amount) > 0 && reason.trim().length >= 3;
  const currentDue = params.due
    ? new Date(params.due).toLocaleDateString('pt-BR')
    : 'sem vencimento';
  return (
    <Page
      bar={
        <>
          {reason.trim().length < 3 ? (
            <Text style={[s.muted, { textAlign: 'center' }]}>
              Conte em poucas palavras por que mudou
            </Text>
          ) : null}
          <Btn
            disabled={!ok}
            busy={busy}
            onPress={() => {
              let due: string | undefined;
              if (dueDays !== null) {
                const d = new Date();
                d.setHours(12, 0, 0, 0);
                d.setDate(d.getDate() + dueDays);
                due = d.toISOString();
              }
              void save(
                () =>
                  easy.updatePayment(params.id as string, {
                    amount,
                    ...(due ? { due_date: due } : {}),
                    justification: reason.trim(),
                  }),
                'Recebimento atualizado.',
              );
            }}
          >
            Salvar
          </Btn>
        </>
      }
    >
      <H1 size={30}>Mudar recebimento</H1>
      <Sub>{params.name ?? ''}</Sub>
      <Field
        label="Valor"
        value={digits ? formatMoney(amount) : ''}
        onChange={(v) => setDigits(v.replace(/\D/g, '').slice(0, 10))}
        keyboard="number-pad"
        big
      />
      <Text style={[s.body, { fontWeight: '600' }]}>Novo vencimento (hoje: {currentDue})</Text>
      <Options
        value={dueDays}
        onPick={setDueDays}
        options={[
          { value: 0, label: 'Hoje' },
          { value: 7, label: 'Em 7 dias' },
          { value: 15, label: 'Em 15 dias' },
          { value: 30, label: 'Em 30 dias' },
        ]}
        cols={2}
      />
      <Field
        label="Por que mudou?"
        value={reason}
        onChange={setReason}
        placeholder="Ex.: Cliente pediu mais prazo"
      />
    </Page>
  );
}
