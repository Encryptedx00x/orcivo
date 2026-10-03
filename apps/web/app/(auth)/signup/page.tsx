'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Phone, Lock, Eye, EyeOff, Building, MapPin, Shield } from 'lucide-react';
import { LEGAL_DOCS_VERSION } from '@orcivo/shared-types';
import { intentQuery, postAuthPath, readCheckoutIntent } from '../checkout-intent';

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function SignupForm(): JSX.Element {
  const router = useRouter();
  const intent = readCheckoutIntent(useSearchParams());
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [s1, setS1] = useState({ name: '', email: '', phone: '', password: '' });
  const [s2, setS2] = useState({ trade_name: '', city: '', state: '' });

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setError('Você precisa aceitar os Termos de uso para continuar.'); return; }
    setLoading(true); setError('');
    const res = await fetch('/api/auth/signup/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...s1,
        accepted_terms: true,
        terms_version: LEGAL_DOCS_VERSION,
        privacy_version: LEGAL_DOCS_VERSION,
      }),
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
    router.push(postAuthPath(intent)); router.refresh();
  };

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 24 }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>
          Já tem conta?{' '}
          <Link href={`/login${intentQuery(intent)}`} style={{ color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
        </span>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        {[1, 2].map((n) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700,
              backgroundColor: n <= step ? '#6D28D9' : '#F1F5F9',
              color: n <= step ? '#fff' : '#94A3B8',
            }}>{n}</div>
            <span style={{ fontSize: 13, color: n === step ? '#0A0A0F' : '#94A3B8', fontWeight: n === step ? 600 : 400 }}>
              {n === 1 ? 'Sua conta' : 'Sua empresa'}
            </span>
            {n < 2 && <div style={{ width: 32, height: 1, backgroundColor: step > n ? '#6D28D9' : '#E2E8F0' }} />}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0A0A0F', marginBottom: 4, letterSpacing: '-0.015em' }}>Criar sua conta</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Em 1 minuto você já está fazendo seu primeiro orçamento.</p>

          <form onSubmit={handleStep1}>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Nome completo</label>
              <div style={inputWrap}>
                <User size={18} style={leadingIcon} />
                <input style={inp} placeholder="João Ribeiro" value={s1.name} onChange={e => setS1(p => ({ ...p, name: e.target.value }))} required />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>E-mail</label>
              <div style={inputWrap}>
                <Mail size={18} style={leadingIcon} />
                <input style={inp} type="email" placeholder="joao@exemplo.com.br" value={s1.email} onChange={e => setS1(p => ({ ...p, email: e.target.value }))} required />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Celular (opcional)</label>
              <div style={inputWrap}>
                <Phone size={18} style={leadingIcon} />
                <input style={inp} type="tel" placeholder="(11) 98123-4521" value={s1.phone} onChange={e => setS1(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Senha (mín. 8 caracteres)</label>
              <div style={inputWrap}>
                <Lock size={18} style={leadingIcon} />
                <input
                  style={{ ...inp, paddingRight: 44 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha forte"
                  value={s1.password}
                  onChange={e => setS1(p => ({ ...p, password: e.target.value }))}
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6D28D9', cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                Concordo com os{' '}
                <a href="https://orcivo.com.br/termos" target="_blank" rel="noopener noreferrer" style={{ color: '#6D28D9', textDecoration: 'underline' }}>Termos de uso</a>{' '}
                e a{' '}
                <a href="https://orcivo.com.br/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: '#6D28D9', textDecoration: 'underline' }}>Política de privacidade</a>.
              </span>
            </label>

            {error && <p style={errStyle}>{error}</p>}
            <button style={btn} type="submit" disabled={loading}>{loading ? 'Aguarde...' : 'Criar minha conta grátis'}</button>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12, color: '#94A3B8', fontSize: 12 }}>
              <Shield size={13} /> Sem cartão de crédito · cancele quando quiser
            </div>
          </form>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0A0A0F', marginBottom: 4, letterSpacing: '-0.015em' }}>Dados da empresa</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Aparecem no PDF dos orçamentos enviados ao cliente.</p>

          <form onSubmit={handleStep2}>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Nome da empresa *</label>
              <div style={inputWrap}>
                <Building size={18} style={leadingIcon} />
                <input style={inp} placeholder="Ribeiro Elétrica" value={s2.trade_name} onChange={e => setS2(p => ({ ...p, trade_name: e.target.value }))} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Cidade</label>
                <div style={inputWrap}>
                  <MapPin size={18} style={leadingIcon} />
                  <input style={inp} placeholder="São Paulo" value={s2.city} onChange={e => setS2(p => ({ ...p, city: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={lbl}>UF</label>
                <select
                  style={{ ...inp, paddingLeft: 12, width: 80 }}
                  value={s2.state}
                  onChange={e => setS2(p => ({ ...p, state: e.target.value }))}
                >
                  <option value="">—</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>

            {error && <p style={errStyle}>{error}</p>}
            <button style={btn} type="submit" disabled={loading}>{loading ? 'Criando conta...' : 'Concluir cadastro'}</button>
          </form>
        </>
      )}
    </div>
  );
}

export default function SignupPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 };
const inputWrap: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center' };
const leadingIcon: React.CSSProperties = { position: 'absolute', left: 12, color: '#94A3B8', pointerEvents: 'none' };
const inp: React.CSSProperties = {
  display: 'block', width: '100%', height: 52, border: '1px solid #E2E8F0', borderRadius: 12,
  padding: '0 12px 0 44px', fontSize: 16, boxSizing: 'border-box',
  outline: 'none', color: '#0A0A0F', backgroundColor: '#fff', fontFamily: 'inherit',
};
const btn: React.CSSProperties = {
  width: '100%', backgroundColor: '#6D28D9', color: '#fff', border: 'none',
  borderRadius: 12, height: 52, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const errStyle: React.CSSProperties = { color: '#DC2626', fontSize: 13, marginBottom: 12 };
