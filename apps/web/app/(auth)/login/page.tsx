'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!res.ok) { setError('E-mail ou senha inválidos.'); setLoading(false); return; }
    router.push('/clientes'); router.refresh();
  };

  return (
    <div style={{ width: 360, padding: 32, border: '1px solid #E5E7EB', borderRadius: 12 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0F', marginBottom: 24 }}>Entrar</h1>
      <form onSubmit={handleSubmit}>
        <input style={inp} type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inp} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <button style={btn} type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}><Link href="/signup" style={{ color: '#6D28D9' }}>Criar conta</Link></p>
    </div>
  );
}
const inp: React.CSSProperties = { display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 15, boxSizing: 'border-box' };
const btn: React.CSSProperties = { width: '100%', backgroundColor: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
