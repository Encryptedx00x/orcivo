'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/forgot-password/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? 'Não foi possível enviar o e-mail. Tente novamente.');
        return;
      }
      setSent(true);
    } catch {
      setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div data-testid="forgot-sent">
        <h1 style={title}>Verifique seu e-mail</h1>
        <p style={subtitle}>
          Se <strong>{email.trim()}</strong> estiver cadastrado, enviamos um link para redefinir sua
          senha. O link vale por 15 minutos.
        </p>
        <Link href="/login" style={linkStyle}>
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={title}>Esqueci minha senha</h1>
      <p style={subtitle}>
        Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl} htmlFor="email">
            E-mail
          </label>
          <div style={inputWrap}>
            <Mail size={18} style={leadingIcon} />
            <input
              id="email"
              style={inp}
              type="email"
              placeholder="joao@exemplo.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button style={btn} type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link de redefinição'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/login" style={linkStyle}>
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}

const title: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: '#0A0A0F',
  marginBottom: 4,
  letterSpacing: '-0.015em',
};
const subtitle: React.CSSProperties = { fontSize: 14, color: '#64748B', marginBottom: 28 };
const linkStyle: React.CSSProperties = {
  color: '#6D28D9',
  fontWeight: 600,
  fontSize: 14,
  textDecoration: 'none',
};
const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};
const inputWrap: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};
const leadingIcon: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  color: '#94A3B8',
  pointerEvents: 'none',
};
const inp: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 52,
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '0 12px 0 44px',
  fontSize: 16,
  boxSizing: 'border-box',
  outline: 'none',
  color: '#0A0A0F',
  backgroundColor: '#fff',
  fontFamily: 'inherit',
};
const btn: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#6D28D9',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  height: 52,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
