'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  startCheckout,
  type CheckoutPix,
  type CycleCode,
  type MethodCode,
  type PaidPlanCode,
} from '../actions';
import { PLANS, findPlan, priceLabel } from '../plans';
import { PixPaymentView } from '../PixPaymentView';

const PAID = PLANS.filter((p) => p.code !== 'LIVRE');

const METHOD_LABEL: Record<MethodCode, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
};

const card: React.CSSProperties = {
  border: '1px solid #E2E8F0',
  borderRadius: 14,
  padding: 20,
  background: '#fff',
};

function choiceStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: active ? '2px solid #6D28D9' : '1px solid #E2E8F0',
    background: active ? '#F5F3FF' : '#fff',
    color: active ? '#4C1D95' : '#334155',
  };
}

export function CheckoutForm(props: {
  initialPlan: PaidPlanCode;
  initialCycle: CycleCode;
}): JSX.Element {
  const router = useRouter();
  const [plan, setPlan] = useState<PaidPlanCode>(props.initialPlan);
  const [cycle, setCycle] = useState<CycleCode>(props.initialCycle);
  const [method, setMethod] = useState<MethodCode>('PIX');
  const [error, setError] = useState('');
  const [pix, setPix] = useState<CheckoutPix | null>(null);
  const [pending, setPending] = useState(false);

  const meta = findPlan(plan);

  const submit = (): void => {
    setError('');
    setPending(true);
    void startCheckout({ plan, cycle, method }).then((result) => {
      if (!result.ok) {
        setPending(false);
        setError(result.message);
        return;
      }
      if (result.checkoutUrl) {
        // Cartão: o pagador conclui a autorização no checkout hospedado e volta ao app.
        window.location.href = result.checkoutUrl;
        return;
      }
      setPending(false);
      if (result.pix) {
        setPix(result.pix);
        return;
      }
      router.push('/plano?checkout=ok');
      router.refresh();
    });
  };

  if (pix) {
    return (
      <div style={card} data-testid="checkout-pix">
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Pague com Pix</h1>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Escaneie o QR Code ou copie o código. Sua assinatura é ativada assim que o pagamento for
          confirmado.
        </p>
        <PixPaymentView pix={pix} />
        <div style={{ marginTop: 16 }}>
          <Link
            href="/plano?checkout=ok"
            style={{ color: '#6D28D9', fontWeight: 600, fontSize: 14 }}
          >
            Ir para Gerenciar assinatura
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#0A0A0F' }}>
        Assinar {meta?.name ?? 'plano'}
      </h1>
      <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
        Confira o plano e escolha como pagar. Você pode trocar de plano ou cancelar quando quiser em
        Gerenciar assinatura.
      </p>

      <div style={{ margin: '16px 0 6px', fontSize: 13, fontWeight: 600 }}>Plano</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PAID.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => setPlan(p.code as PaidPlanCode)}
            style={choiceStyle(p.code === plan)}
            aria-pressed={p.code === plan}
          >
            {p.name.replace('Orcivo ', '')}
          </button>
        ))}
      </div>

      <div style={{ margin: '16px 0 6px', fontSize: 13, fontWeight: 600 }}>Ciclo</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['MONTHLY', 'YEARLY'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            style={choiceStyle(c === cycle)}
            aria-pressed={c === cycle}
          >
            {c === 'MONTHLY' ? 'Mensal' : 'Anual'}
          </button>
        ))}
      </div>

      <div style={{ margin: '16px 0 6px', fontSize: 13, fontWeight: 600 }}>Forma de pagamento</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {(Object.keys(METHOD_LABEL) as MethodCode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            style={choiceStyle(m === method)}
            aria-pressed={m === method}
          >
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 14, color: '#334155' }}>Total</span>
        <strong style={{ fontSize: 20 }} data-testid="checkout-total">
          {priceLabel(plan, cycle)}
        </strong>
      </div>

      {error && (
        <p role="alert" style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        style={{
          width: '100%',
          marginTop: 16,
          height: 48,
          borderRadius: 12,
          border: 'none',
          background: '#6D28D9',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: pending ? 'default' : 'pointer',
        }}
      >
        {pending ? 'Processando...' : 'Confirmar assinatura'}
      </button>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Link href="/plano" style={{ color: '#64748B', fontSize: 13 }}>
          Voltar
        </Link>
      </div>
    </div>
  );
}
