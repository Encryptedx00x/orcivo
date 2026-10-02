'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSubscription } from './actions';

export function CancelButton(): JSX.Element {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const confirm = (): void => {
    setError('');
    setPending(true);
    void cancelSubscription().then((result) => {
      setPending(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{
          background: 'none',
          border: '1px solid #FCA5A5',
          color: '#B91C1C',
          borderRadius: 9,
          height: 36,
          padding: '0 14px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Cancelar assinatura
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirmar cancelamento">
      <p style={{ fontSize: 13, color: '#334155', margin: '0 0 10px' }}>
        Tem certeza? A cobrança recorrente será encerrada.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          style={{
            background: '#DC2626',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            height: 36,
            padding: '0 14px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: pending ? 'default' : 'pointer',
          }}
        >
          {pending ? 'Cancelando...' : 'Sim, cancelar'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          style={{
            background: 'none',
            border: '1px solid #E2E8F0',
            borderRadius: 9,
            height: 36,
            padding: '0 14px',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Manter assinatura
        </button>
      </div>
      {error && (
        <p role="alert" style={{ color: '#DC2626', fontSize: 13, margin: '10px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
