import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react-native';
import { formatMoney, sumDecimal } from '@orcivo/shared-types';
import { easy, errorText, methodLabel, RECEIPT_METHODS, type EasyPayment } from '../data';
import { useEasyNav } from '../draft';
import { reasonSheet, useSheet } from '../sheet';
import {
  Btn,
  C,
  Card,
  Chip,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  Options,
  Page,
  SectionLabel,
  s,
  useLoad,
  type ChipKind,
} from '../ui';

const PAGE = 10;
const PERIODS = [
  { value: 'month', label: 'Este mês' },
  { value: 'last', label: 'Mês passado' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este ano' },
];

function inPeriod(iso: string, period: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  if (period === 'month')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'last') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
  }
  if (period === '3m') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return d.getFullYear() === now.getFullYear();
}

function dueChip(p: EasyPayment): { kind: ChipKind; label: string } {
  if (!p.due_date) return { kind: 'draft', label: 'Sem vencimento' };
  const due = new Date(p.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - today.getTime()) /
      86_400_000,
  );
  if (p.status === 'OVERDUE' || days < 0)
    return {
      kind: 'late',
      label: `Atrasado há ${Math.max(1, -days)} ${-days === 1 ? 'dia' : 'dias'}`,
    };
  if (days === 0) return { kind: 'wait', label: 'Vence hoje' };
  if (days === 1) return { kind: 'wait', label: 'Vence amanhã' };
  return {
    kind: 'draft',
    label: `Vence ${due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
  };
}
const ref = (p: EasyPayment) =>
  p.work_order
    ? `Serviço #${p.work_order.number}`
    : p.quote
      ? `Orçamento #${p.quote.number}`
      : p.description || 'Recebimento';

export function MoneyScreen() {
  const nav = useEasyNav();
  const sheet = useSheet();
  const payments = useLoad(easy.payments, 'Não foi possível carregar o financeiro.');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [paidLimit, setPaidLimit] = useState(PAGE);
  const [period, setPeriod] = useState('month');
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'Este mês';

  const all = payments.data ?? [];
  const dues = all.filter(
    (p) => p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'PARTIAL',
  );
  const paid = all
    .filter((p) => p.status === 'PAID' && p.paid_at && inPeriod(p.paid_at, period))
    .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''));
  const late = dues.filter((p) => dueChip(p).kind === 'late').length;
  const sum = (list: EasyPayment[]) =>
    list.length ? sumDecimal(list.map((p) => p.amount)) : '0.00';

  const settle = async (p: EasyPayment, method: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await easy.settlePayment(p.id, method);
      setOpen(null);
      Alert.alert('Pronto!', `${formatMoney(p.amount)} recebido. O recibo já está em Recibos.`);
      void payments.refresh();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível registrar o pagamento.'));
    } finally {
      setBusy(false);
    }
  };

  const charge = async (p: EasyPayment) => {
    if (!p.customer) return Alert.alert('Atenção', 'Este recebimento não tem cliente.');
    try {
      const [client, company] = await Promise.all([easy.client(p.customer.id), easy.company()]);
      const digits = (client.phone ?? '').replace(/\D/g, '');
      if (!digits) return Alert.alert('Atenção', 'Este cliente não tem telefone.');
      const due = p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : null;
      const isLate = dueChip(p).kind === 'late';
      const text =
        `Olá, ${p.customer.name.split(' ')[0]}! Passando para lembrar do pagamento de ${formatMoney(p.amount)}` +
        (due ? (isLate ? `, que venceu em ${due}.` : `, com vencimento em ${due}.`) : '.') +
        (company.pix_key ? `\nChave Pix: ${company.pix_key}` : '');
      await Linking.openURL(
        `https://wa.me/55${digits.replace(/^55(?=\d{10,11}$)/, '')}?text=${encodeURIComponent(text)}`,
      );
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível abrir o WhatsApp.'));
    }
  };

  const remove = (p: EasyPayment) =>
    reasonSheet(
      sheet,
      'Por que excluir?',
      ['Lançado errado', 'Cliente desistiu', 'Valor duplicado', 'Outro motivo'],
      async (reason) => {
        try {
          await easy.deletePayment(p.id, reason);
          Alert.alert('Pronto', `Recebimento excluído: ${reason.toLowerCase()}.`);
          void payments.refresh();
        } catch (err) {
          Alert.alert('Não deu certo', errorText(err, 'Não foi possível excluir o recebimento.'));
        }
      },
      Trash2,
    );

  return (
    <Page>
      <H1>Financeiro</H1>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn
          icon={Plus}
          height={56}
          style={{ flex: 1, width: undefined }}
          onPress={() =>
            sheet({
              title: 'Registrar recebimento',
              sub: 'Gera o recibo junto',
              actions: [
                {
                  label: 'De um orçamento ou serviço',
                  icon: FileText,
                  run: () => nav.navigate('ReceiptNew', { link: true }),
                },
                {
                  label: 'Avulso',
                  sub: 'Sem orçamento nem serviço',
                  icon: Plus,
                  run: () => nav.navigate('ReceiptNew'),
                },
                {
                  label: 'Cobrança para receber depois',
                  sub: 'Com vencimento, sem recibo ainda',
                  icon: Clock,
                  run: () => nav.navigate('Financeiro'),
                },
              ],
            })
          }
        >
          Registrar
        </Btn>
        <Btn
          tone="outline"
          icon={Calendar}
          height={56}
          style={{ flex: 1, width: undefined }}
          onPress={() =>
            sheet({
              title: 'Ver qual período?',
              sub: 'Muda o recebido e a lista de recebidos',
              actions: PERIODS.map((pp) => ({
                label: pp.value === period ? `${pp.label} · atual` : pp.label,
                icon: pp.value === period ? CheckCircle : Calendar,
                run: () => {
                  setPeriod(pp.value);
                  setPaidLimit(PAGE);
                },
              })),
            })
          }
        >
          {periodLabel}
        </Btn>
      </View>

      {payments.error ? <ErrorBox message={payments.error} onRetry={payments.refresh} /> : null}
      {!payments.data && !payments.error ? <Loading /> : null}
      {payments.data ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 16, gap: 4 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>Recebido</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>
                {formatMoney(sum(paid))}
              </Text>
              <Text style={s.muted}>{periodLabel.toLowerCase()}</Text>
            </Card>
            <Card style={{ flex: 1, padding: 16, gap: 4 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>A receber</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>
                {formatMoney(sum(dues))}
              </Text>
              {late ? (
                <Chip kind="late" label={`${late} ${late > 1 ? 'atrasados' : 'atrasado'}`} />
              ) : (
                <Text style={s.muted}>em dia</Text>
              )}
            </Card>
          </View>

          {!dues.length && !paid.length ? (
            <EmptyBox>
              Nada por aqui neste período. Toque em Registrar para lançar um pagamento.
            </EmptyBox>
          ) : null}

          {dues.length ? <SectionLabel>A receber</SectionLabel> : null}
          {dues.slice(0, limit).map((p) => {
            const chip = dueChip(p);
            return (
              <Card key={p.id} style={{ padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: '600' }]}>
                      {p.customer?.name ?? 'Cliente'}
                    </Text>
                    <Text style={s.muted}>{ref(p)}</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>
                    {formatMoney(p.amount)}
                  </Text>
                </View>
                <Chip kind={chip.kind} label={chip.label} />
                {open === p.id ? (
                  <View style={{ gap: 10 }}>
                    <Text style={[s.body, { fontWeight: '700' }]}>Como recebeu?</Text>
                    <Options
                      cols={2}
                      options={RECEIPT_METHODS}
                      value={null}
                      onPick={(m) => void settle(p, m)}
                    />
                    <Btn tone="link" onPress={() => setOpen(null)}>
                      Fechar
                    </Btn>
                  </View>
                ) : (
                  <Btn tone="soft" icon={CheckCircle} height={56} onPress={() => setOpen(p.id)}>
                    Marcar como pago
                  </Btn>
                )}
                <Btn
                  tone="link"
                  icon={MoreHorizontal}
                  onPress={() =>
                    sheet({
                      title: p.customer?.name ?? 'Recebimento',
                      sub: formatMoney(p.amount),
                      actions: [
                        {
                          label: 'Cobrar no WhatsApp',
                          icon: MessageCircle,
                          run: () => void charge(p),
                        },
                        {
                          label: 'Mudar valor ou vencimento',
                          icon: Pencil,
                          run: () =>
                            nav.navigate('Edit', {
                              kind: 'payment',
                              id: p.id,
                              amount: p.amount,
                              due: p.due_date ?? undefined,
                              name: p.customer?.name,
                            }),
                        },
                        {
                          label: 'Excluir recebimento',
                          icon: Trash2,
                          danger: true,
                          run: () => remove(p),
                        },
                      ],
                    })
                  }
                >
                  Mais ações
                </Btn>
              </Card>
            );
          })}
          {dues.length > limit ? (
            <Btn tone="link" onPress={() => setLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, dues.length - limit)} de {dues.length - limit}
            </Btn>
          ) : null}

          {paid.length ? (
            <SectionLabel>Recebidos · {periodLabel.toLowerCase()}</SectionLabel>
          ) : null}
          {paid.length ? (
            <Card style={{ paddingHorizontal: 16 }}>
              {paid.slice(0, paidLimit).map((p, i, arr) => (
                <View
                  key={p.id}
                  style={{
                    minHeight: 68,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                    borderColor: C.line,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: '600' }]}>
                      {p.customer?.name ?? 'Cliente'}
                    </Text>
                    <Text style={s.muted}>
                      {formatMoney(p.amount)} · {methodLabel(p.method)} ·{' '}
                      {new Date(p.paid_at as string).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Recibo de ${p.customer?.name ?? 'cliente'}`}
                    onPress={() => nav.navigate('Receipt', { id: p.id })}
                    style={{
                      minHeight: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 4,
                    }}
                  >
                    <ReceiptText size={20} color={C.purple700} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: C.purple700 }}>
                      Recibo
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : null}
          {paid.length > paidLimit ? (
            <Btn tone="link" onPress={() => setPaidLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, paid.length - paidLimit)} de {paid.length - paidLimit}
            </Btn>
          ) : null}

          <Btn tone="link" icon={ChevronRight} onPress={() => nav.navigate('Financeiro')}>
            Financeiro completo (tabela e histórico)
          </Btn>
        </>
      ) : null}
    </Page>
  );
}
