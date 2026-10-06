import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { easy, errorText } from '../../easy/data';
import { reasonSheet, useSheet } from '../../easy/sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  CircleDollarSign,
  MoreHorizontal,
  Pencil,
  Receipt,
  ReceiptText,
  Trash2,
  X,
} from 'lucide-react-native';
import { formatMoney, parseMoneyInput, sumDecimal } from '@orcivo/shared-types';
import { newIdempotencyKey } from '../../services/api';
import { paymentService } from '../../services/payment.service';
import type {
  Payment,
  PaymentCreateInput,
  PaymentMethod,
  PaymentStatus,
} from '../../services/payment.service';
import { workOrderService } from '../../services/work-order.service';
import type { WorkOrder } from '../../services/work-order.service';
import { financeiroError } from './financeiro-errors';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Recebido', color: '#166534', bg: '#DCFCE7' },
  PENDING: { label: 'Pendente', color: '#92400E', bg: '#FEF3C7' },
  OVERDUE: { label: 'Vencido', color: '#991B1B', bg: '#FEE2E2' },
  PARTIAL: { label: 'Parcial', color: '#075985', bg: '#E0F2FE' },
  CANCELLED: { label: 'Cancelado', color: '#64748B', bg: '#F1F5F9' },
};

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CARTAO', label: 'Cartão' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'OUTRO', label: 'Outro' },
];
const METHOD_LABEL: Record<string, string> = Object.fromEntries(
  METHOD_OPTIONS.map((option) => [option.value, option.label]),
);

