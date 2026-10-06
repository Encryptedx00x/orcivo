import { formatMoney } from '@orcivo/shared-types';
import { QrCode } from 'lucide-react';
import { methodLabel, receiptDate, receiptNo, receiptRef, type Receipt } from '../lib/receipts';

/** On-screen receipt, same layout as the PDF ("Recibo Papel"). */
export function ReceiptPaper({
  receipt,
  company,
  large,
}: {
  receipt: Receipt;
  company: {
    trade_name: string;
    logo_url?: string | null;
    document?: string | null;
    document_type?: string | null;
    pix_key?: string | null;
  };
  large?: boolean;
}): React.JSX.Element {
  const initials =
    company.trade_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'O';
  const signed = !!receipt.receipt_signature_key;
  const signatureUrl = receipt.receipt_signature_url;
  const sm = large ? 14 : 13;
  const body = large ? 17 : 15;
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: large ? 20 : 16,
        padding: large ? 24 : 18,
        display: 'flex',
        flexDirection: 'column',
        gap: large ? 16 : 12,
        color: '#0A0A0F',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logo_url}
            alt=""
            style={{ height: 44, maxWidth: 120, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#0A0A0F',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: large ? 17 : 15, fontWeight: 700, lineHeight: 1.3 }}>
            {company.trade_name}
          </span>
          {company.document && (
            <span style={{ fontSize: sm, color: '#475569' }}>
              {company.document_type ?? 'Documento'} {company.document}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: sm, fontWeight: 600, color: '#475569' }}>
        Recibo nº {receiptNo(receipt.receipt_number)}
      </span>
      <div style={{ height: 1, background: '#F1F5F9' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: sm, fontWeight: 600, color: '#475569' }}>Valor recebido</span>
        <span
          style={{
            fontSize: large ? 34 : 28,
            lineHeight: 1.2,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMoney(receipt.amount)}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: body, lineHeight: 1.5 }}>
        Recebi de <strong>{receipt.customer.name}</strong> o valor acima, referente a{' '}
        {receiptRef(receipt)}.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: sm, color: '#475569' }}>Forma de pagamento</span>
          <span style={{ fontSize: body, fontWeight: 600 }}>{methodLabel(receipt.method)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: sm, color: '#475569' }}>Data</span>
          <span style={{ fontSize: body, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {receiptDate(receipt)}
          </span>
        </div>
      </div>
      {signed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureUrl}
              alt="Assinatura do técnico"
              style={{ height: 56, objectFit: 'contain', alignSelf: 'flex-start' }}
            />
          ) : (
            <span style={{ fontSize: 26, fontStyle: 'italic', color: '#1E293B', padding: '0 8px' }}>
              {receipt.receipt_signer_name ?? 'Assinado'}
            </span>
          )}
          <div style={{ height: 1, background: '#94A3B8' }} />
          <span style={{ fontSize: sm, color: '#475569' }}>
            {receipt.receipt_signer_name ? `${receipt.receipt_signer_name} · Técnico` : 'Técnico'}
          </span>
        </div>
      )}
      {company.pix_key && (
        <div
          style={{
            borderRadius: 12,
            background: '#F8FAFC',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#334155',
          }}
        >
          <QrCode size={20} aria-hidden="true" />
          <span style={{ fontSize: sm, overflowWrap: 'anywhere' }}>
            Chave Pix: {company.pix_key}
          </span>
        </div>
      )}
    </div>
  );
}
