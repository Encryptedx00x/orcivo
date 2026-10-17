'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { intentQuery, postAuthPath, readCheckoutIntent } from '../checkout-intent';

function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const intent = readCheckoutIntent(useSearchParams());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<{
    token: string;
    companies: Array<{
      company_id: string;
      trade_name: string;
      role: 'OWNER' | 'ADMIN' | 'TECNICO';
    }>;
  } | null>(null);

  const finishLogin = () => {
    router.push(postAuthPath(intent));
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      requires_company_selection?: boolean;
      selection_token?: string;
      companies?: Array<{
        company_id: string;
        trade_name: string;
        role: 'OWNER' | 'ADMIN' | 'TECNICO';
      }>;
    };
    if (data.requires_company_selection && data.selection_token && data.companies) {
      setSelection({ token: data.selection_token, companies: data.companies });
      setLoading(false);
      return;
    }
    finishLogin();
  };

  const selectCompany = async (companyId: string) => {
    if (!selection) return;
    setLoading(true);
    setError('');
    const response = await fetch('/api/auth/select-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selection_token: selection.token, company_id: companyId }),
    });
    if (!response.ok) {
      setError('A seleção expirou. Entre novamente.');
      setSelection(null);
      setLoading(false);
      return;
    }
    finishLogin();
  };

  if (selection) {
    return (
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#0A0A0F', marginBottom: 8 }}>
          Em qual empresa você vai entrar?
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>
          Cada empresa mantém clientes, serviços e histórico separados.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          {selection.companies.map((company) => (
            <button
              key={company.company_id}
              type="button"
              disabled={loading}
              onClick={() => void selectCompany(company.company_id)}
              style={{
                minHeight: 60,
                padding: '10px 14px',
                border: '1px solid #DDD6FE',
                borderRadius: 12,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Building2 size={20} color="#6D28D9" aria-hidden="true" />
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: '#0A0A0F', fontSize: 14 }}>
                  {company.trade_name}
                </strong>
                <span style={{ color: '#64748B', fontSize: 12 }}>
                  {company.role === 'OWNER'
                    ? 'Proprietário'
                    : company.role === 'ADMIN'
                      ? 'Administrador'
                      : 'Membro'}
                </span>
              </span>
            </button>
          ))}
        </div>
        {error && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
        <button
          type="button"
          onClick={() => setSelection(null)}
          style={{
            ...btn,
            marginTop: 16,
            background: '#fff',
            color: '#6D28D9',
            border: '1px solid #DDD6FE',
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 32 }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>
          Novo no Orcivo?{' '}
          <Link
            href={`/signup${intentQuery(intent)}`}
            style={{ color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}
          >
            Criar conta grátis
          </Link>
        </span>
      </div>

      <h1
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: '#0A0A0F',
          marginBottom: 4,
          letterSpacing: '-0.015em',
        }}
      >
        Entrar na sua conta
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Bom te ver de novo.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>E-mail</label>
          <div style={inputWrap}>
            <Mail size={18} style={leadingIcon} />
            <input
              style={inp}
              type="email"
              placeholder="joao@exemplo.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <label style={{ ...lbl, marginBottom: 0 }}>Senha</label>
            <span style={{ fontSize: 12, color: '#6D28D9', cursor: 'pointer' }}>
              Esqueci minha senha
            </span>
          </div>
          <div style={inputWrap}>
            <Lock size={18} style={leadingIcon} />
            <input
              style={{ ...inp, paddingRight: 44 }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                display: 'flex',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#6D28D9', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, color: '#334155' }}>Manter conectado</span>
        </label>

        {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button style={btn} type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

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
