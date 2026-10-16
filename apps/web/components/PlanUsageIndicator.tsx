import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { PlanUsageResource } from '@orcivo/shared-types';

const ALERT_STATES = new Set<PlanUsageResource['state']>(['ATTENTION', 'REACHED', 'EXCEEDED']);

export function PlanUsageIndicator({
  resource,
}: {
  resource?: PlanUsageResource;
}): React.JSX.Element | null {
  if (!resource || resource.used === null) return null;
  const alert = ALERT_STATES.has(resource.state);
  const summary =
    resource.limit === null
      ? `${resource.used} usados · uso justo`
      : `${resource.used} de ${resource.limit}${resource.remaining !== null ? ` · ${resource.remaining} restantes` : ''}`;

  return (
    <div
      role={alert ? 'status' : undefined}
      aria-label={`Uso de ${resource.label}: ${summary}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        padding: '9px 12px',
        borderRadius: 10,
        border: `1px solid ${alert ? '#FDE68A' : '#E2E8F0'}`,
        background: alert ? '#FFFBEB' : '#F8FAFC',
        color: alert ? '#92400E' : '#475569',
        fontSize: 12,
      }}
    >
      {alert ? <AlertTriangle size={15} aria-hidden="true" /> : null}
      <span style={{ flex: 1, minWidth: 160 }}>
        {resource.label}: <strong>{summary}</strong>
      </span>
      <Link href={alert ? '/plano#planos' : '/uso'} style={{ color: '#6D28D9', fontWeight: 650 }}>
        {alert ? 'Comparar planos' : 'Ver uso'}
      </Link>
    </div>
  );
}
