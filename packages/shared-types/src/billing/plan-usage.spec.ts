import { PlanUsageResponseSchema, planUsageRemaining, planUsageState } from './plan-usage';

describe('plan usage contract', () => {
  it.each([
    [0, 100, 'NORMAL'],
    [79, 100, 'NORMAL'],
    [80, 100, 'ATTENTION'],
    [99, 100, 'ATTENTION'],
    [100, 100, 'REACHED'],
    [101, 100, 'EXCEEDED'],
    [7, null, 'FAIR_USE'],
    [null, 100, 'UNAVAILABLE'],
  ] as const)('classifies used=%s and limit=%s as %s', (used, limit, expected) => {
    expect(planUsageState(used, limit)).toBe(expected);
  });

  it('never reports a negative remaining quantity', () => {
    expect(planUsageRemaining(30, 50)).toBe(20);
    expect(planUsageRemaining(51, 50)).toBe(0);
    expect(planUsageRemaining(7, null)).toBeNull();
  });

  it('validates a tenant-scoped snapshot without inventing fair-use percentages', () => {
    expect(
      PlanUsageResponseSchema.parse({
        plan: {
          code: 'MAIS',
          name: 'Orcivo Mais',
          subscription_status: 'ACTIVE',
          is_blocked: false,
        },
        billing_period: {
          start: '2026-10-01T00:00:00.000Z',
          end: '2026-11-01T00:00:00.000Z',
          renews_at: '2026-11-01T00:00:00.000Z',
        },
        usage_period: {
          start: '2026-10-01T03:00:00.000Z',
          end: '2026-11-01T03:00:00.000Z',
          reset_at: '2026-11-01T03:00:00.000Z',
        },
        resources: [
          {
            code: 'QUOTES_MONTH',
            label: 'Orçamentos',
            used: 12,
            limit: null,
            remaining: null,
            period: 'CALENDAR_MONTH',
            state: 'FAIR_USE',
          },
        ],
        features: [{ code: 'REPORTS', label: 'Relatórios', state: 'AVAILABLE' }],
        generated_at: '2026-10-15T12:00:00.000Z',
      }).resources[0].state,
    ).toBe('FAIR_USE');
  });
});
