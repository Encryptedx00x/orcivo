'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.orcivo.com.br';

// Checkout real roda dentro do app (autenticado) — este page.tsx só existe
// para preservar links antigos/externos a /checkout e redirecionar para o
// fluxo correto (signup com plan/cycle propagados).
function CheckoutRedirect() {
  const params = useSearchParams();

  useEffect(() => {
    const plan = params.get('plan') ?? '';
    const cycle = params.get('cycle') ?? 'YEARLY';
    const query = plan
      ? `?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}`
      : '';
    window.location.href = `${APP_URL}/signup${query}`;
  }, [params]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-slate-500">Redirecionando para o checkout...</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <CheckoutRedirect />
    </Suspense>
  );
}