function ddmm(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toIsoDate(masked: string): string | undefined {
  const [dd, mm, yyyy] = masked.split('/');
  if (!dd || !mm || !yyyy || yyyy.length < 4) return undefined;
  return new Date(`${yyyy}-${mm}-${dd}T12:00:00`).toISOString();
}

function Button({
  label,
  busy = false,
  secondary = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton, busy && styles.disabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

type FormStatus = 'PENDING' | 'PAID';

const EMPTY_FORM = {
  amount: '',
  method: 'PIX' as PaymentMethod,
  status: 'PAID' as FormStatus,
  date: '',
};

type MoreNav = NativeStackNavigationProp<{
  Receipt: { id: string };
  Edit: { kind: string; id?: string; amount?: string; due?: string; name?: string };
}>;

export function FinanceiroScreen() {
  const navigation = useNavigation<MoreNav>();
  const sheet = useSheet();
  // Ver recibo (pagos), mudar valor/vencimento e excluir — the backend audits both with a reason.
  const openMore = (payment: Payment) =>
    sheet({
      title: payment.customer.name,
      sub: formatMoney(payment.amount),
      actions: [
        ...(payment.status === 'PAID'
          ? [
              {
                label: 'Ver recibo',
                icon: ReceiptText,
                run: () => navigation.navigate('Receipt', { id: payment.id }),
              },
            ]
          : []),
        {
          label: 'Mudar valor ou vencimento',
          icon: Pencil,
          run: () =>
            navigation.navigate('Edit', {
              kind: 'payment',
              id: payment.id,
              amount: payment.amount,
              due: payment.due_date ?? undefined,
              name: payment.customer.name,
            }),
        },
        {
          label: 'Excluir recebimento',
          icon: Trash2,
          danger: true,
          run: () =>
            reasonSheet(
              sheet,
              'Por que excluir?',
              ['Lançado errado', 'Cliente desistiu', 'Valor duplicado', 'Outro motivo'],
              async (reason) => {
                try {
                  await easy.deletePayment(payment.id, reason);
                  setPayments((prev) => prev.filter((p) => p.id !== payment.id));
                } catch (err) {
                  Alert.alert('Erro', errorText(err, 'Não foi possível excluir o recebimento.'));
                }
              },
              Trash2,
            ),
        },
      ],
    });
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [amount, setAmount] = useState(EMPTY_FORM.amount);
  const [method, setMethod] = useState<PaymentMethod>(EMPTY_FORM.method);
  const [status, setStatus] = useState<FormStatus>(EMPTY_FORM.status);
  const [date, setDate] = useState(EMPTY_FORM.date);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const submitLock = useRef(false);
  const request = useRef<{ body: string; key: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError('');
      Promise.all([paymentService.fetchAll(), workOrderService.fetchAll(1)])
        .then(([paymentsData, workOrdersRes]) => {
          if (!active) return;
          setPayments(paymentsData);
          setWorkOrders(workOrdersRes.data ?? []);
        })
        .catch((error: unknown) => {
          if (active) setLoadError(financeiroError(error, 'load'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [attempt]),
  );

  function resetForm() {
    setSelectedWorkOrder(null);
    setAmount(EMPTY_FORM.amount);
    setMethod(EMPTY_FORM.method);
    setStatus(EMPTY_FORM.status);
    setDate(EMPTY_FORM.date);
    setFormError('');
    setShowForm(false);
  }

  function selectWorkOrder(order: WorkOrder) {
    setSelectedWorkOrder(order);
    setShowPicker(false);
    setFormError('');
  }

  async function submit() {
    if (submitLock.current) return;
    if (!selectedWorkOrder) {
      setFormError('Selecione uma ordem de serviço.');
      return;
    }
    const decimalAmount = parseMoneyInput(amount);
    if (!decimalAmount) {
      setFormError('Informe um valor positivo com até duas casas decimais.');
      return;
    }
    submitLock.current = true;
    setBusy(true);
    setFormError('');
    setSuccessMsg('');
    try {
      const isoDate = toIsoDate(date);
      const dto: PaymentCreateInput = {
        customer_id: selectedWorkOrder.customer.id,
        work_order_id: selectedWorkOrder.id,
        description: `OS #${selectedWorkOrder.number} — ${selectedWorkOrder.title}`,
        amount: decimalAmount,
        method,
        status,
        ...(status === 'PAID' ? { paid_at: isoDate } : { due_date: isoDate }),
      };
      const body = JSON.stringify(dto);
      if (request.current?.body !== body) request.current = { body, key: newIdempotencyKey() };
      const created = await paymentService.create(dto, { idempotencyKey: request.current.key });
      request.current = null;
      setPayments((prev) => [created, ...prev]);
      resetForm();
      setSuccessMsg(`Recebimento de ${formatMoney(created.amount)} registrado.`);
    } catch (error: unknown) {
      setFormError(financeiroError(error, 'save'));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  async function settle(payment: Payment) {
    if (settlingId) return;
    setSettlingId(payment.id);
    try {
      const updated = await paymentService.settle(payment.id, {
        idempotencyKey: newIdempotencyKey(),
      });
      setPayments((prev) => prev.map((item) => (item.id === payment.id ? updated : item)));
    } catch (error: unknown) {
      Alert.alert('Erro', financeiroError(error, 'settle'));
    } finally {
      setSettlingId(null);
    }
  }

  const receivedTotal = formatMoney(
    sumDecimal(payments.filter((p) => p.status === 'PAID').map((p) => p.amount)),
  );
  const pendingTotal = formatMoney(
    sumDecimal(
      payments.filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL').map((p) => p.amount),
    ),
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando financeiro" color="#6D28D9" />
        <Text style={styles.description}>Carregando recebimentos…</Text>
      </View>
    );
  if (loadError)
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
        <Button label="Tentar novamente" onPress={() => setAttempt((value) => value + 1)} />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + (Platform.OS === 'ios' ? 44 : 56)}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}
      >
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Financeiro
          </Text>
          <Text style={styles.description}>Acompanhe e registre os recebimentos das OS.</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Recebido</Text>
              <Text style={styles.summaryValue}>{receivedTotal}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Pendente</Text>
              <Text style={styles.summaryValue}>{pendingTotal}</Text>
            </View>
          </View>
          {!!successMsg && (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              {successMsg}
            </Text>
          )}
          {!showForm ? (
            <Button
              label="Registrar recebimento"
              onPress={() => {
                setSuccessMsg('');
                setFormError('');
                setShowForm(true);
              }}
            />
          ) : (
            <View style={styles.form}>
              <View style={styles.sectionHeading}>
                <CircleDollarSign size={20} color="#6D28D9" />
                <Text accessibilityRole="header" style={styles.subtitle}>
                  Registrar recebimento
                </Text>
              </View>
              <Text style={styles.label}>Ordem de serviço</Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.input}
                disabled={busy}
                onPress={() => setShowPicker(true)}
              >
                <Text style={selectedWorkOrder ? styles.pickerValue : styles.pickerPlaceholder}>
                  {selectedWorkOrder
                    ? `OS #${selectedWorkOrder.number} — ${selectedWorkOrder.title}`
                    : 'Selecionar OS'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                accessibilityLabel="Valor do recebimento"
                style={styles.input}
                value={amount}
                onChangeText={(value) => {
                  setAmount(value);
                  setFormError('');
                }}
                editable={!busy}
                placeholder="890,00"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Método</Text>
              <View style={styles.chips}>
                {METHOD_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: method === option.value, disabled: busy }}
                    disabled={busy}
                    onPress={() => setMethod(option.value)}
                    style={[styles.chip, method === option.value && styles.selectedChip]}
                  >
                    <Text style={method === option.value ? styles.selectedChipLabel : styles.label}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Situação</Text>
              <View style={styles.chips}>
                {(
                  [
                    { value: 'PAID', label: 'Recebido' },
                    { value: 'PENDING', label: 'A receber' },
                  ] as { value: FormStatus; label: string }[]
                ).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ checked: status === option.value, disabled: busy }}
                    disabled={busy}
                    onPress={() => setStatus(option.value)}
                    style={[styles.chip, status === option.value && styles.selectedChip]}
                  >
                    <Text style={status === option.value ? styles.selectedChipLabel : styles.label}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>
                {status === 'PAID' ? 'Data do recebimento (opcional)' : 'Vencimento (opcional)'}
              </Text>
              <TextInput
                accessibilityLabel="Data"
                style={styles.input}
                value={date}
                onChangeText={(value) => setDate(applyDateMask(value))}
                editable={!busy}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={10}
              />

              {!!formError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {formError}
                </Text>
              )}
              <Button
                label={busy ? 'Salvando…' : 'Registrar'}
                busy={busy}
                onPress={() => void submit()}
              />
              <Button label="Cancelar" secondary busy={busy} onPress={resetForm} />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Receipt size={20} color="#6D28D9" />
            <Text accessibilityRole="header" style={styles.subtitle}>
              Recebimentos ({payments.length})
            </Text>
          </View>
          {payments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.name}>Nenhum recebimento ainda.</Text>
              <Text style={styles.description}>
                Use &quot;Registrar recebimento&quot; para começar.
              </Text>
            </View>
          ) : (
            payments.map((payment) => {
              const cfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.PENDING;
              const canSettle = payment.status !== 'PAID' && payment.status !== 'CANCELLED';
              return (
                <View key={payment.id} style={styles.paymentRow}>
                  <View style={styles.paymentRowHeader}>
                    <Text style={styles.name}>{payment.customer.name}</Text>
                    <Text style={styles.amount}>{formatMoney(payment.amount)}</Text>
                  </View>
                  {!!payment.description && (
                    <Text style={styles.description}>{payment.description}</Text>
                  )}
                  <View style={styles.paymentRowFooter}>
                    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.paymentMeta}>
                      {METHOD_LABEL[payment.method ?? ''] ?? '—'} ·{' '}
                      {payment.status === 'PAID'
                        ? `Pago em ${ddmm(payment.paid_at)}`
                        : `Vence em ${ddmm(payment.due_date)}`}
                    </Text>
                  </View>
                  {canSettle && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ disabled: settlingId === payment.id }}
                      disabled={settlingId === payment.id}
                      onPress={() => void settle(payment)}
                      style={[styles.settleBtn, settlingId === payment.id && styles.disabled]}
                    >
                      <Check size={14} color="#6D28D9" />
                      <Text style={styles.settleBtnText}>
                        {settlingId === payment.id ? 'Registrando…' : 'Marcar como recebido'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Mais ações do recebimento de ${payment.customer.name}`}
                    onPress={() => openMore(payment)}
                    style={styles.settleBtn}
                  >
                    <MoreHorizontal size={14} color="#6D28D9" />
                    <Text style={styles.settleBtnText}>Mais ações</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <Button
            label="Atualizar recebimentos"
            secondary
            busy={busy}
            onPress={() => setAttempt((value) => value + 1)}
          />
        </View>
      </ScrollView>

      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text accessibilityRole="header" style={styles.subtitle}>
              Selecionar ordem de serviço
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={() => setShowPicker(false)}
            >
              <X size={22} color="#0A0A0F" />
            </TouchableOpacity>
          </View>
          {workOrders.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.description}>Nenhuma ordem de serviço disponível.</Text>
            </View>
          ) : (
            <ScrollView>
              {workOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  accessibilityRole="button"
                  style={styles.osRow}
                  onPress={() => selectWorkOrder(order)}
                >
                  <Text style={styles.name}>{`OS #${order.number} — ${order.title}`}</Text>
                  <Text style={styles.description}>{order.customer.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 16 },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: { color: '#0A0A0F', fontSize: 20, lineHeight: 28, fontWeight: '600' },
  subtitle: { color: '#0A0A0F', fontSize: 16, lineHeight: 24, fontWeight: '600', flexShrink: 1 },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: -8, marginBottom: 16 },
  summaryBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryLabel: { color: '#64748B', fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },
  summaryValue: { color: '#0A0A0F', fontSize: 18, fontWeight: '700', marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  form: { gap: 12, marginTop: 8 },
  label: { color: '#0A0A0F', fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
    fontSize: 16,
    color: '#0A0A0F',
    backgroundColor: '#FFFFFF',
  },
  pickerValue: { fontSize: 16, color: '#0A0A0F' },
  pickerPlaceholder: { fontSize: 16, color: '#64748B' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    minWidth: 44,
    padding: 12,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedChip: { borderColor: '#6D28D9', backgroundColor: '#F5F3FF' },
  selectedChipLabel: { color: '#6D28D9', fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    minHeight: 48,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryButtonText: { color: '#6D28D9' },
  disabled: { opacity: 0.6 },
  paymentRow: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 16,
    gap: 6,
    marginTop: 12,
  },
  paymentRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentRowFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  paymentMeta: { color: '#64748B', fontSize: 12 },
  name: { color: '#0A0A0F', fontSize: 16, lineHeight: 24, fontWeight: '600' },
  amount: {
    color: '#0A0A0F',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#6D28D9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  settleBtnText: { color: '#6D28D9', fontSize: 13, fontWeight: '600' },
  empty: { paddingVertical: 24 },
  error: { color: '#DC2626', fontSize: 14, lineHeight: 20 },
  success: { color: '#15803D', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  osRow: { padding: 16, borderBottomWidth: 1, borderColor: '#F1F5F9', gap: 2 },
});
