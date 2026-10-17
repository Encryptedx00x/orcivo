'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, Plus, TicketCheck } from 'lucide-react';

type Company = {
  company_id: string;
  trade_name: string;
  role: 'OWNER' | 'ADMIN' | 'TECNICO';
  active?: boolean;
};

const roleLabel = (role: Company['role']) =>
  role === 'OWNER' ? 'Proprietário' : role === 'ADMIN' ? 'Administrador' : 'Membro';

export default function CompaniesPage(): React.JSX.Element {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [invite, setInvite] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/companies', { cache: 'no-store' });
      if (!response.ok) setError('Não foi possível carregar suas empresas.');
      else {
        setCompanies((await response.json()) as Company[]);
        setError('');
      }
    } catch {
      setError('Não foi possível carregar suas empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const switchCompany = async (company: Company) => {
    if (company.active) return;
    if (
      !window.confirm(
        `Trocar para ${company.trade_name}? Os dados exibidos passarão a ser os desta empresa.`,
      )
    )
      return;
    setBusy(company.company_id);
    setError('');
    try {
      const response = await fetch('/api/auth/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.company_id }),
      });
      if (!response.ok) throw new Error('switch_failed');
      window.location.assign('/dashboard');
    } catch {
      setError('Não foi possível trocar de empresa. Entre novamente se a sessão expirou.');
      setBusy('');
    }
  };

  const createCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    if (tradeName.trim().length < 2) return;
    setBusy('create');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_name: tradeName.trim() }),
      });
      if (!response.ok) throw new Error('create_failed');
      setTradeName('');
      setNotice('Empresa criada. Você continua na empresa atual até escolher Trocar.');
      await load();
    } catch {
      setError('Não foi possível criar a empresa.');
    } finally {
      setBusy('');
    }
  };

  const acceptInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawInvite = invite.trim();
    const token = rawInvite.match(/\/convite\/([^/?#]+)/)?.[1] ?? rawInvite.split(/[?#]/)[0];
    if (!token) return;
    setBusy('invite');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/invites/accept-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: decodeURIComponent(token) }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Não foi possível aceitar o convite.');
      setInvite('');
      setNotice(
        'Convite aceito. Sua empresa atual não mudou; escolha Trocar quando quiser entrar na nova empresa.',
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível aceitar o convite.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0A0A0F' }}>Empresas</h1>
        <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 14 }}>
          A empresa ativa define quais clientes, serviços e históricos aparecem neste dispositivo.
        </p>
      </header>
      {error ? (
        <p role="alert" style={alertStyle}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" style={noticeStyle}>
          {notice}
        </p>
      ) : null}

      <section style={cardStyle} aria-busy={loading}>
        <h2 style={titleStyle}>Suas empresas</h2>
        {loading ? <p style={mutedStyle}>Carregando…</p> : null}
        <div style={{ display: 'grid', gap: 10 }}>
          {companies.map((company) => (
            <article key={company.company_id} style={companyStyle}>
              <Building2 size={20} color="#6D28D9" aria-hidden="true" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: 'block', color: '#0A0A0F' }}>{company.trade_name}</strong>
                <span style={mutedStyle}>{roleLabel(company.role)}</span>
              </div>
              {company.active ? (
                <span style={activeStyle}>
                  <Check size={14} /> Empresa ativa
                </span>
              ) : (
                <button
                  className="ov-btn ov-btn-outline"
                  disabled={Boolean(busy)}
                  onClick={() => void switchCompany(company)}
                >
                  {busy === company.company_id ? 'Trocando…' : 'Trocar'}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>
          <Plus size={19} /> Criar outra empresa
        </h2>
        <p style={mutedStyle}>
          A nova empresa começa vazia no Orcivo Livre e não recebe dados da atual.
        </p>
        <form onSubmit={createCompany} style={formStyle}>
          <label style={labelStyle}>
            Nome da empresa
            <input
              value={tradeName}
              onChange={(event) => setTradeName(event.target.value)}
              minLength={2}
              maxLength={120}
              required
              style={inputStyle}
            />
          </label>
          <button className="ov-btn ov-btn-primary" disabled={Boolean(busy)}>
            {busy === 'create' ? 'Criando…' : 'Criar empresa'}
          </button>
        </form>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>
          <TicketCheck size={19} /> Aceitar convite
        </h2>
        <p style={mutedStyle}>
          Use o código ou link recebido. Aceitar não troca a empresa ativa automaticamente.
        </p>
        <form onSubmit={acceptInvite} style={formStyle}>
          <label style={labelStyle}>
            Código ou link do convite
            <input
              value={invite}
              onChange={(event) => setInvite(event.target.value)}
              required
              style={inputStyle}
            />
          </label>
          <button className="ov-btn ov-btn-primary" disabled={Boolean(busy)}>
            {busy === 'invite' ? 'Aceitando…' : 'Aceitar convite'}
          </button>
        </form>
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 16,
  padding: 20,
};
const titleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  margin: '0 0 12px',
  fontSize: 18,
  color: '#0A0A0F',
};
const mutedStyle: React.CSSProperties = { color: '#64748B', fontSize: 13, lineHeight: '19px' };
const companyStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
  padding: 12,
  border: '1px solid #E2E8F0',
  borderRadius: 12,
};
const activeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  color: '#5B21B6',
  background: '#F5F3FF',
  borderRadius: 999,
  padding: '6px 9px',
  fontSize: 12,
  fontWeight: 600,
};
const formStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignItems: 'end',
  marginTop: 12,
};
const labelStyle: React.CSSProperties = {
  display: 'grid',
  flex: '1 1 260px',
  minWidth: 0,
  gap: 6,
  color: '#334155',
  fontSize: 13,
  fontWeight: 600,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 44,
  boxSizing: 'border-box',
  border: '1px solid #CBD5E1',
  borderRadius: 10,
  padding: '0 12px',
  font: 'inherit',
  color: '#0A0A0F',
};
const alertStyle: React.CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 10,
  color: '#B91C1C',
  background: '#FEF2F2',
};
const noticeStyle: React.CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 10,
  color: '#166534',
  background: '#F0FDF4',
};
