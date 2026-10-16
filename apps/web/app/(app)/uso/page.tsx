import Link from 'next/link';
import type { PlanUsageResponse } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';
import { UsageOverview } from '../plano/UsageOverview';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  TRIALING: 'Aguardando pagamento',
  PAST_DUE: 'Em atraso',
  BLOCKED: 'Inativo',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

export default async function UsoPage(): Promise<React.JSX.Element> {
  const usage = await apiFetch<PlanUsageResponse>('/company/me/usage');
  const status = usage.plan.subscription_status
    ? (STATUS_LABEL[usage.plan.subscription_status] ?? usage.plan.subscription_status)
    : 'Ativo';

  return (
    <div className="ov-page" style={{ maxWidth: 1200 }}>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0A0A0F' }}>Uso</h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 0' }}>
            Acompanhe a capacidade e os recursos da empresa ativa.
          </p>
        </div>
        <Link href="/plano" style={{ color: '#6D28D9', fontWeight: 600, fontSize: 14 }}>
          Plano e assinatura
        </Link>
      </div>

      <div
        className="ov-card ov-card-body"
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <strong style={{ color: '#0A0A0F' }}>{usage.plan.name}</strong>
        <span style={{ color: '#64748B', fontSize: 13 }}>· {status}</span>
      </div>
      <UsageOverview usage={usage} />
    </div>
  );
}
