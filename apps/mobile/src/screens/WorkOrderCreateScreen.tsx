import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, newIdempotencyKey } from '../services/api';
import type { MaisStackParamList } from '../navigation/MaisStack';
import type { WorkOrderDetails, WorkOrderField } from '@orcivo/shared-types';
import { OsDetailsFields, cleanDetails } from './os/OsDetailsFields';

type Props = NativeStackScreenProps<MaisStackParamList, 'WorkOrderCreate'>;
interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

const mask = (raw: string, kind: 'date' | 'time') => {
  const d = raw.replace(/\D/g, '').slice(0, kind === 'date' ? 8 : 4);
  if (kind === 'time') return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
  if (d.length <= 2) return d;
  return d.length <= 4
    ? `${d.slice(0, 2)}/${d.slice(2)}`
    : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

/** dd/mm/aaaa + hh:mm (local time) → ISO; null when the date is incomplete or invalid. */
function toIso(date: string, time: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!m) return null;
  const [h, min] = /^\d{2}:\d{2}$/.test(time) ? time.split(':').map(Number) : [8, 0];
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, min);
  return d.getDate() === Number(m[1]) && h < 24 && min < 60 ? d.toISOString() : null;
}

/** New stand-alone work order (without a quote) — same fields as the web form. */
export function WorkOrderCreateScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [osFields, setOsFields] = useState<WorkOrderField[]>([]);
  const [details, setDetails] = useState<WorkOrderDetails>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const key = useRef(newIdempotencyKey());

  useEffect(() => {
    api
      .get<{ work_order_fields?: WorkOrderField[] }>('/company/me')
      .then((c) => setOsFields(c.work_order_fields ?? []))
      .catch(() => setOsFields([]));
  }, []);

  useEffect(() => {
    if (customer || !search.trim()) {
      setCustomers([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<{ data: Customer[] }>(`/customers?search=${encodeURIComponent(search)}&limit=10`)
        .then((res) => setCustomers(res.data ?? []))
        .catch(() => setCustomers([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, customer]);

  async function save() {
    if (!customer) return setError('Escolha o cliente da lista.');
    if (!title.trim()) return setError('Diga o que vai ser feito.');
    const scheduled = date ? toIso(date, time) : undefined;
    if (scheduled === null) return setError('Data inválida. Use dd/mm/aaaa.');
    setError('');
    setSaving(true);
    try {
      const wo = await api.post<{ id: string }>(
        '/work-orders',
        {
          customer_id: customer.id,
          title: title.trim(),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(scheduled ? { scheduled_at: scheduled } : {}),
          ...(Object.keys(cleanDetails(details)).length ? { details: cleanDetails(details) } : {}),
        },
        { idempotencyKey: key.current },
      );
      navigation.replace('WorkOrderDetail', { id: wo.id });
    } catch (e) {
      const status = (e as { status?: number }).status;
      setError(
        status === 403
          ? 'Seu plano ou permissão não deixa criar OS agora.'
          : 'Não foi possível criar a OS. Tente de novo.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Cliente *</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome do cliente…"
          placeholderTextColor="#94A3B8"
          value={customer ? customer.name : search}
          onChangeText={(v) => {
            setCustomer(null);
            setSearch(v);
          }}
          autoCorrect={false}
        />
        {customers.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.suggestion}
            onPress={() => {
              setCustomer(c);
              setCustomers([]);
            }}
          >
            <Text style={styles.suggestionName}>{c.name}</Text>
            {c.phone ? <Text style={styles.muted}>{c.phone}</Text> : null}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>O que vai ser feito *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Instalação de ar-condicionado split"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          maxLength={300}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>Data (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="dd/mm/aaaa"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={date}
              onChangeText={(v) => setDate(mask(v, 'date'))}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>Hora</Text>
            <TextInput
              style={styles.input}
              placeholder="08:00"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={time}
              onChangeText={(v) => setTime(mask(v, 'time'))}
            />
          </View>
        </View>

        <Text style={styles.label}>Observações</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Detalhes, materiais, acesso ao local…"
          placeholderTextColor="#94A3B8"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
        />

        <OsDetailsFields fields={osFields} value={details} onChange={setDetails} />

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={() => void save()} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Criar OS</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 8, backgroundColor: '#fff', flexGrow: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0A0A0F',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  suggestion: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  suggestionName: { fontSize: 15, fontWeight: '600', color: '#0A0A0F' },
  muted: { fontSize: 13, color: '#64748B' },
  error: { color: '#B91C1C', fontSize: 14, marginTop: 8 },
  button: {
    marginTop: 18,
    backgroundColor: '#6D28D9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
