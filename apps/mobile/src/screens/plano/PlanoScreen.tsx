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
import { Check, Clock3, CreditCard, ExternalLink, LockKeyhole } from 'lucide-react-native';
import type { PlanUsageFeature, PlanUsageResource, PlanUsageResponse } from '@orcivo/shared-types';
import { api } from '../../services/api';
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

function dateLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR');
}

function resourceText(resource: PlanUsageResource): string {
  if (resource.used === null) return 'Não foi possível consultar agora';
  if (resource.limit === null) return `${resource.used} usados · uso justo`;
  return `${resource.used} de ${resource.limit} · ${resource.remaining ?? 0} restantes`;
}

function resourceProgress(resource: PlanUsageResource): number | null {
  if (resource.used === null || resource.limit === null || resource.limit === 0) return null;
  return Math.min(100, Math.round((resource.used / resource.limit) * 100));
}

function resourceColor(resource: PlanUsageResource): string {
  if (resource.state === 'EXCEEDED') return '#DC2626';
  if (resource.state === 'REACHED' || resource.state === 'ATTENTION') return '#D97706';
  return '#6D28D9';
}

const FEATURE_META: Record<
  PlanUsageFeature['state'],
  { label: string; color: string; icon: typeof Check }
> = {
  AVAILABLE: { label: 'Disponível', color: '#15803D', icon: Check },
  LOCKED: { label: 'Outro plano', color: '#64748B', icon: LockKeyhole },
  NOT_IMPLEMENTED: { label: 'Em breve', color: '#64748B', icon: Clock3 },
};

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
  const [usage, setUsage] = useState<PlanUsageResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setLoadError('');
      api
        .get<PlanUsageResponse>('/company/me/usage')
        .then((snapshot) => {
          if (active) setUsage(snapshot);
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

  if (!usage) return null;

  const planCode = usage.plan.code;
  const meta = PLANS.find((p) => p.code === planCode) ?? PLANS[0];
  const statusLabel = usage.plan.subscription_status
    ? (STATUS_LABEL[usage.plan.subscription_status] ?? usage.plan.subscription_status)
    : 'Ativo';
  const resetAt = dateLabel(usage.usage_period.reset_at);
  const renewsAt = dateLabel(usage.billing_period?.renews_at);
  const needsAttention = usage.resources.some((resource) =>
    ['ATTENTION', 'REACHED', 'EXCEEDED'].includes(resource.state),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(16, insets.bottom) }]}
    >
      <View style={styles.card}>
        <View style={styles.sectionHeading}>
          <CreditCard size={20} color="#6D28D9" />
          <Text accessibilityRole="header" style={styles.title}>
            Uso
          </Text>
        </View>
        <Text style={styles.description}>
          Acompanhe a capacidade e os recursos da empresa ativa.
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

        {usage.plan.is_blocked ? (
          <Text accessibilityRole="alert" style={styles.warning}>
            Sua assinatura está inativa. Compare os planos para regularizar.
          </Text>
        ) : null}

        <View style={styles.periodBox}>
          {resetAt ? (
            <Text style={styles.usageHint}>Limites mensais reiniciam em {resetAt}</Text>
          ) : null}
          {renewsAt ? <Text style={styles.usageHint}>Assinatura renova em {renewsAt}</Text> : null}
        </View>

        <Text accessibilityRole="header" style={styles.subtitle}>
          Uso do plano
        </Text>
        <Text style={styles.description}>Dados calculados pelo Orcivo para a empresa ativa.</Text>
        <View style={styles.resourcesGrid}>
          {usage.resources.map((resource) => {
            const progress = resourceProgress(resource);
            const color = resourceColor(resource);
            return (
              <View key={resource.code} style={styles.usageBox}>
                <Text style={styles.resourceLabel}>{resource.label}</Text>
                <Text style={[styles.usageHint, { color }]}>{resourceText(resource)}</Text>
                {progress !== null ? (
                  <View
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={`Uso de ${resource.label}`}
                    accessibilityValue={{ min: 0, max: 100, now: progress }}
                    style={styles.progressTrack}
                  >
                    <View
                      style={[
                        styles.progressValue,
                        { width: `${progress}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                ) : (
                  <View style={styles.progressTrack} />
                )}
              </View>
            );
          })}
        </View>

        <Text accessibilityRole="header" style={[styles.subtitle, { marginTop: 8 }]}>
          Recursos do plano
        </Text>
        <View style={styles.featureList}>
          {usage.features.map((feature) => {
            const featureMeta = FEATURE_META[feature.state];
            const Icon = featureMeta.icon;
            return (
              <View key={feature.code} style={styles.featureRow}>
                <Icon size={16} color={featureMeta.color} />
                <Text style={styles.featureName}>{feature.label}</Text>
                <Text style={[styles.featureState, { color: featureMeta.color }]}>
                  {featureMeta.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.contextBox, needsAttention && styles.contextBoxAttention]}>
          <Text style={[styles.contextText, needsAttention && styles.contextTextAttention]}>
            {needsAttention
              ? 'Seu uso está próximo ou chegou a um limite do plano.'
              : 'Precisa de mais capacidade ou recursos para sua empresa?'}
          </Text>
        </View>

        <Button label="Comparar planos" onPress={() => void Linking.openURL(PLANOS_URL)} />
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
    marginBottom: 0,
  },
  periodBox: { gap: 2, marginBottom: 18 },
  resourcesGrid: { gap: 10, marginBottom: 20 },
  resourceLabel: { color: '#0A0A0F', fontSize: 14, fontWeight: '600' },
  usageHint: { color: '#64748B', fontSize: 12, marginTop: 4 },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressValue: { height: '100%', borderRadius: 999 },
  featureList: { gap: 8, marginTop: 10 },
  featureRow: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureName: { color: '#334155', fontSize: 13, flex: 1 },
  featureState: { fontSize: 11, fontWeight: '600' },
  contextBox: { borderRadius: 10, backgroundColor: '#F5F3FF', padding: 12, marginTop: 16 },
  contextBoxAttention: { backgroundColor: '#FFFBEB' },
  contextText: { color: '#334155', fontSize: 13, lineHeight: 18 },
  contextTextAttention: { color: '#B45309' },
  warning: {
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 16,
  },
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
});
