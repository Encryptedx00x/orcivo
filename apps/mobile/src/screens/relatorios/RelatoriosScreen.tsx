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
import { theme } from '../../theme';

const { colors, radius, space, type } = theme;

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
        <ActivityIndicator color={colors.purple600} />
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
  content: { padding: space.lg, gap: space.lg, backgroundColor: colors.slate50 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
    backgroundColor: colors.white,
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: type.bold },
  muted: { color: colors.slate500, fontSize: type.small, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  label: { color: colors.slate500, fontSize: type.caption },
  value: { color: colors.ink, fontSize: 18, fontWeight: type.bold, marginTop: 6 },
  section: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  sectionTitle: { fontSize: type.body, fontWeight: type.bold, marginBottom: 8, color: colors.ink },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.slate100,
  },
  rowLabel: { color: colors.slate700, flex: 1 },
  rowValue: { color: colors.ink, fontWeight: type.semibold },
  button: {
    backgroundColor: colors.purple600,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  buttonText: { color: colors.white, fontSize: type.body, fontWeight: type.bold },
});
