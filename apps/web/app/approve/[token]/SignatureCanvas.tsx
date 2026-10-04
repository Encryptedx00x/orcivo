'use client';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Maximize2, X } from 'lucide-react';

interface Props {
  onSign: (dataUrl: string) => void;
}

/**
 * Finger/mouse signature pad. Pointer events + `touch-action: none` keep the page
 * from scrolling or selecting text while drawing; the canvas backing store follows
 * its rendered size so strokes land under the finger. A full-screen pad gives more
 * room on phones and hands the result back to the inline pad.
 */
export function SignatureCanvas({ onSign }: Props): JSX.Element {
  const inlineRef = useRef<HTMLCanvasElement>(null);
  const [full, setFull] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const commit = (canvas: HTMLCanvasElement | null, inked: boolean) => {
    setHasInk(inked);
    onSign(inked && canvas ? canvas.toDataURL('image/png') : '');
  };

  return (
    <div className="flex flex-col gap-2" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <Pad canvasRef={inlineRef} height={180} onChange={(c, inked) => commit(c, inked)} />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            clearCanvas(inlineRef.current);
            commit(null, false);
          }}
          className="text-sm text-gray-500 underline"
          style={{ minHeight: 40 }}
          disabled={!hasInk}
        >
          Limpar assinatura
        </button>
        <button
          type="button"
          onClick={() => setFull(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ minHeight: 40, color: '#6D28D9' }}
        >
          <Maximize2 size={16} aria-hidden="true" /> Assinar em tela cheia
        </button>
      </div>

      {full && (
        <FullScreenPad
          onCancel={() => setFull(false)}
          onDone={(source) => {
            const target = inlineRef.current;
            if (target) {
              clearCanvas(target);
              const ctx = target.getContext('2d');
              ctx?.drawImage(source, 0, 0, target.width, target.height);
            }
            setFull(false);
            commit(target, true);
          }}
        />
      )}
    </div>
  );
}

function clearCanvas(canvas: HTMLCanvasElement | null): void {
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
}

function Pad({
  canvasRef,
  height,
  onChange,
}: {
  canvasRef: RefObject<HTMLCanvasElement>;
  height: number | string;
  onChange: (canvas: HTMLCanvasElement, inked: boolean) => void;
}): JSX.Element {
  const drawing = useRef(false);

  // Match the backing store to the rendered size (× DPR) so strokes are crisp and aligned.
  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width === w && canvas.height === h) return;
    const previous = canvas.width && canvas.height ? canvas.toDataURL() : null;
    canvas.width = w;
    canvas.height = h;
    if (previous) {
      const img = new Image();
      img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      img.src = previous;
    }
  }, [canvasRef]);

  useEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  return (
    <canvas
      ref={canvasRef}
      aria-label="Área de assinatura"
      className="border border-gray-300 rounded-md bg-white w-full"
      style={{ height, touchAction: 'none', cursor: 'crosshair', display: 'block' }}
      onPointerDown={(e) => {
        e.preventDefault();
        const canvas = e.currentTarget;
        canvas.setPointerCapture(e.pointerId);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { x, y } = point(e);
        ctx.strokeStyle = '#0A0A0F';
        ctx.lineWidth = 2.5 * (window.devicePixelRatio || 1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        drawing.current = true;
        document.body.style.userSelect = 'none';
      }}
      onPointerMove={(e) => {
        if (!drawing.current) return;
        e.preventDefault();
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        const { x, y } = point(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }}
      onPointerUp={(e) => {
        if (!drawing.current) return;
        drawing.current = false;
        document.body.style.userSelect = '';
        onChange(e.currentTarget, true);
      }}
      onPointerCancel={() => {
        drawing.current = false;
        document.body.style.userSelect = '';
      }}
    />
  );
}

function FullScreenPad({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (canvas: HTMLCanvasElement) => void;
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  const [inked, setInked] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assinar em tela cheia"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))',
        gap: 12,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 18 }}>Assine abaixo</strong>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onCancel}
          style={{ width: 44, height: 44, border: 0, background: 'transparent', cursor: 'pointer' }}
        >
          <X size={22} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Pad canvasRef={ref} height="100%" onChange={() => setInked(true)} />
        {!inked && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              fontSize: 16,
              pointerEvents: 'none',
            }}
          >
            Use o dedo para assinar
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            clearCanvas(ref.current);
            setInked(false);
          }}
          style={fullBtn('#fff', '#0A0A0F', '1px solid #E2E8F0')}
        >
          Limpar
        </button>
        <button
          type="button"
          disabled={!inked}
          onClick={() => ref.current && onDone(ref.current)}
          style={{ ...fullBtn('#6D28D9', '#fff', '0'), opacity: inked ? 1 : 0.5 }}
        >
          Concluir assinatura
        </button>
      </div>
    </div>
  );
}

function fullBtn(background: string, color: string, border: string): React.CSSProperties {
  return {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    border,
    background,
    color,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  };
}
