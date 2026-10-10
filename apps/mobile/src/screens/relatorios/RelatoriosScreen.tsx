import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatMoney } from '@orcivo/shared-types';
import { api } from '../../services/api';
import { sharePdf } from '../../easy/share';

type Report = {
  totals: { received: string; receivable: string; costs: string; result: string };
  by_payment_method: Array<{ label: string; amount: string }>;
  top_customers: Array<{ name: string; amount: string }>;
  customers_by_origin: Array<{ label: string; count: number }>;
};

function Card({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatMoney(value)}</Text>
    </View>
  );
}

export function RelatoriosScreen() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    void api
      .get<Report>(
        `/reports?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      )
      .then(setReport)
      .catch((error: { status?: number }) => setLocked(error.status === 403))
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6D28D9" />
        <Text>Carregando relatórios…</Text>
      </View>
    );
  if (locked)
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Relatórios no Orcivo Mais e Equipe</Text>
        <Text style={styles.muted}>
          Este recurso mostra recebimentos, custos e a origem dos clientes.
        </Text>
      </View>
    );
  if (!report)
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Não foi possível carregar os relatórios.</Text>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mês atual</Text>
      <View style={styles.grid}>
        <Card label="Recebido" value={report.totals.received} />
        <Card label="A receber" value={report.totals.receivable} />
        <Card label="Custos" value={report.totals.costs} />
        <Card label="Resultado" value={report.totals.result} />
      </View>
      <List
        title="Por forma de pagamento"
        rows={report.by_payment_method.map((row) => [row.label, formatMoney(row.amount)])}
      />
      <List
        title="Clientes que mais receberam"
        rows={report.top_customers.map((row) => [row.name, formatMoney(row.amount)])}
      />
      <List
        title="Novos clientes por origem"
        rows={report.customers_by_origin.map((row) => [row.label, String(row.count)])}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          void sharePdf(
            '/data-export/zip',
            'orcivo-dados.zip',
            'Dados Orcivo',
            'application/zip',
          ).catch(() =>
            Alert.alert('Não foi possível exportar', 'Tente novamente em alguns instantes.'),
          )
        }
      >
        <Text style={styles.buttonText}>Exportar todos os dados (ZIP)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function List({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length ? (
        rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>Sem dados no período.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, backgroundColor: '#F8FAFC' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#FFF',
  },
  title: { color: '#0A0A0F', fontSize: 22, fontWeight: '700' },
  muted: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    padding: 14,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: { color: '#64748B', fontSize: 12 },
  value: { color: '#0A0A0F', fontSize: 18, fontWeight: '700', marginTop: 6 },
  section: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#0A0A0F' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowLabel: { color: '#334155', flex: 1 },
  rowValue: { color: '#0A0A0F', fontWeight: '600' },
  button: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
