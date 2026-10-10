import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import { newIdempotencyKey } from '../../services/api';
import { appointmentService, AppointmentType } from '../../services/appointment.service';
import { workOrderService, WorkOrder } from '../../services/work-order.service';
import type { AgendaStackParamList } from '../../navigation/AppTabs';
import type {
  AppointmentPeriod,
  AppointmentRecurrence,
  AppointmentStatus,
} from '@orcivo/shared-types';

type Props = NativeStackScreenProps<AgendaStackParamList, 'AgendaCreate'>;

interface Customer {
  id: string;
  name: string;
  phone?: string;
}

const TYPE_OPTIONS: { value: AppointmentType; label: string }[] = [
  { value: 'VISITA', label: 'Visita' },
  { value: 'INSTALACAO', label: 'Instalação' },
  { value: 'ORCAMENTO', label: 'Orçamento' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'OUTRO', label: 'Outro' },
];

function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function applyTimeMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function buildIsoDate(dateStr: string, timeStr: string): string | null {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dateMatch || !timeMatch) return null;
  const [, dd, mm, yyyy] = dateMatch;
  const [, hh, min] = timeMatch;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function AgendaCreateScreen({ navigation }: Props) {
  const submitKey = useRef(newIdempotencyKey());
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AppointmentType>('VISITA');
  const [notes, setNotes] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrderId, setWorkOrderId] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('SCHEDULED');
  const [period, setPeriod] = useState<AppointmentPeriod | ''>('');
  const [reminder, setReminder] = useState<5 | 15 | 30 | 60 | 1440 | null>(null);
  const [recurrence, setRecurrence] = useState<AppointmentRecurrence | ''>('');
  const [recurrenceInterval, setRecurrenceInterval] = useState('6');
  const [recurrenceAmount, setRecurrenceAmount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomers([]);
      setShowSuggestions(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Customer[] }>(
          `/customers?search=${encodeURIComponent(customerSearch)}&limit=10`,
        );
        setCustomers(res.data ?? []);
        setShowSuggestions(true);
      } catch {
        setCustomers([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  useEffect(() => {
    workOrderService
      .fetchAll()
      .then((r) => setWorkOrders(r.data))
      .catch(() => setWorkOrders([]));
  }, []);

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerSearch(c.name);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, customer: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors['title'] = 'Título obrigatório';
    if (!date.trim() || !time.trim()) newErrors['datetime'] = 'Informe data e horário de início';
    else if (!buildIsoDate(date, time)) newErrors['datetime'] = 'Data ou horário inválidos';
    if (recurrence && !customerId) newErrors['recurrence'] = 'Escolha um cliente para repetir';
    if (recurrence && !/^\d+(\.\d{1,2})?$/.test(recurrenceAmount.replace(',', '.')))
      newErrors['recurrence'] = 'Informe o valor da cobrança recorrente';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Dados inválidos', Object.values(errors).filter(Boolean).join('\n'));
      return;
    }
    const startsAt = buildIsoDate(date, time);
    if (!startsAt) return;
    try {
      setSubmitting(true);
      await appointmentService.createAppointment(
        {
          title: title.trim(),
          type,
          customer_id: customerId || undefined,
          work_order_id: workOrderId || undefined,
          notes: notes.trim() || undefined,
          starts_at: startsAt,
          status,
          schedule_period: period || undefined,
          reminder_minutes: reminder ?? undefined,
          recurrence_type: recurrence || undefined,
          recurrence_interval:
            recurrence === 'CUSTOM_MONTHS' ? Number(recurrenceInterval) : undefined,
          recurrence_amount: recurrence ? recurrenceAmount.replace(',', '.') : undefined,
        },
        { idempotencyKey: submitKey.current },
      );
      navigation.goBack();
    } catch (err: unknown) {
      const error = (err ?? {}) as { data?: { message?: string | string[] } };
      const msg = error.data?.message ?? 'Não foi possível criar o compromisso.';
      Alert.alert('Erro', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Título *</Text>
          <TextInput
            style={[styles.input, errors['title'] ? styles.inputError : undefined]}
            placeholder="Ex.: Instalação câmeras empresa XYZ"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />
          {errors['title'] && <Text style={styles.fieldError}>{errors['title']}</Text>}

          <Text style={styles.sectionLabel}>Tipo</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeChip, type === opt.value && styles.typeChipActive]}
                onPress={() => setType(opt.value)}
              >
                <Text
                  style={[styles.typeChipText, type === opt.value && styles.typeChipTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Cliente (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome do cliente..."
            value={customerSearch}
            onChangeText={(v) => {
              setCustomerSearch(v);
              setCustomerId('');
            }}
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
          />
          {showSuggestions && customers.length > 0 && (
            <View style={styles.suggestions}>
              {customers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.suggestionRow}
                  onPress={() => selectCustomer(c)}
                >
                  <Text style={styles.suggestionName}>{c.name}</Text>
                  {c.phone ? <Text style={styles.suggestionPhone}>{c.phone}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {customerId ? <Text style={styles.selectedBadge}>✓ Cliente selecionado</Text> : null}

          {workOrders.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Ordem de serviço (opcional)</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeChip, workOrderId === '' && styles.typeChipActive]}
                  onPress={() => setWorkOrderId('')}
                >
                  <Text
                    style={[styles.typeChipText, workOrderId === '' && styles.typeChipTextActive]}
                  >
                    Nenhuma
                  </Text>
                </TouchableOpacity>
                {workOrders.map((wo) => (
                  <TouchableOpacity
                    key={wo.id}
                    style={[styles.typeChip, workOrderId === wo.id && styles.typeChipActive]}
                    onPress={() => setWorkOrderId(wo.id)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        workOrderId === wo.id && styles.typeChipTextActive,
                      ]}
                    >
                      #{wo.number} {wo.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionLabel}>Data e horário de início *</Text>
          <View style={styles.itemRow}>
            <View style={styles.flex1}>
              <TextInput
                style={[styles.input, errors['datetime'] ? styles.inputError : undefined]}
                placeholder="dd/mm/aaaa"
                value={date}
                onChangeText={(v) => setDate(applyDateMask(v))}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
                maxLength={10}
              />
            </View>
            <View style={styles.flex1}>
              <TextInput
                style={[styles.input, errors['datetime'] ? styles.inputError : undefined]}
                placeholder="hh:mm"
                value={time}
                onChangeText={(v) => setTime(applyTimeMask(v))}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
                maxLength={5}
              />
            </View>
          </View>
          {errors['datetime'] && <Text style={styles.fieldError}>{errors['datetime']}</Text>}

          <Text style={styles.sectionLabel}>Status</Text>
          <View style={styles.typeRow}>
            {[
              ['UNCONFIRMED', 'Não confirmado'],
              ['SCHEDULED', 'Agendado'],
              ['COMPLETED', 'Concluído'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.typeChip, status === value && styles.typeChipActive]}
                onPress={() => setStatus(value as AppointmentStatus)}
              >
                <Text style={[styles.typeChipText, status === value && styles.typeChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Período ou horário exato</Text>
          <View style={styles.typeRow}>
            {[
              ['', 'Horário exato'],
              ['MORNING', 'Manhã'],
              ['AFTERNOON', 'Tarde'],
              ['EVENING', 'Noite'],
              ['BUSINESS_HOURS', 'Comercial'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value || 'exact'}
                style={[styles.typeChip, period === value && styles.typeChipActive]}
                onPress={() => setPeriod(value as AppointmentPeriod | '')}
              >
                <Text style={[styles.typeChipText, period === value && styles.typeChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Lembrete</Text>
          <View style={styles.typeRow}>
            {[
              [null, 'Sem lembrete'],
              [5, '5 min'],
              [15, '15 min'],
              [30, '30 min'],
              [60, '1 hora'],
              [1440, '1 dia'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={String(value)}
                style={[styles.typeChip, reminder === value && styles.typeChipActive]}
                onPress={() => setReminder(value as typeof reminder)}
              >
                <Text
                  style={[styles.typeChipText, reminder === value && styles.typeChipTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Repetir (Orcivo Mais/Equipe)</Text>
          <View style={styles.typeRow}>
            {[
              ['', 'Não repetir'],
              ['WEEKLY', 'Semanal'],
              ['MONTHLY', 'Mensal'],
              ['CUSTOM_MONTHS', 'A cada N meses'],
            ].map(([value, label]) => (
              <TouchableOpacity
                key={value || 'none'}
                style={[styles.typeChip, recurrence === value && styles.typeChipActive]}
                onPress={() => setRecurrence(value as AppointmentRecurrence | '')}
              >
                <Text
                  style={[styles.typeChipText, recurrence === value && styles.typeChipTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {recurrence ? (
            <View style={styles.itemRow}>
              {recurrence === 'CUSTOM_MONTHS' ? (
                <TextInput
                  style={[styles.input, styles.flex1]}
                  value={recurrenceInterval}
                  onChangeText={setRecurrenceInterval}
                  keyboardType="number-pad"
                  placeholder="Meses"
                  maxLength={2}
                />
              ) : null}
              <TextInput
                style={[styles.input, styles.flex1]}
                value={recurrenceAmount}
                onChangeText={setRecurrenceAmount}
                keyboardType="decimal-pad"
                placeholder="Valor da cobrança"
              />
            </View>
          ) : null}
          {errors['recurrence'] ? (
            <Text style={styles.fieldError}>{errors['recurrence']}</Text>
          ) : null}

          <Text style={styles.sectionLabel}>Observações (opcional)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Observações"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Criar compromisso</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0A0A0F',
    backgroundColor: '#F9FAFB',
  },
  inputError: { borderColor: '#DC2626' },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  itemRow: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeChipActive: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  typeChipText: { fontSize: 13, color: '#374151' },
  typeChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  suggestions: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionRow: { padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  suggestionName: { fontSize: 15, color: '#0A0A0F', fontWeight: '500' },
  suggestionPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  selectedBadge: { fontSize: 13, color: '#059669', marginTop: 6, fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#6D28D9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
