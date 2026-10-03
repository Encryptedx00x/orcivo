'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { annualDiscount, getPlans, priceLabel, type BillingCycle } from './plan-catalog';

// O checkout roda dentro do app (autenticado): o site só leva ao signup/login
// com plan/cycle na query string.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.orcivo.com.br';

export default function PlanosPage() {
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const plans = getPlans();
  const discount = annualDiscount();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-600">Orcivo</Link>
          <Link href="https://app.orcivo.com.br/login" className="text-sm font-medium text-primary-600">Entrar</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Planos e preços</h1>
          <p className="text-xl text-slate-600 mb-8">Comece grátis. Faça upgrade quando precisar.</p>

          {/* Toggle ciclo */}
          <div className="inline-flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setCycle('monthly')}
              className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${cycle === 'monthly' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${cycle === 'yearly' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Anual {discount > 0 && <span className="text-green-600 text-xs font-semibold ml-1">-{discount}%</span>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = priceLabel(plan.code, cycle);
            const query = `?plan=${plan.code}&cycle=${cycle.toUpperCase()}`;
            const isPaid = plan.code !== 'LIVRE';
            const href = isPaid ? `${APP_URL}/signup${query}` : `${APP_URL}/signup`;
            const loginHref = `${APP_URL}/login${query}`;

            return (
              <div
                key={plan.code}
                className={`rounded-2xl border p-6 flex flex-col ${plan.highlight ? 'border-primary-600 shadow-lg shadow-primary-100 relative' : 'border-slate-200'}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Mais popular
                  </div>
                )}
                <h2 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h2>
                <p className="text-2xl font-bold text-primary-600 mb-6">{price}</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check size={16} className="text-primary-600 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${plan.highlight ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-primary-600 text-primary-600 hover:bg-primary-50'}`}
                >
                  {plan.cta}
                </Link>
                {isPaid && (
                  <Link href={loginHref} className="block text-center mt-3 text-sm text-slate-500 hover:text-slate-900">
                    Já tenho conta
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
