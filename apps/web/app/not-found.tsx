import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound(): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        fontFamily: 'var(--font-sans, system-ui)',
        textAlign: 'center',
      }}
    >
      <SearchX size={40} color="#94A3B8" />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0F', margin: 0 }}>
        Página não encontrada.
      </h1>
      <p style={{ color: '#64748B', fontSize: 14, margin: 0, maxWidth: 420 }}>
        O endereço acessado não existe ou foi movido.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 8,
          height: 40,
          padding: '0 16px',
          borderRadius: 10,
          background: '#6D28D9',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          display: 'inline-flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}
      >
        Ir para o início
      </Link>
    </div>
  );
}
