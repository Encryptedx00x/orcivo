import {
  formatMoney,
  maskCpfCnpj,
  maskPhone,
  resolveReceiptDocOptions,
} from '@orcivo/shared-types';
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
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    instagram?: string | null;
    website?: string | null;
    professional_registration?: string | null;
    document_footer?: string | null;
  };
  large?: boolean;
}): React.JSX.Element {
  const c = receipt.customer;
  const opts = resolveReceiptDocOptions(receipt.receipt_doc_options);
  const paidDate = receiptDate(receipt);
  const parties = [
    {
      title: 'Quem recebeu',
      name: company.trade_name,
      lines: opts.company_details
        ? partyLines(company.document, company.phone, [
            company.address,
            [company.city, company.state].filter(Boolean).join('/'),
          ])
        : [],
    },
    {
      title: 'Quem pagou',
      name: c.name,
      lines: opts.client_details
        ? partyLines(c.tax_id, c.phone, [
            [c.street, c.number].filter(Boolean).join(', '),
            c.neighborhood,
            [c.city, c.state].filter(Boolean).join('/'),
          ])
        : [],
    },
  ];
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
          {opts.company_details && company.document && (
            <span style={{ fontSize: sm, color: '#475569' }}>
              {company.document_type ?? 'Documento'} {company.document}
            </span>
          )}
          {opts.company_details && (company.phone || company.address) && (
            <span style={{ fontSize: sm, color: '#475569', overflowWrap: 'anywhere' }}>
              {[company.phone ? maskPhone(company.phone) : '', company.address]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {opts.company_details && (company.instagram || company.website) && (
            <span style={{ fontSize: sm, color: '#475569', overflowWrap: 'anywhere' }}>
              {[
                company.instagram ? `@${company.instagram.replace(/^@/, '')}` : '',
                company.website ?? '',
              ]
                .filter(Boolean)
                .join(' · ')}
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
        Declaro que recebi de <strong>{receipt.customer.name}</strong> o valor de{' '}
        <strong>{formatMoney(receipt.amount)}</strong>, referente a {receiptRef(receipt)}, em{' '}
        {paidDate}.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        {parties.map((p) => (
          <div
            key={p.title}
            style={{
              borderRadius: 12,
              background: '#F8FAFC',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: sm, fontWeight: 600, color: '#475569' }}>{p.title}</span>
            <span style={{ fontSize: body, fontWeight: 700, overflowWrap: 'anywhere' }}>
              {p.name}
            </span>
            {p.lines.map((l) => (
              <span key={l} style={{ fontSize: sm, color: '#475569', overflowWrap: 'anywhere' }}>
                {l}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: opts.payment_details ? '1fr 1fr' : '1fr',
          gap: 12,
        }}
      >
        {opts.payment_details && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: sm, color: '#475569' }}>Forma de pagamento</span>
            <span style={{ fontSize: body, fontWeight: 600 }}>{methodLabel(receipt.method)}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: sm, color: '#475569' }}>Data</span>
          <span style={{ fontSize: body, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {paidDate}
          </span>
        </div>
      </div>
      {opts.additional_info && receipt.receipt_additional_info && (
        <div
          style={{
            borderRadius: 12,
            background: '#F8FAFC',
            padding: '10px 12px',
            color: '#334155',
          }}
        >
          <strong style={{ display: 'block', fontSize: sm, marginBottom: 4 }}>
            Informações adicionais
          </strong>
          <span style={{ fontSize: sm, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {receipt.receipt_additional_info}
          </span>
        </div>
      )}
      {signed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
          {signatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signatureUrl}
              alt="Assinatura do responsável"
              style={{ height: 56, objectFit: 'contain', alignSelf: 'flex-start' }}
            />
          ) : (
            <span style={{ fontSize: 26, fontStyle: 'italic', color: '#1E293B', padding: '0 8px' }}>
              {receipt.receipt_signer_name ?? 'Assinado'}
            </span>
          )}
          <div style={{ height: 1, background: '#94A3B8' }} />
          <span style={{ fontSize: sm, color: '#475569' }}>
            {[receipt.receipt_signer_name, 'Responsável', company.professional_registration]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      )}
      {opts.pix && company.pix_key && (
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
      {opts.footer && company.document_footer && (
        <p style={{ margin: 0, textAlign: 'center', fontSize: sm, color: '#475569' }}>
          {company.document_footer}
        </p>
      )}
    </div>
  );
}

/** Document, phone and address of a party, formatted; empty parts are skipped. */
function partyLines(
  document: string | null | undefined,
  phone: string | null | undefined,
  address: Array<string | null | undefined>,
): string[] {
  const doc = document ? maskCpfCnpj(document) : '';
  return [
    doc ? `${doc.length > 14 ? 'CNPJ' : 'CPF'} ${doc}` : '',
    phone ? maskPhone(phone) : '',
    address.filter(Boolean).join(' · '),
  ].filter(Boolean);
}
