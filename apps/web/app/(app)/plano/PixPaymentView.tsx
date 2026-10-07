'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface PixPaymentData {
  qrCode: string;
  qrCodeBase64?: string | null;
  ticketUrl?: string | null;
}

export function PixPaymentView({ pix }: { pix: PixPaymentData }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API indisponível (http/permissão) — o textarea abaixo
      // ainda permite selecionar e copiar manualmente.
    }
  };

  return (
    <div>
      {pix.qrCodeBase64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="QR Code Pix"
          src={`data:image/png;base64,${pix.qrCodeBase64}`}
          style={{ width: 200, height: 200 }}
        />
      )}
      <textarea
        readOnly
        value={pix.qrCode}
        rows={3}
        style={{ width: '100%', fontSize: 12, marginTop: 12 }}
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="ov-btn ov-btn-outline"
        style={{ marginTop: 8, gap: 8 }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Código copiado' : 'Copiar código'}
      </button>
    </div>
  );
}
