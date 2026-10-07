'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

/** Phone photos are several MB; a logo reads fine at 1024px (keeps it under the 2 MB limit). */
function downscale(file: File, max = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // PNG keeps transparent backgrounds; JPEG for photos.
      const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), type, 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

/**
 * Upload / remove the company logo (shown on quote, service and receipt PDFs).
 * Used by Configurações in both the full and the easy mode.
 */
export function LogoField({
  initialUrl,
  tradeName,
  large,
  onMessage,
}: {
  initialUrl: string | null;
  tradeName: string;
  large?: boolean;
  onMessage?: (msg: string) => void;
}): React.JSX.Element {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const say = (m: string, isError = false) => {
    if (isError) setError(m);
    else setError('');
    onMessage?.(m);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await downscale(file);
      const form = new FormData();
      form.append(
        'file',
        new File([blob], blob.type === 'image/jpeg' ? 'logo.jpg' : 'logo.png', { type: blob.type }),
      );
      const res = await fetch('/api/company/logo', { method: 'PUT', body: form });
      const data = (await res.json().catch(() => null)) as {
        logo_url?: string | null;
        message?: string;
      } | null;
      if (!res.ok) {
        say(
          res.status === 403
            ? 'Só o dono da empresa pode trocar o logo.'
            : 'Não foi possível enviar o logo. Use PNG ou JPG.',
          true,
        );
        return;
      }
      setUrl(data?.logo_url ?? null);
      say('Logo atualizado. Ele aparece nos próximos PDFs.');
    } catch {
      say('Não foi possível ler essa imagem. Tente outra.', true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    const res = await fetch('/api/company/logo', { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) return say('Não foi possível tirar o logo.', true);
    setUrl(null);
    say('Logo removido.');
  };

  const size = large ? 96 : 80;
  const initials =
    tradeName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'O';
  const btn: React.CSSProperties = {
    minHeight: large ? 56 : 40,
    borderRadius: large ? 16 : 10,
    padding: '0 16px',
    fontSize: large ? 17 : 14,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: busy ? 'wait' : 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 14,
            background: url ? '#FFFFFF' : '#F5F3FF',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6D28D9',
            fontWeight: 700,
            fontSize: 24,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Logo da empresa"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            initials
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 180px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              style={{ ...btn, border: 'none', background: '#6D28D9', color: '#FFFFFF' }}
            >
              <ImagePlus size={large ? 22 : 16} aria-hidden="true" />
              {busy ? 'Enviando…' : url ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {url && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                style={{
                  ...btn,
                  border: '1px solid #FECACA',
                  background: '#FFFFFF',
                  color: '#B91C1C',
                }}
              >
                <Trash2 size={large ? 20 : 15} aria-hidden="true" /> Tirar o logo
              </button>
            )}
          </div>
          <span style={{ fontSize: large ? 15 : 12, color: '#64748B' }}>
            PNG ou JPG. Fundo transparente ou branco fica melhor no PDF.
          </span>
        </div>
      </div>
      {error && (
        <p role="alert" style={{ margin: 0, color: '#B91C1C', fontSize: large ? 16 : 13 }}>
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => void upload(e.target.files?.[0])}
      />
    </div>
  );
}
