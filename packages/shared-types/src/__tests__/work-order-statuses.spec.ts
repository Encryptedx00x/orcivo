import {
  ADMIN_ONLY_ACTIONS,
  MANDATORY_REASON_ACTIONS,
  STATUS_ACTION_SPECS,
  WO_ACTIONS,
  WO_CLOSED_STATUSES,
  WORK_ORDER_EXTRA_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  WorkOrderExtraStatusListSchema,
  WorkOrderStatusEnum,
  woActionsFor,
  type StatusAction,
} from '../work-order/work-order-statuses';

// R5b — máquina de estados da OS centralizada em shared-types (backend/web/app consomem daqui).

describe('work order statuses (R5b)', () => {
  it('enum cobre os 4 status base + os 2 extras', () => {
    expect(WorkOrderStatusEnum.options).toEqual([
      'PENDING',
      'IN_PROGRESS',
      'DONE',
      'CANCELLED',
      'AWAITING_PAYMENT',
      'WARRANTY',
    ]);
    expect(Object.keys(WORK_ORDER_EXTRA_STATUSES)).toEqual(['AWAITING_PAYMENT', 'WARRANTY']);
  });

  it('todo status tem label pt-BR', () => {
    for (const status of WorkOrderStatusEnum.options) {
      expect(WORK_ORDER_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it('specs: evento de auditoria único por ação e transições origem→destino sem sobreposição', () => {
    const auditActions = new Set<string>();
    const edges = new Set<string>();
    for (const action of Object.keys(STATUS_ACTION_SPECS) as StatusAction[]) {
      const spec = STATUS_ACTION_SPECS[action];
      expect(spec.allowedFrom.length).toBeGreaterThan(0);
      expect(spec.auditAction).toMatch(/^work_order\./);
      expect(auditActions.has(spec.auditAction)).toBe(false);
      auditActions.add(spec.auditAction);
      for (const from of spec.allowedFrom) {
        const edge = `${from}->${spec.to}`;
        expect(edges.has(edge)).toBe(false);
        edges.add(edge);
      }
    }
  });

  it('transições dos extras: DONE ↔ AWAITING_PAYMENT e DONE → WARRANTY', () => {
    expect(STATUS_ACTION_SPECS.aguardar_pagamento).toMatchObject({
      allowedFrom: ['DONE'],
      to: 'AWAITING_PAYMENT',
      auditAction: 'work_order.awaiting_payment',
      requiresExtra: 'AWAITING_PAYMENT',
    });
    expect(STATUS_ACTION_SPECS.receber_pagamento).toMatchObject({
      allowedFrom: ['AWAITING_PAYMENT'],
      to: 'DONE',
      auditAction: 'work_order.payment_received',
      requiresExtra: 'AWAITING_PAYMENT',
    });
    expect(STATUS_ACTION_SPECS.acionar_garantia).toMatchObject({
      allowedFrom: ['DONE'],
      to: 'WARRANTY',
      auditAction: 'work_order.warranty_claimed',
      requiresExtra: 'WARRANTY',
    });
  });

  it('reabrir sai de todos os estados pós-conclusão, inclusive os extras', () => {
    expect(STATUS_ACTION_SPECS.reabrir.allowedFrom).toEqual([
      'DONE',
      'CANCELLED',
      'AWAITING_PAYMENT',
      'WARRANTY',
    ]);
  });

  it('ações de extra só aparecem quando a empresa ligou o status', () => {
    expect(woActionsFor('DONE')).toEqual(['reabrir', 'corrigir']);
    expect(woActionsFor('DONE', ['AWAITING_PAYMENT'])).toEqual([
      'reabrir',
      'corrigir',
      'aguardar_pagamento',
    ]);
    expect(woActionsFor('DONE', ['WARRANTY'])).toEqual(['reabrir', 'corrigir', 'acionar_garantia']);
    expect(woActionsFor('AWAITING_PAYMENT', ['AWAITING_PAYMENT'])).toEqual([
      'receber_pagamento',
      'reabrir',
      'corrigir',
    ]);
    // receber_pagamento some com o extra desligado (OS presa no extra é reaberta por admin).
    expect(woActionsFor('AWAITING_PAYMENT')).toEqual(['reabrir', 'corrigir']);
  });

  it('toda ação listada em WO_ACTIONS existe; extras declarados em requiresExtra são válidos', () => {
    const specKeys = new Set(Object.keys(STATUS_ACTION_SPECS));
    for (const actions of Object.values(WO_ACTIONS)) {
      for (const action of actions) {
        expect(action === 'corrigir' || specKeys.has(action)).toBe(true);
      }
    }
    for (const spec of Object.values(STATUS_ACTION_SPECS)) {
      if (spec.requiresExtra) {
        expect(spec.requiresExtra in WORK_ORDER_EXTRA_STATUSES).toBe(true);
      }
    }
  });

  it('lista de extras da empresa aceita os dois status, remove duplicados e rejeita desconhecidos', () => {
    expect(WorkOrderExtraStatusListSchema.parse(['WARRANTY', 'AWAITING_PAYMENT', 'WARRANTY'])).toEqual(
      ['WARRANTY', 'AWAITING_PAYMENT'],
    );
    expect(WorkOrderExtraStatusListSchema.parse([])).toEqual([]);
    expect(WorkOrderExtraStatusListSchema.safeParse(['PENDING']).success).toBe(false);
  });

  it('ações admin e de motivo obrigatório continuam íntegras', () => {
    expect(ADMIN_ONLY_ACTIONS).toEqual(['reabrir', 'corrigir']);
    expect(MANDATORY_REASON_ACTIONS).toEqual(['cancelar', 'reabrir', 'corrigir']);
  });

  it('estados pós-conclusão usados nos bloqueios de edição', () => {
    expect(WO_CLOSED_STATUSES).toEqual(['DONE', 'CANCELLED', 'AWAITING_PAYMENT', 'WARRANTY']);
  });
});
