'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff } from 'lucide-react';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function InvalidLink({ message }: { message: string }): React.JSX.Element {
  return (
    <div data-testid="reset-invalid">
      <h1 style={title}>Link inválido ou expirado</h1>
      <p style={subtitle}>{message}</p>
      <Link href="/forgot-password" style={btnLink}>
        Solicitar novo link
      </Link>
    </div>
  );
}

function ResetForm(): React.JSX.Element {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);

  if (!UUID_RE.test(token)) {
    return (
      <InvalidLink message="O link de redefinição está incompleto ou incorreto. Solicite um novo link." />
    );
  }
  if (tokenRejected) {
    return (
      <InvalidLink message="Este link expirou (ele vale por 15 minutos) ou já foi utilizado. Solicite um novo link." />
    );
  }

  if (done) {
    return (
      <div data-testid="reset-done">
        <h1 style={title}>Senha redefinida</h1>
        <p style={subtitle}>Sua senha foi alterada com sucesso. Entre com a nova senha.</p>
        <Link href="/login" style={btnLink}>
          Ir para o login
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8 || password.length > 128) {
      setError('A senha deve ter entre 8 e 128 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/reset-password/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
      if (data.code === 'INVALID_TOKEN') {
        setTokenRejected(true);
        return;
      }
      setError(data.message ?? 'Não foi possível redefinir a senha. Tente novamente.');
    } catch {
      setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={title}>Criar nova senha</h1>
      <p style={subtitle}>Escolha uma nova senha para a sua conta.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl} htmlFor="new-password">
            Nova senha
          </label>
          <div style={inputWrap}>
            <Lock size={18} style={leadingIcon} />
            <input
              id="new-password"
              style={{ ...inp, paddingRight: 44 }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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

        <div style={{ marginBottom: 16 }}>
          <label style={lbl} htmlFor="confirm-password">
            Confirmar nova senha
          </label>
          <div style={inputWrap}>
            <Lock size={18} style={leadingIcon} />
            <input
              id="confirm-password"
              style={inp}
              type={showPassword ? 'text' : 'password'}
              placeholder="Repita a nova senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
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
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
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
const btnLink: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  backgroundColor: '#6D28D9',
  color: '#fff',
  textDecoration: 'none',
  borderRadius: 12,
  lineHeight: '52px',
  fontSize: 16,
  fontWeight: 600,
};
