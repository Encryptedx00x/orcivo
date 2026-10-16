import type { PlanUsageResponse, PlanUsageResource } from '@orcivo/shared-types';
import { Check, Clock3, LockKeyhole } from 'lucide-react';

const COLORS = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#64748B',
  border: '#E2E8F0',
  purple: '#6D28D9',
  purple50: '#F5F3FF',
  amber: '#B45309',
  amber50: '#FFFBEB',
  red: '#B91C1C',
  red50: '#FEF2F2',
  green: '#15803D',
  green50: '#F0FDF4',
};

const FEATURE_STATE = {
  AVAILABLE: { label: 'Disponível', color: COLORS.green, background: COLORS.green50, icon: Check },
  LOCKED: { label: 'Outro plano', color: COLORS.fg3, background: '#F8FAFC', icon: LockKeyhole },
  NOT_IMPLEMENTED: { label: 'Em breve', color: COLORS.fg3, background: '#F8FAFC', icon: Clock3 },
} as const;

function dateLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(value),
  );
}

function resourceText(resource: PlanUsageResource): string {
  if (resource.used === null) return 'Não foi possível consultar agora';
  if (resource.limit === null) return `${resource.used} usados · uso justo`;
  return `${resource.used} de ${resource.limit} · ${resource.remaining ?? 0} restantes`;
}

function resourceTone(resource: PlanUsageResource) {
  if (resource.state === 'EXCEEDED')
    return { color: COLORS.red, background: COLORS.red50, bar: '#DC2626' };
  if (resource.state === 'REACHED' || resource.state === 'ATTENTION')
    return { color: COLORS.amber, background: COLORS.amber50, bar: '#D97706' };
  return { color: COLORS.fg2, background: '#F8FAFC', bar: COLORS.purple };
}

function percentage(resource: PlanUsageResource): number | null {
  if (resource.used === null || resource.limit === null || resource.limit === 0) return null;
  return Math.min(100, Math.round((resource.used / resource.limit) * 100));
}

export function UsageOverview({ usage }: { usage: PlanUsageResponse }): React.JSX.Element {
  const resetAt = dateLabel(usage.usage_period.reset_at);
  const renewsAt = dateLabel(usage.billing_period?.renews_at);
  const needsAttention = usage.resources.some((resource) =>
    ['ATTENTION', 'REACHED', 'EXCEEDED'].includes(resource.state),
  );

  return (
    <section
      className="ov-card ov-card-body"
      style={{ marginBottom: 24 }}
      aria-labelledby="usage-title"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h2
            id="usage-title"
            style={{ margin: 0, color: COLORS.ink, fontSize: 17, fontWeight: 700 }}
          >
            Uso do plano
          </h2>
          <p style={{ margin: '4px 0 0', color: COLORS.fg3, fontSize: 13 }}>
            Dados calculados pelo Orcivo para a empresa ativa.
          </p>
        </div>
        <div style={{ color: COLORS.fg3, fontSize: 12, textAlign: 'right', lineHeight: 1.5 }}>
          {resetAt ? <div>Limites mensais reiniciam em {resetAt}</div> : null}
          {renewsAt ? <div>Assinatura renova em {renewsAt}</div> : null}
        </div>
      </div>

      <div
        className="ov-grid-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12 }}
      >
        {usage.resources.map((resource) => {
          const progress = percentage(resource);
          const tone = resourceTone(resource);
          return (
            <article
              key={resource.code}
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: 14,
                minWidth: 0,
              }}
            >
              <div style={{ color: COLORS.ink, fontWeight: 650, fontSize: 13 }}>
                {resource.label}
              </div>
              <div style={{ color: tone.color, fontSize: 12, marginTop: 5, minHeight: 18 }}>
                {resourceText(resource)}
              </div>
              {progress !== null ? (
                <div
                  role="progressbar"
                  aria-label={`Uso de ${resource.label}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  style={{
                    height: 7,
                    borderRadius: 999,
                    background: '#E2E8F0',
                    marginTop: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: tone.bar,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: 7,
                    borderRadius: 999,
                    background: tone.background,
                    marginTop: 12,
                  }}
                />
              )}
            </article>
          );
        })}
      </div>

      <h3 style={{ margin: '22px 0 10px', color: COLORS.ink, fontSize: 14, fontWeight: 650 }}>
        Recursos do plano
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 8,
        }}
      >
        {usage.features.map((feature) => {
          const state = FEATURE_STATE[feature.state];
          const Icon = state.icon;
          return (
            <div
              key={feature.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '10px 12px',
                borderRadius: 10,
                background: state.background,
                minWidth: 0,
              }}
            >
              <Icon size={15} color={state.color} aria-hidden="true" />
              <span style={{ color: COLORS.fg2, fontSize: 13, flex: 1 }}>{feature.label}</span>
              <span style={{ color: state.color, fontSize: 11, fontWeight: 650 }}>
                {state.label}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginTop: 18,
          padding: '12px 14px',
          borderRadius: 10,
          background: needsAttention ? COLORS.amber50 : COLORS.purple50,
        }}
      >
        <span style={{ color: needsAttention ? COLORS.amber : COLORS.fg2, fontSize: 13 }}>
          {needsAttention
            ? 'Seu uso está próximo ou chegou a um limite do plano.'
            : 'Precisa de mais capacidade ou recursos para sua empresa?'}
        </span>
        <a href="#planos" style={{ color: COLORS.purple, fontWeight: 650, fontSize: 13 }}>
          Comparar planos
        </a>
      </div>
    </section>
  );
}
