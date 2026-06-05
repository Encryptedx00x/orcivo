'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Orcivo Livre',
    code: 'LIVRE',
    monthly: 'GrÃ¡tis',
    yearly: 'GrÃ¡tis',
    monthlyVal: null,
    yearlyVal: null,
    features: ['5 clientes', '10 orÃ§amentos/mÃªs', 'GeraÃ§Ã£o de PDF com marca d\'Ã¡gua', 'Suporte por e-mail'],
    highlight: false,
    cta: 'Criar conta grÃ¡tis',
    href: 'https://app.orcivo.com.br/signup',
  },
  {
    name: 'Orcivo Solo',
    code: 'SOLO',
    monthly: 'R$9,90/mÃªs',
    yearly: 'R$79,90/ano',
    monthlyVal: 'SOLO_MONTHLY',
    yearlyVal: 'SOLO_YEARLY',
    features: ['50 clientes', '50 orÃ§amentos/mÃªs', 'PDF sem marca d\'Ã¡gua', 'Logo prÃ³pria no PDF', 'Suporte prioritÃ¡rio'],
    highlight: false,
    cta: 'Assinar agora',
    href: null,
  },
  {
    name: 'Orcivo Mais',
    code: 'MAIS',
    monthly: 'R$19,90/mÃªs',
    yearly: 'R$199,90/ano',
    monthlyVal: 'MAIS_MONTHLY',
    yearlyVal: 'MAIS_YEARLY',
    features: ['200 clientes', '200 orÃ§amentos/mÃªs', 'RelatÃ³rios financeiros', 'AtÃ© 3 membros na equipe', 'Suporte prioritÃ¡rio'],
    highlight: true,
    cta: 'Assinar agora',
    href: null,
  },
  {
    name: 'Orcivo Equipe',
    code: 'EQUIPE',
    monthly: 'R$39,90/mÃªs',
    yearly: 'R$399,90/ano',
    monthlyVal: 'EQUIPE_MONTHLY',
    yearlyVal: 'EQUIPE_YEARLY',
    features: ['Uso amplo de clientes', 'Uso amplo de orÃ§amentos', 'Contratos digitais', 'AtÃ© 10 membros', 'Suporte VIP'],
    highlight: false,
    cta: 'Assinar agora',
    href: null,
  },
];

export default function PlanosPage() {
  const [cycle, setCycle] = useState<'yearly' | 'monthly'>('yearly');

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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Planos e preÃ§os</h1>
          <p className="text-xl text-slate-600 mb-8">Comece grÃ¡tis. FaÃ§a upgrade quando precisar.</p>

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
              Anual <span className="text-green-600 text-xs font-semibold ml-1">-30%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = cycle === 'yearly' ? plan.yearly : plan.monthly;
            const planCode = cycle === 'yearly' ? plan.yearlyVal : plan.monthlyVal;
            const href = plan.href ?? (planCode ? `/checkout?plan=${planCode}&cycle=${cycle.toUpperCase()}` : '/checkout');

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
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500">Â© 2026 Orcivo</span>
          <nav className="flex gap-6">
            <Link href="/termos" className="text-sm text-slate-500 hover:text-slate-900">Termos de Uso</Link>
            <Link href="/privacidade" className="text-sm text-slate-500 hover:text-slate-900">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

