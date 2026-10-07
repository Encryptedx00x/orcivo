import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, newIdempotencyKey } from '../../services/api';
import {
  WORK_ORDER_FIELDS,
  type WorkOrderDetails,
  type WorkOrderField,
} from '@orcivo/shared-types';

/** Inputs for the company's active OS fields (Configurações → Ordem de serviço on the web). */
export function OsDetailsFields({
  fields,
  value,
  onChange,
}: {
  fields: WorkOrderField[];
  value: WorkOrderDetails;
  onChange: (v: WorkOrderDetails) => void;
}) {
  return (
    <View>
      {fields.map((k) => (
        <View key={k}>
          <Text style={styles.label}>{WORK_ORDER_FIELDS[k].label}</Text>
          <TextInput
            accessibilityLabel={WORK_ORDER_FIELDS[k].label}
            style={styles.input}
            placeholder={WORK_ORDER_FIELDS[k].placeholder}
            placeholderTextColor="#94A3B8"
            value={value[k] ?? ''}
            onChangeText={(t) => onChange({ ...value, [k]: t })}
            maxLength={300}
          />
        </View>
      ))}
    </View>
  );
}

/** Drops empty values so the API stores only what was filled. */
export const cleanDetails = (v: WorkOrderDetails): WorkOrderDetails =>
  Object.fromEntries(
    Object.entries(v).filter(([, s]) => typeof s === 'string' && s.trim()),
  ) as WorkOrderDetails;

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0A0A0F',
    marginTop: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0A0A0F' },
  link: { fontSize: 14, fontWeight: '600', color: '#6D28D9', padding: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  fact: { minWidth: 120 },
  factLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },
  factValue: { fontSize: 15, fontWeight: '600', color: '#0A0A0F', marginTop: 2 },
  error: { color: '#B91C1C', fontSize: 13, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#334155', fontWeight: '600', fontSize: 15 },
});

/** "Dados do equipamento" on the OS detail: filled values, editable while the OS is open. */
export function OsDetailsSection({
  id,
  initial,
  editable,
}: {
  id: string;
  initial: WorkOrderDetails;
  editable: boolean;
}) {
  const [fields, setFields] = React.useState<WorkOrderField[]>([]);
  const [saved, setSaved] = React.useState<WorkOrderDetails>(initial);
  const [value, setValue] = React.useState<WorkOrderDetails>(initial);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    api
      .get<{ work_order_fields?: WorkOrderField[] }>('/company/me')
      .then((c) => setFields(c.work_order_fields ?? []))
      .catch(() => setFields([]));
  }, []);

  const shown = (Object.keys(WORK_ORDER_FIELDS) as WorkOrderField[]).filter(
    (k) => fields.includes(k) || saved[k],
  );
  if (!shown.length) return null;

  const save = async () => {
    const clean = cleanDetails(value);
    setBusy(true);
    setError('');
    try {
      await api.patch(
        `/work-orders/${encodeURIComponent(id)}`,
        { details: clean },
        {
          idempotencyKey: newIdempotencyKey(),
        },
      );
      setSaved(clean);
      setEditing(false);
    } catch {
      setError('Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Dados do equipamento</Text>
        {editable && !editing ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => setEditing(true)}>
            <Text style={styles.link}>Editar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {editing ? (
        <>
          <OsDetailsFields fields={shown} value={value} onChange={setValue} />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <View style={styles.row}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.primary}
              disabled={busy}
              onPress={() => void save()}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>Salvar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => {
                setValue(saved);
                setEditing(false);
              }}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.facts}>
          {shown.map((k) => (
            <View key={k} style={styles.fact}>
              <Text style={styles.factLabel}>{WORK_ORDER_FIELDS[k].label}</Text>
              <Text style={styles.factValue}>{saved[k]?.trim() || '—'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
