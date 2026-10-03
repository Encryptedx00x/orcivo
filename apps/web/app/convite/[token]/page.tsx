'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type TerminalCode = 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_USED';
type Result =
  | { kind: 'form' }
  | { kind: 'terminal'; code: TerminalCode; message: string }
  | { kind: 'success'; authenticated: boolean; companyName: string | null };

const TERMINAL_TITLES: Record<TerminalCode, string> = {
  NOT_FOUND: 'Convite não encontrado',
  EXPIRED: 'Convite expirado',
  ALREADY_USED: 'Convite já utilizado',
};

export default function ConvitePage(): JSX.Element {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>({ kind: 'form' });

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password && password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/convite/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, password: password || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; code?: string; message?: string; authenticated?: boolean; companyName?: string | null;
      };
      if (res.ok) {
        const authenticated = Boolean(data.authenticated);
        setResult({ kind: 'success', authenticated, companyName: data.companyName ?? null });
        if (authenticated) {
          setTimeout(() => { router.push('/clientes'); router.refresh(); }, 1500);
        }
        return;
      }
      if (data.code === 'NOT_FOUND' || data.code === 'EXPIRED' || data.code === 'ALREADY_USED') {
        setResult({ kind: 'terminal', code: data.code, message: data.message ?? '' });
        return;
      }
      setError(data.message ?? 'Erro ao aceitar convite.');
    } catch {
      setError('Não foi possível conectar. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <Link href="/" className="block mb-6">
          <span className="text-xl font-bold text-primary-600">Orcivo</span>
        </Link>

        {result.kind === 'terminal' && (
          <div data-testid={`convite-${result.code.toLowerCase()}`}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{TERMINAL_TITLES[result.code]}</h1>
            <p className="text-gray-600 mb-8">{result.message}</p>
            <Link
              href="/login"
              className="block w-full py-3 text-center bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Ir para o login
            </Link>
          </div>
        )}

        {result.kind === 'success' && (
          <div data-testid="convite-success">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite aceito!</h1>
            <p className="text-gray-600 mb-8">
              {result.companyName ? `Você agora faz parte da equipe ${result.companyName}.` : 'Você agora faz parte da equipe.'}
              {result.authenticated ? ' Redirecionando...' : ' Entre com seu e-mail e senha para começar.'}
            </p>
            {!result.authenticated && (
              <Link
                href="/login"
                className="block w-full py-3 text-center bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        )}

        {result.kind === 'form' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Aceitar convite</h1>
            <p className="text-gray-600 mb-8">Você foi convidado para fazer parte de uma equipe no Orcivo.</p>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label htmlFor="invite-name" className="block text-sm font-medium text-gray-700 mb-1">Seu nome (se ainda não tem conta)</label>
                <input
                  id="invite-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <div>
                <label htmlFor="invite-password" className="block text-sm font-medium text-gray-700 mb-1">Senha (se ainda não tem conta)</label>
                <input
                  id="invite-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Aguarde...' : 'Aceitar convite'}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Já tem conta? <Link href="/login" className="text-primary-600 font-medium">Faça login</Link> primeiro e acesse este link novamente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
