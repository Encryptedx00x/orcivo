'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Move, Save, Trash2, X } from 'lucide-react';
import { calculateLogoCrop, LOGO_OUTPUT_HEIGHT, LOGO_OUTPUT_WIDTH } from './logo-crop';

interface PendingLogo {
  file: File;
  source: CanvasImageSource;
  width: number;
  height: number;
  previewUrl: string;
  close?: () => void;
}

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function decodeLogo(file: File): Promise<PendingLogo> {
  const previewUrl = URL.createObjectURL(file);
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        file,
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        previewUrl,
        close: () => bitmap.close(),
      };
    } catch {
      // Safari versions without the orientation option use the HTMLImageElement fallback.
    }
  }
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () =>
      resolve({
        file,
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        previewUrl,
      });
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error('image'));
    };
    image.src = previewUrl;
  });
}

function paintLogo(
  canvas: HTMLCanvasElement,
  pending: PendingLogo,
  zoom: number,
  positionX: number,
  positionY: number,
): void {
  canvas.width = LOGO_OUTPUT_WIDTH;
  canvas.height = LOGO_OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const crop = calculateLogoCrop(pending.width, pending.height, zoom, positionX, positionY);
  ctx.drawImage(
    pending.source,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), type, quality),
  );
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
  const [pending, setPending] = useState<PendingLogo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const say = (m: string, isError = false) => {
    if (isError) setError(m);
    else setError('');
    onMessage?.(m);
  };

  useEffect(() => {
    if (!pending || !canvas.current) return;
    paintLogo(canvas.current, pending, zoom, positionX, positionY);
  }, [pending, positionX, positionY, zoom]);

  useEffect(
    () => () => {
      if (!pending) return;
      pending.close?.();
      URL.revokeObjectURL(pending.previewUrl);
    },
    [pending],
  );

  const choose = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      say('Use uma imagem PNG, JPG ou WebP.', true);
      return;
    }
    try {
      setPending(await decodeLogo(file));
      setZoom(1);
      setPositionX(0);
      setPositionY(0);
      say('Ajuste o enquadramento antes de salvar.');
    } catch {
      say('Não foi possível ler essa imagem. Tente outra.', true);
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const cancelCrop = () => {
    setPending(null);
    setZoom(1);
    setPositionX(0);
    setPositionY(0);
    say('Edição cancelada. O logo atual não foi alterado.');
  };

  const upload = async () => {
    if (!pending || !canvas.current) return;
    setBusy(true);
    try {
      paintLogo(canvas.current, pending, zoom, positionX, positionY);
      const preferredType = pending.file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      let blob = await canvasBlob(canvas.current, preferredType, 0.9);
      if (blob.size > 2 * 1024 * 1024) blob = await canvasBlob(canvas.current, 'image/webp', 0.88);
      if (blob.size > 2 * 1024 * 1024) throw new Error('size');
      const form = new FormData();
      const extension =
        blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
      form.append('file', new File([blob], `logo.${extension}`, { type: blob.type }));
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
      setPending(null);
      say('Logo atualizado. Ele aparece nos próximos PDFs.');
    } catch {
      say('Não foi possível preparar o logo. Ajuste o recorte ou use outra imagem.', true);
    } finally {
      setBusy(false);
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
      {pending && (
        <div
          role="dialog"
          aria-label="Ajustar logo"
          style={{
            border: '1px solid #DDD6FE',
            background: '#FAF5FF',
            borderRadius: large ? 20 : 14,
            padding: large ? 18 : 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <strong style={{ display: 'block', color: '#0A0A0F', fontSize: large ? 18 : 15 }}>
              Ajuste o enquadramento
            </strong>
            <span style={{ color: '#64748B', fontSize: large ? 15 : 13 }}>
              O recorte abaixo é o que aparecerá nos documentos.
            </span>
          </div>
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              aspectRatio: '2 / 1',
              background: '#FFFFFF',
              border: '2px solid #6D28D9',
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(76, 29, 149, 0.12)',
            }}
          >
            <canvas
              ref={canvas}
              aria-label="Prévia do logo recortado"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
          <label style={{ display: 'grid', gap: 6, color: '#334155', fontWeight: 600 }}>
            Zoom · {zoom.toFixed(1)}×
            <input
              aria-label="Zoom do logo"
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              style={{ accentColor: '#6D28D9', width: '100%' }}
            />
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <label style={{ display: 'grid', gap: 6, color: '#334155', fontWeight: 600 }}>
              Posição horizontal
              <input
                aria-label="Posição horizontal do logo"
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={positionX}
                onChange={(event) => setPositionX(Number(event.target.value))}
                style={{ accentColor: '#6D28D9', width: '100%' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#334155', fontWeight: 600 }}>
              Posição vertical
              <input
                aria-label="Posição vertical do logo"
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={positionY}
                onChange={(event) => setPositionY(Number(event.target.value))}
                style={{ accentColor: '#6D28D9', width: '100%' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void upload()}
              style={{ ...btn, border: 'none', background: '#6D28D9', color: '#FFFFFF' }}
            >
              <Save size={large ? 21 : 16} aria-hidden="true" />
              {busy ? 'Salvando…' : 'Salvar logo'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelCrop}
              style={{
                ...btn,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
              }}
            >
              <X size={large ? 20 : 15} aria-hidden="true" /> Cancelar
            </button>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#64748B',
              fontSize: 13,
            }}
          >
            <Move size={15} aria-hidden="true" /> Use os controles para reposicionar e ampliar.
          </span>
        </div>
      )}
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
              {pending ? 'Escolher outra imagem' : url ? 'Trocar logo' : 'Enviar logo'}
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
        onChange={(e) => void choose(e.target.files?.[0])}
      />
    </div>
  );
}
