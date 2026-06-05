'use client';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

const PLAN_LABELS: Record<string, string> = {
  SOLO_MONTHLY: 'Orcivo Solo — Mensal — R$9,90/mês',
  SOLO_YEARLY:  'Orcivo Solo — Anual — R$79,90/ano',
  MAIS_MONTHLY: 'Orcivo Mais — Mensal — R$19,90/mês',
  MAIS_YEARLY:  'Orcivo Mais — Anual — R$199,90/ano',
  EQUIPE_MONTHLY: 'Orcivo Equipe — Mensal — R$39,90/mês',
  EQUIPE_YEARLY:  'Orcivo Equipe — Anual — R$399,90/ano',
};

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = params.get('plan') ?? '';
  const cycle = params.get('cycle') ?? 'YEARLY';
  const planKey = plan.includes('_') ? plan : `${plan}_${cycle}`;
  const planLabel = PLAN_LABELS[planKey] ?? plan;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(paymentMethod: 'PIX' | 'CREDIT_CARD') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.orcivo.com.br'}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan_code: planKey, payment_method: paymentMethod }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Erro ao processar pagamento.');
      }
      router.push('/checkout/success');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-16 px-6">
      <Link href="/planos" className="text-sm text-primary-600 hover:underline mb-8 inline-block">
        ← Voltar aos planos
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Finalizar assinatura</h1>
      <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-200">
        <p className="text-sm text-gray-500 mb-1">Plano selecionado</p>
        <p className="font-semibold text-gray-900">{planLabel || 'Selecione um plano'}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => handleCheckout('PIX')}
          disabled={loading || !plan}
          className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Aguarde...' : 'Pagar com PIX'}
        </button>
        <button
          onClick={() => handleCheckout('CREDIT_CARD')}
          disabled={loading || !plan}
          className="w-full py-3 border border-primary-600 text-primary-600 font-semibold rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Aguarde...' : 'Pagar com Cartão'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-6 text-center">Pagamento processado com segurança via Asaas.</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">Orcivo</Link>
        </div>
      </header>
      <Suspense fallback={<div className="py-16 text-center text-gray-500">Carregando...</div>}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
