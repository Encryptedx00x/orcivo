'use client';
import { useState } from 'react';
import { formatMoney } from '@orcivo/shared-types';
import { PixPaymentView } from './PixPaymentView';
import type { PendingPix } from './actions';

export function PendingPixBanner({ pix }: { pix: PendingPix }): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="status"
      style={{
        background: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <strong style={{ fontSize: 14, color: '#92400E' }}>Pagamento Pix pendente</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#92400E' }}>
            Você ainda não pagou o Pix de {formatMoney(pix.amount)}. Pague para ativar o plano — o
            card &ldquo;Plano atual&rdquo; abaixo só vira realmente ativo depois da confirmação.
          </p>
        </div>
        <button
          type="button"
          className="ov-btn ov-btn-outline"
          onClick={() => setOpen((v) => !v)}
          style={{ flexShrink: 0 }}
        >
          {open ? 'Ocultar Pix' : 'Ver Pix pendente'}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          <PixPaymentView pix={pix} />
        </div>
      )}
    </div>
  );
}
