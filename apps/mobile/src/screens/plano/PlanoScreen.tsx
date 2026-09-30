import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, ExternalLink } from 'lucide-react-native';
import type { PlanLimitsResponse, SubscriptionStatusResponse } from '@orcivo/shared-types';
import { api } from '../../services/api';
import { workOrderService } from '../../services/work-order.service';
import type { WorkOrder } from '../../services/work-order.service';
import { planoError } from './plano-errors';
import { PLANS, planName } from './plans';

// Fluxo de gerenciamento/checkout vive no site (web) — nada de cobrança nova no app (política de loja).
const PLANOS_URL = 'https://orcivo.com.br/planos';

const STATUS_LABEL: Record<string, string> = {
  TRIALING: 'Em teste',
  ACTIVE: 'Ativo',
  PAST_DUE: 'Em atraso',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

// GET /work-orders é paginado e não expõe total nem uso mensal — contamos localmente
// pelas páginas mais recentes (ordenadas por created_at desc no backend). Suficiente para
// os planos com limite numérico (Livre/Solo, hoje ≤ 30/mês); Mais/Equipe não têm teto.
const MAX_USAGE_PAGES = 2;

async function countWorkOrdersThisMonth(
  fetchPage: (page: number) => Promise<{ data: WorkOrder[] }>,
): Promise<number> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let count = 0;
  for (let page = 1; page <= MAX_USAGE_PAGES; page++) {
    const { data } = await fetchPage(page);
    if (data.length === 0) break;
    for (const order of data) {
      const createdAt = (order as WorkOrder & { created_at?: string }).created_at;
      if (createdAt && new Date(createdAt) < startOfMonth) return count;
      count++;
    }
  }
  return count;
}

function Button({
  label,
  secondary = false,
  icon,
  onPress,
}: {
  label: string;
  secondary?: boolean;
  icon?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, secondary && styles.secondaryButton]}
    >
      {icon}
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PlanoScreen() {
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null);
  const [limits, setLimits] = useState<PlanLimitsResponse | null>(null);
  const [osUsed, setOsUsed] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError('');
      Promise.all([
        api.get<SubscriptionStatusResponse>('/company/me/subscription-status'),
        api.get<PlanLimitsResponse>('/company/me/plan-limits'),
      ])
        .then(async ([sub, planLimits]) => {
          if (!active) return;
          setSubscription(sub);
          setLimits(planLimits);
          const used =
            planLimits.work_orders_per_month != null
              ? await countWorkOrdersThisMonth((page) => workOrderService.fetchAll(page))
              : 0;
          if (active) setOsUsed(used);
        })
        .catch((error: unknown) => {
          if (active) setLoadError(planoError(error));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [attempt]),
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Carregando plano" color="#6D28D9" />
        <Text style={styles.description}>Carregando plano…</Text>
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

  const planCode = limits?.plan_code ?? subscription?.plan_code ?? 'LIVRE';
  const meta = PLANS.find((p) => p.code === planCode) ?? PLANS[0];
  const cap = limits?.work_orders_per_month ?? null;
  const statusLabel = subscription?.status
    ? (STATUS_LABEL[subscription.status] ?? subscription.status)
    : 'Ativo';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}
    >
      <View style={styles.card}>
        <View style={styles.sectionHeading}>
          <CreditCard size={20} color="#6D28D9" />
          <Text accessibilityRole="header" style={styles.title}>
            Plano e assinatura
          </Text>
        </View>
        <Text style={styles.description}>
          Acompanhe seu plano, uso do mês e gerencie a assinatura.
        </Text>

        <View style={styles.planBox}>
          <View style={styles.planBoxHeader}>
            <View>
              <Text style={styles.planLabel}>PLANO ATUAL</Text>
              <Text style={styles.planName}>{meta.name}</Text>
              <Text style={styles.planPrice}>
                {planCode === 'LIVRE' ? 'Gratuito · uso justo' : `${meta.price}${meta.period}`}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {!!subscription?.message && (
          <Text accessibilityRole="alert" style={styles.warning}>
            {subscription.message}
          </Text>
        )}

        <View style={styles.usageBox}>
          <Text style={styles.usageLabel}>Uso do mês</Text>
          {cap != null ? (
            <>
              <Text style={styles.usageValue}>{`${osUsed}/${cap} OS`}</Text>
              <Text
                style={styles.usageHint}
              >{`Uso justo — o ${meta.name} inclui até ${cap} OS por mês.`}</Text>
            </>
          ) : (
            <Text style={styles.usageHint}>
              Uso ampliado — este plano não tem um teto fixo de OS por mês.
            </Text>
          )}
        </View>

        <Button label="Ver planos" onPress={() => void Linking.openURL(PLANOS_URL)} />
        <Button
          label="Gerenciar assinatura"
          secondary
          icon={<ExternalLink size={16} color="#6D28D9" />}
          onPress={() => void Linking.openURL(PLANOS_URL)}
        />
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.subtitle}>
          Outros planos
        </Text>
        {PLANS.filter((p) => p.code !== planCode).map((p) => (
          <View key={p.code} style={styles.otherPlanRow}>
            <Text style={styles.name}>{planName(p.code)}</Text>
            <Text style={styles.description}>
              {p.code === 'LIVRE' ? 'Gratuito' : `${p.price}${p.period}`}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planBox: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#4C1D95',
    marginBottom: 12,
  },
  planBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planLabel: { color: '#E9D5FF', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  planName: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginTop: 4 },
  planPrice: { color: '#E9D5FF', fontSize: 13, marginTop: 4 },
  statusBadge: {
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  statusBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  usageBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginBottom: 16,
  },
  usageLabel: { color: '#64748B', fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },
  usageValue: { color: '#0A0A0F', fontSize: 18, fontWeight: '700', marginTop: 4 },
  usageHint: { color: '#64748B', fontSize: 12, marginTop: 4 },
  button: {
    backgroundColor: '#6D28D9',
    borderRadius: 12,
    minHeight: 48,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryButtonText: { color: '#6D28D9' },
  otherPlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 12,
  },
  name: { color: '#0A0A0F', fontSize: 15, fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 14, lineHeight: 20 },
  warning: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 16,
  },
});
