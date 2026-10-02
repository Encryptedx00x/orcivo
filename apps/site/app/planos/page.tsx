'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

// O checkout roda dentro do app (autenticado): o site só leva ao signup/login
// com plan/cycle na query string.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.orcivo.com.br';

const plans = [
  {
    name: 'Orcivo Livre',
    code: 'LIVRE',
    monthly: 'Grátis',
    yearly: 'Grátis',
    features: ['5 clientes', '10 orçamentos/mês', 'PDF com marca d\'água', 'Suporte por e-mail'],
    highlight: false,
    cta: 'Criar conta grátis',
  },
  {
    name: 'Orcivo Solo',
    code: 'SOLO',
    monthly: 'R$9,90/mês',
    yearly: 'R$79,90/ano',
    features: ['50 clientes', '50 orçamentos/mês', 'PDF sem marca d\'água', 'Logo própria no PDF', 'Suporte prioritário'],
    highlight: false,
    cta: 'Assinar agora',
  },
  {
    name: 'Orcivo Mais',
    code: 'MAIS',
    monthly: 'R$24,90/mês',
    yearly: 'R$199,90/ano',
    features: ['200 clientes', '200 orçamentos/mês', 'Relatórios financeiros', 'Até 3 membros na equipe', 'Suporte prioritário'],
    highlight: true,
    cta: 'Assinar agora',
  },
  {
    name: 'Orcivo Equipe',
    code: 'EQUIPE',
    monthly: 'R$49,90/mês',
    yearly: 'R$389,90/ano',
    features: ['Uso ampliado de clientes', 'Uso ampliado de orçamentos', 'Contratos digitais', 'Até 10 membros', 'Suporte VIP'],
    highlight: false,
    cta: 'Assinar agora',
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
              Anual <span className="text-green-600 text-xs font-semibold ml-1">-30%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = cycle === 'yearly' ? plan.yearly : plan.monthly;
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

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500">© 2026 Orcivo</span>
          <nav className="flex gap-6">
            <Link href="/termos" className="text-sm text-slate-500 hover:text-slate-900">Termos de Uso</Link>
            <Link href="/privacidade" className="text-sm text-slate-500 hover:text-slate-900">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
