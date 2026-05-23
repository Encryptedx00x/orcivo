'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function SignupPage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempToken, setTempToken] = useState('');

  const [s1, setS1] = useState({ name: '', email: '', phone: '', password: '', accepted_terms: false });
  const [s2, setS2] = useState({ trade_name: '', city: '', state: '' });

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/signup/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s1, accepted_terms: true }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message ?? 'Erro ao criar conta.'); setLoading(false); return; }
    setTempToken(data.access_token);
    setStep(2);
    setLoading(false);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/signup/company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-signup-token': tempToken },
      body: JSON.stringify(s2),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message ?? 'Erro ao criar empresa.'); setLoading(false); return; }
    router.push('/clientes'); router.refresh();
  };

  return (
    <div style={{ width: 400, padding: 32, border: '1px solid #E5E7EB', borderRadius: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', marginBottom: 4 }}>
        {step === 1 ? 'Criar conta' : 'Dados da empresa'}
      </h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
        {step === 1 ? 'Passo 1 de 2 — seus dados' : 'Passo 2 de 2 — sua empresa'}
      </p>

      {step === 1 ? (
        <form onSubmit={handleStep1}>
          <input style={inp} placeholder="Nome completo" value={s1.name} onChange={e => setS1(p => ({ ...p, name: e.target.value }))} required />
          <input style={inp} type="email" placeholder="E-mail" value={s1.email} onChange={e => setS1(p => ({ ...p, email: e.target.value }))} required />
          <input style={inp} type="tel" placeholder="Telefone (opcional)" value={s1.phone} onChange={e => setS1(p => ({ ...p, phone: e.target.value }))} />
          <input style={inp} type="password" placeholder="Senha (mín. 8 caracteres)" value={s1.password} onChange={e => setS1(p => ({ ...p, password: e.target.value }))} required minLength={8} />
          {error && <p style={err}>{error}</p>}
          <button style={btn} type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Continuar'}</button>
        </form>
      ) : (
        <form onSubmit={handleStep2}>
          <input style={inp} placeholder="Nome da empresa" value={s2.trade_name} onChange={e => setS2(p => ({ ...p, trade_name: e.target.value }))} required />
          <input style={inp} placeholder="Cidade" value={s2.city} onChange={e => setS2(p => ({ ...p, city: e.target.value }))} />
          <select style={inp} value={s2.state} onChange={e => setS2(p => ({ ...p, state: e.target.value }))}>
            <option value="">Estado (opcional)</option>
            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          {error && <p style={err}>{error}</p>}
          <button style={btn} type="submit" disabled={loading}>{loading ? 'Criando conta...' : 'Criar conta'}</button>
        </form>
      )}

      <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
        Já tem conta? <Link href="/login" style={{ color: '#6D28D9' }}>Entrar</Link>
      </p>
    </div>
  );
}

const inp: React.CSSProperties = { display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 15, boxSizing: 'border-box', backgroundColor: '#fff' };
const btn: React.CSSProperties = { width: '100%', backgroundColor: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
const err: React.CSSProperties = { color: '#DC2626', fontSize: 13, marginBottom: 8 };
