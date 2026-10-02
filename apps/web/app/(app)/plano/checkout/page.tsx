import { redirect } from 'next/navigation';
import { readCheckoutIntent } from '../../../(auth)/checkout-intent';
import { CheckoutForm } from './checkout-form';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

// Checkout real: roda dentro do app, já autenticado (o middleware envia quem
// não tem sessão para /login). plan/cycle chegam do site via /signup ou /login.
export default function CheckoutPage({ searchParams }: PageProps): JSX.Element {
  const first = (name: string): string | null => {
    const v = searchParams[name];
    return (Array.isArray(v) ? v[0] : v) ?? null;
  };
  const intent = readCheckoutIntent({ get: first });
  if (!intent) redirect('/plano');

  return (
    <div className="ov-page" style={{ maxWidth: 720 }}>
      <CheckoutForm initialPlan={intent.plan} initialCycle={intent.cycle} />
    </div>
  );
}
