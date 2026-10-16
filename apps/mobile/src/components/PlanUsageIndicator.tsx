import React, { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AlertTriangle } from 'lucide-react-native';
import type {
  PlanUsageResource,
  PlanUsageResourceCode,
  PlanUsageResponse,
} from '@orcivo/shared-types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const PLANOS_URL = 'https://orcivo.com.br/planos';
const ALERT_STATES = new Set<PlanUsageResource['state']>(['ATTENTION', 'REACHED', 'EXCEEDED']);
const pendingByCompany = new Map<string, Promise<PlanUsageResponse>>();

function loadUsage(companyId: string): Promise<PlanUsageResponse> {
  const pending = pendingByCompany.get(companyId);
  if (pending) return pending;
  const request = api
    .get<PlanUsageResponse>('/company/me/usage')
    .finally(() => pendingByCompany.delete(companyId));
  pendingByCompany.set(companyId, request);
  return request;
}

function summary(resource: PlanUsageResource): string {
  if (resource.limit === null) return `${resource.used ?? 0} usados · uso justo`;
  return `${resource.used ?? 0} de ${resource.limit}${resource.remaining !== null ? ` · ${resource.remaining} restantes` : ''}`;
}

export function PlanUsageIndicator({ code }: { code: PlanUsageResourceCode }) {
  const { company } = useAuth();
  const [resource, setResource] = useState<PlanUsageResource | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!company?.id) return () => undefined;
      loadUsage(company.id)
        .then((usage) => {
          if (active) setResource(usage.resources.find((item) => item.code === code) ?? null);
        })
        .catch(() => {
          if (active) setResource(null);
        });
      return () => {
        active = false;
      };
    }, [code, company?.id]),
  );

  if (!resource || resource.used === null) return null;
  const alert = ALERT_STATES.has(resource.state);
  const text = summary(resource);
  return (
    <View
      accessible
      accessibilityRole={alert ? 'alert' : 'summary'}
      accessibilityLabel={`Uso de ${resource.label}: ${text}`}
      style={[styles.container, alert && styles.alertContainer]}
    >
      {alert ? <AlertTriangle size={16} color="#92400E" /> : null}
      <Text style={[styles.text, alert && styles.alertText]}>
        {resource.label}: <Text style={styles.strong}>{text}</Text>
      </Text>
      {alert ? (
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel="Comparar planos"
          onPress={() => void Linking.openURL(PLANOS_URL)}
        >
          <Text style={styles.link}>Comparar planos</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  alertContainer: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  text: { flex: 1, minWidth: 160, color: '#475569', fontSize: 12 },
  alertText: { color: '#92400E' },
  strong: { fontWeight: '700' },
  link: { color: '#6D28D9', fontSize: 12, fontWeight: '700' },
});
