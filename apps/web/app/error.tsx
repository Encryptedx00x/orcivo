'use client';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={40} color="#DC2626" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0F', margin: 0 }}>
            Algo deu errado.
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0, maxWidth: 420 }}>
            Não conseguimos carregar esta página. Tente novamente em alguns instantes.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 8,
              height: 40,
              padding: '0 16px',
              borderRadius: 10,
              border: 0,
              background: '#6D28D9',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
