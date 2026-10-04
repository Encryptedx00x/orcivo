// Run with Node 24+: node --test apps/site/app/planos/plan-catalog.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { getPlans, priceLabel, annualDiscount } = await import('./plan-catalog.ts');
// Same module instance plan-catalog.ts uses, so mutations below are visible to it.
const { PLAN_LIMITS, PLAN_PRICING } = await import('@orcivo/shared-types');

test('lists the shared plans in order with Mais as the only popular plan', () => {
  const plans = getPlans();
  assert.deepEqual(plans.map(({ code }) => code), Object.keys(PLAN_LIMITS));
  assert.deepEqual(plans.map(({ name }) => name), [
    'Orcivo Livre', 'Orcivo Solo', 'Orcivo Mais', 'Orcivo Equipe',
  ]);
  assert.deepEqual(plans.filter(({ highlight }) => highlight).map(({ code }) => code), ['MAIS']);
});

test('formats both billing cycles from shared pricing, including free', () => {
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  for (const [code, prices] of Object.entries(PLAN_PRICING)) {
    for (const cycle of ['monthly', 'yearly']) {
      const amount = Number(prices[cycle]);
      assert.equal(priceLabel(code, cycle), amount === 0
        ? 'Grátis'
        : `${brl.format(amount).replace(/\s/g, '')}/${cycle === 'yearly' ? 'ano' : 'mês'}`);
    }
  }
});

test('describes every numeric limit, null allowance and feature flag', () => {
  for (const plan of getPlans()) {
    const limits = PLAN_LIMITS[plan.code];
    for (const [key, suffix, fairUse] of [
      ['customers_max', 'clientes', 'Clientes em uso justo'],
      ['quotes_per_month', 'orçamentos/mês', 'Orçamentos em uso justo'],
      ['work_orders_per_month', 'OS/mês', 'OS em uso justo'],
    ]) {
      assert.ok(plan.features.includes(limits[key] === null
        ? fairUse : `${limits[key].toLocaleString('pt-BR')} ${suffix}`));
    }
    assert.ok(plan.features.includes(limits.members_max === 1
      ? '1 membro na equipe' : `Até ${limits.members_max} membros na equipe`));
    assert.equal(plan.features.includes("PDF com marca d'água"), limits.pdf_watermark);
    assert.equal(plan.features.includes("PDF sem marca d'água"), !limits.pdf_watermark);
    assert.equal(plan.features.includes('Logo própria no PDF'), limits.has_logo);
    assert.equal(plan.features.includes('Relatórios financeiros'), limits.has_reports);
    assert.equal(plan.features.includes('Contratos digitais'), limits.has_contracts);
    assert.doesNotMatch(plan.features.join(' '), /ilimitad/i);
  }
});

test('source changes propagate without editing the site', () => {
  const originalLimits = { ...PLAN_LIMITS.SOLO };
  const originalPricing = { ...PLAN_PRICING.SOLO };
  try {
    Object.assign(PLAN_LIMITS.SOLO, {
      customers_max: null,
      quotes_per_month: 1234,
      work_orders_per_month: 0,
      members_max: 7,
      pdf_watermark: true,
      has_logo: false,
      has_reports: true,
      has_contracts: true,
    });
    Object.assign(PLAN_PRICING.SOLO, { monthly: '17.45', yearly: '150.20' });
    const solo = getPlans().find(({ code }) => code === 'SOLO');
    assert.deepEqual(solo.features, [
      'Clientes em uso justo', '1.234 orçamentos/mês', '0 OS/mês',
      'Até 7 membros na equipe', "PDF com marca d'água",
      'Relatórios financeiros', 'Contratos digitais', 'Suporte prioritário',
    ]);
    assert.equal(priceLabel('SOLO', 'monthly'), 'R$17,45/mês');
    assert.equal(priceLabel('SOLO', 'yearly'), 'R$150,20/ano');
    assert.equal(annualDiscount(), 28);
  } finally {
    Object.assign(PLAN_LIMITS.SOLO, originalLimits);
    Object.assign(PLAN_PRICING.SOLO, originalPricing);
  }
});

test('annual badge never overstates savings and disappears without a discount', () => {
  const original = { ...PLAN_PRICING.SOLO };
  try {
    for (const { monthly, yearly } of Object.values(PLAN_PRICING)) {
      if (Number(monthly) > 0) {
        assert.ok(annualDiscount() <= (1 - Number(yearly) / (Number(monthly) * 12)) * 100);
      }
    }
    Object.assign(PLAN_PRICING.SOLO, { monthly: '10.00', yearly: '120.00' });
    assert.equal(annualDiscount(), 0);
    PLAN_PRICING.SOLO.yearly = '130.00';
    assert.equal(annualDiscount(), 0);
  } finally {
    Object.assign(PLAN_PRICING.SOLO, original);
  }
});
