import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { CheckCircle, Wallet } from 'lucide-react-native';
import { formatMoney, sumDecimal } from '@orcivo/shared-types';
import { easy, errorText, type EasyPayment } from '../data';
import { useEasyNav } from '../draft';
import {
  Btn,
  C,
  Card,
  Chip,
  EmptyBox,
  ErrorBox,
  Loading,
  Options,
  Page,
  SectionLabel,
  s,
  useLoad,
  type ChipKind,
} from '../ui';

const METHODS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
];
const methodLabel = (m: string | null) => METHODS.find((x) => x.value === m)?.label ?? '—';
const PAGE = 10;

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

export function MoneyScreen() {
  const nav = useEasyNav();
  const payments = useLoad(easy.payments, 'Não foi possível carregar o financeiro.');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const all = payments.data ?? [];
  const dues = all.filter(
    (p) => p.status === 'PENDING' || p.status === 'OVERDUE' || p.status === 'PARTIAL',
  );
  const now = new Date();
  const paidMonth = all.filter(
    (p) =>
      p.status === 'PAID' &&
      p.paid_at &&
      new Date(p.paid_at).getMonth() === now.getMonth() &&
      new Date(p.paid_at).getFullYear() === now.getFullYear(),
  );
  const paidToday = paidMonth.filter(
    (p) => new Date(p.paid_at as string).toDateString() === now.toDateString(),
  );
  const late = dues.filter((p) => dueChip(p).kind === 'late').length;
  const sum = (list: EasyPayment[]) =>
    list.length ? sumDecimal(list.map((p) => p.amount)) : '0.00';

  const settle = async (p: EasyPayment, method: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await easy.settlePayment(p.id, method);
      setOpen(null);
      Alert.alert('Pronto!', `${formatMoney(p.amount)} recebido.`);
      void payments.refresh();
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível registrar o pagamento.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      {payments.error ? <ErrorBox message={payments.error} onRetry={payments.refresh} /> : null}
      {!payments.data && !payments.error ? <Loading /> : null}
      {payments.data ? (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 16, gap: 4 }}>
              <Text style={[s.body, { fontWeight: '700' }]}>Recebido</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.green }}>
                {formatMoney(sum(paidMonth))}
              </Text>
              <Text style={s.muted}>neste mês</Text>
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

          <SectionLabel>Para receber</SectionLabel>
          {!dues.length ? <EmptyBox>Nada para receber agora.</EmptyBox> : null}
          {dues.slice(0, limit).map((p) => {
            const chip = dueChip(p);
            return (
              <Card key={p.id} style={{ padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: '600' }]}>
                      {p.customer?.name ?? 'Cliente'}
                    </Text>
                    <Text style={s.muted}>{p.description || 'Recebimento'}</Text>
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
                      options={METHODS}
                      value={null}
                      onPick={(m) => void settle(p, m)}
                    />
                    <Btn tone="link" onPress={() => setOpen(null)}>
                      Cancelar
                    </Btn>
                  </View>
                ) : (
                  <Btn icon={CheckCircle} height={56} onPress={() => setOpen(p.id)}>
                    Marcar como pago
                  </Btn>
                )}
              </Card>
            );
          })}
          {dues.length > limit ? (
            <Btn tone="link" onPress={() => setLimit((l) => l + PAGE)}>
              Ver mais {Math.min(PAGE, dues.length - limit)} de {dues.length - limit}
            </Btn>
          ) : null}

          {paidToday.length ? (
            <>
              <SectionLabel>Recebidos hoje</SectionLabel>
              {paidToday.map((p) => (
                <Card
                  key={p.id}
                  style={{
                    padding: 14,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontWeight: '600' }]}>
                      {p.customer?.name ?? 'Cliente'}
                    </Text>
                    <Text style={s.muted}>{methodLabel(p.method)}</Text>
                  </View>
                  <Text style={[s.body, { fontWeight: '700', color: C.green }]}>
                    {formatMoney(p.amount)}
                  </Text>
                </Card>
              ))}
            </>
          ) : null}

          <Btn tone="outline" icon={Wallet} height={60} onPress={() => nav.navigate('Financeiro')}>
            Mais opções (avulso, editar, período)
          </Btn>
        </>
      ) : null}
    </Page>
  );
}
