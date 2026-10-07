'use client';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <div className="ov-card" style={{ padding: '56px 24px', textAlign: 'center' }} role="alert">
      <AlertTriangle
        size={40}
        style={{ margin: '0 auto 12px', color: '#DC2626', display: 'block' }}
      />
      <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', margin: '0 0 6px' }}>
        Não foi possível carregar esta página.
      </p>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px' }}>
        Ocorreu um erro ao buscar os dados. Verifique sua conexão e tente novamente.
      </p>
      <button
        className="ov-btn ov-btn-primary"
        style={{ display: 'inline-flex' }}
        onClick={() => reset()}
      >
        Tentar novamente
      </button>
    </div>
  );
}
