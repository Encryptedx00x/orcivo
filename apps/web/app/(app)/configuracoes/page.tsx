'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { QuoteDocOptions } from '@orcivo/shared-types';
import { QuoteDocOptionsForm } from '../../../components/QuoteDocOptionsForm';
import {
  Building2,
  Image,
  QrCode,
  Users,
  CreditCard,
  CheckSquare,
  UserRound,
  FileText,
  Smile,
} from 'lucide-react';
import { LogoField } from '../../../components/LogoField';
import { setEasyMode } from '../../../components/EasyMode';
import {
  getAccountSettings,
  updateAccountSettings,
  updateCompanyProfile,
  updateCompanyPix,
  updateQuoteDefaults,
} from './actions';

type Method = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE' | 'PHOTO_SIGNATURE';
type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

interface EmpresaForm {
  trade_name: string;
  document: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

interface PixForm {
  pix_key_type: PixKeyType;
  pix_key: string;
}

interface AccountForm {
  name: string;
  email: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface CompanyMeResponse {
  trade_name?: string;
  document?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pix_key?: string | null;
  allowed_approval_methods?: Method[];
  logo_url?: string | null;
  quote_default_terms?: string | null;
  quote_default_validity_days?: number | null;
  quote_default_doc_options?: QuoteDocOptions | null;
}

const DEFAULT_TERMS =
  'Pagamento: 50% no início, 50% na entrega. Garantia de 90 dias sobre a mão de obra.';

const EMPTY_EMPRESA: EmpresaForm = {
  trade_name: '',
  document: '',
  phone: '',
  address: '',
  city: '',
  state: '',
};
const EMPTY_PIX: PixForm = { pix_key_type: 'CNPJ', pix_key: '' };
const EMPTY_ACCOUNT: AccountForm = {
  name: '',
  email: '',
  current_password: '',
  new_password: '',
  confirm_password: '',
};
/** Sem coluna dedicada para o tipo — inferido do formato da chave já salva. */
function inferPixKeyType(key: string): PixKeyType {
  const digits = key.replace(/\D/g, '');
  if (/^[^@]+@[^@]+\.[^@]+$/.test(key)) return 'EMAIL';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return 'RANDOM';
  if (digits.length === 11) return 'CPF';
  if (digits.length === 14) return 'CNPJ';
  return 'PHONE';
}
const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'CPF', label: 'CPF' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Telefone' },
  { value: 'RANDOM', label: 'Aleatória' },
];
const PIX_KEY_PLACEHOLDERS: Record<PixKeyType, string> = {
  CNPJ: 'Ex.: 12.345.678/0001-90',
  CPF: 'Ex.: 123.456.789-00',
  EMAIL: 'Ex.: financeiro@empresa.com',
  PHONE: 'Ex.: (11) 91234-5678',
  RANDOM: 'Ex.: 123e4567-e89b-12d3-a456-426614174000',
};
function maskPixKey(type: PixKeyType, raw: string): string {
  if (type === 'CNPJ') {
    const digits = raw.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  if (type === 'CPF') {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  if (type === 'PHONE') {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }
  return raw;
}

const METHOD_LABELS: Record<Method, { label: string; desc: string }> = {
  APPROVE_BUTTON: {
    label: 'Aprovação simples',
    desc: 'Cliente confirma com um clique, sem identificação.',
  },
  TYPED_NAME: {
    label: 'Assinar com nome',
    desc: 'Cliente digita o nome completo como assinatura.',
  },
  DRAWN_SIGNATURE: {
    label: 'Assinar com desenho',
    desc: 'Cliente desenha a assinatura com o dedo ou mouse.',
  },
  PHOTO_SIGNATURE: {
    label: 'Foto da assinatura',
    desc: 'Cliente envia uma foto da assinatura feita no papel.',
  },
};
const ALL_METHODS: Method[] = [
  'APPROVE_BUTTON',
  'TYPED_NAME',
  'DRAWN_SIGNATURE',
  'PHOTO_SIGNATURE',
];

const TABS = [
  { id: 'conta', label: 'Minha conta', icon: UserRound },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'visual', label: 'Identidade visual', icon: Image },
  { id: 'pix', label: 'Chave Pix', icon: QrCode },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'plano', label: 'Plano e assinatura', icon: CreditCard },
  { id: 'aprovacao', label: 'Aprovação', icon: CheckSquare },
  { id: 'condicoes', label: 'Condições padrão', icon: FileText },
  { id: 'modo', label: 'Modo fácil', icon: Smile },
];

export default function ConfiguracoesPage(): React.JSX.Element {
  const [tab, setTab] = useState('empresa');
  const [methods, setMethods] = useState<Method[]>(ALL_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [empresa, setEmpresa] = useState<EmpresaForm>(EMPTY_EMPRESA);
  const [empresaSaving, setEmpresaSaving] = useState(false);
  const [empresaSaved, setEmpresaSaved] = useState(false);
  const [empresaError, setEmpresaError] = useState('');

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [validity, setValidity] = useState(15);
  const [docOptions, setDocOptions] = useState<QuoteDocOptions | null>(null);
  const [termsSaving, setTermsSaving] = useState(false);
  const [termsSaved, setTermsSaved] = useState(false);
  const [termsError, setTermsError] = useState('');

  const [pix, setPix] = useState<PixForm>(EMPTY_PIX);
  const [pixSaving, setPixSaving] = useState(false);
  const [pixSaved, setPixSaved] = useState(false);
  const [pixError, setPixError] = useState('');

  const [account, setAccount] = useState<AccountForm>(EMPTY_ACCOUNT);
  const [accountOriginal, setAccountOriginal] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountSaved, setAccountSaved] = useState('');

  useEffect(() => {
    fetch('/api/company/me')
      .then((r) => r.json())
      .then((d: CompanyMeResponse) => {
        if (d.allowed_approval_methods?.length) setMethods(d.allowed_approval_methods);
        setLogoUrl(d.logo_url ?? null);
        setTerms(d.quote_default_terms ?? DEFAULT_TERMS);
        setValidity(d.quote_default_validity_days ?? 15);
        setDocOptions(d.quote_default_doc_options ?? null);
        setEmpresa({
          trade_name: d.trade_name ?? '',
          document: d.document ?? '',
          phone: d.phone ?? '',
          address: d.address ?? '',
          city: d.city ?? '',
          state: d.state ?? '',
        });
        if (d.pix_key) {
          setPix({
            pix_key_type: inferPixKeyType(d.pix_key),
            pix_key: d.pix_key,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void getAccountSettings().then((result) => {
      if (result.ok) {
        setAccount((previous) => ({
          ...previous,
          name: result.account.name,
          email: result.account.email,
        }));
        setAccountOriginal({ name: result.account.name, email: result.account.email });
      } else {
        setAccountError(result.message);
      }
      setAccountLoading(false);
    });
  }, []);

  async function saveEmpresa() {
    setEmpresaSaving(true);
    setEmpresaError('');
    setEmpresaSaved(false);
    try {
      const result = await updateCompanyProfile({
        trade_name: empresa.trade_name,
        document: empresa.document || null,
        phone: empresa.phone || null,
        address: empresa.address.trim() || null,
        city: empresa.city || null,
        state: empresa.state || null,
      });
      if (!result.ok) {
        setEmpresaError(result.message);
        return;
      }
      setEmpresaSaved(true);
    } catch {
      setEmpresaError('Erro ao salvar. Tente novamente.');
    } finally {
      setEmpresaSaving(false);
    }
  }

  async function savePix() {
    if (!pix.pix_key.trim()) {
      setPixError('Informe a chave Pix.');
      return;
    }
    setPixSaving(true);
    setPixError('');
    setPixSaved(false);
    try {
      const result = await updateCompanyPix({
        pix_key_type: pix.pix_key_type,
        pix_key: pix.pix_key,
      });
      if (!result.ok) {
        setPixError(result.message);
        return;
      }
      setPixSaved(true);
    } catch {
      setPixError('Erro ao salvar. Tente novamente.');
    } finally {
      setPixSaving(false);
    }
  }

  async function save() {
    if (methods.length === 0) {
      setError('Habilite pelo menos um método.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/company/approval-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methods }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Erro ao salvar. Tente novamente.');
        return;
      }
      setSaved(true);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAccount() {
    const name = account.name.trim();
    const email = account.email.trim().toLowerCase();
    const changingPassword = Boolean(account.new_password);
    const nameChanged = name !== accountOriginal?.name;
    const emailChanged = email !== accountOriginal?.email;
    const credentialsChanged = emailChanged || changingPassword;

    if (!name) {
      setAccountError('Informe seu nome.');
      return;
    }
    if (!nameChanged && !credentialsChanged) {
      setAccountSaved('Nenhuma alteração para salvar.');
      return;
    }
    if (changingPassword && account.new_password !== account.confirm_password) {
      setAccountError('A confirmação da nova senha não confere.');
      return;
    }
    if (credentialsChanged && !account.current_password) {
      setAccountError('Informe sua senha atual para alterar e-mail ou senha.');
      return;
    }

    setAccountSaving(true);
    setAccountError('');
    setAccountSaved('');
    try {
      const result = await updateAccountSettings({
        ...(nameChanged ? { name } : {}),
        ...(emailChanged ? { email } : {}),
        ...(credentialsChanged ? { current_password: account.current_password } : {}),
        ...(changingPassword ? { new_password: account.new_password } : {}),
      });
      if (!result.ok) {
        setAccountError(result.message);
        return;
      }
      setAccount({
        name: result.account.name,
        email: result.account.email,
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setAccountOriginal({ name: result.account.name, email: result.account.email });
      setAccountSaved(
        result.passwordChanged
          ? 'Senha atualizada. As outras sessões foram encerradas.'
          : 'Dados da conta atualizados.',
      );
    } catch {
      setAccountError('Erro ao salvar. Tente novamente.');
    } finally {
      setAccountSaving(false);
    }
  }

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: 0,
            }}
          >
            Configurações
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Empresa, identidade e preferências
          </div>
        </div>
      </div>

      <div
        className="ov-row-detail"
        style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}
      >
        {/* Sidebar nav */}
        <aside className="ov-config-nav" role="tablist" aria-label="Seções">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className="ov-config-tab"
              onClick={() => setTab(id)}
              style={{
                width: '100%',
                border: 0,
                fontFamily: 'inherit',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 9,
                marginBottom: 2,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                color: tab === id ? '#4C1D95' : '#334155',
                background: tab === id ? '#F5F3FF' : 'transparent',
                transition: 'background 0.12s',
              }}
            >
              <Icon size={16} color={tab === id ? '#6D28D9' : '#64748B'} />
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div>
          {tab === 'conta' && (
            <section
              className="ov-card ov-card-body"
              style={{ padding: 24, maxWidth: 680 }}
              aria-labelledby="account-heading"
            >
              <h3 id="account-heading" style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>
                Minha conta
              </h3>
              <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 20px' }}>
                Atualize como seu nome aparece no Orcivo ou proteja suas credenciais.
              </p>
              {accountLoading ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>Carregando…</p>
              ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label className="ov-label" htmlFor="account-name">
                      Nome de exibição
                    </label>
                    <input
                      id="account-name"
                      className="ov-input"
                      value={account.name}
                      onChange={(event) => {
                        setAccountSaved('');
                        setAccount({ ...account, name: event.target.value });
                      }}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="ov-label" htmlFor="account-email">
                      E-mail
                    </label>
                    <input
                      id="account-email"
                      className="ov-input"
                      type="email"
                      value={account.email}
                      onChange={(event) => {
                        setAccountSaved('');
                        setAccount({ ...account, email: event.target.value });
                      }}
                      autoComplete="email"
                    />
                  </div>
                  <div
                    style={{
                      borderTop: '1px solid #E2E8F0',
                      paddingTop: 20,
                      display: 'grid',
                      gap: 16,
                    }}
                  >
                    <div>
                      <label className="ov-label" htmlFor="current-password">
                        Senha atual
                      </label>
                      <input
                        id="current-password"
                        className="ov-input"
                        type="password"
                        value={account.current_password}
                        onChange={(event) => {
                          setAccountSaved('');
                          setAccount({ ...account, current_password: event.target.value });
                        }}
                        autoComplete="current-password"
                      />
                      <p style={{ color: '#64748B', fontSize: 12, margin: '6px 0 0' }}>
                        Obrigatória para alterar e-mail ou senha.
                      </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="ov-label" htmlFor="new-password">
                          Nova senha
                        </label>
                        <input
                          id="new-password"
                          className="ov-input"
                          type="password"
                          minLength={8}
                          value={account.new_password}
                          onChange={(event) => {
                            setAccountSaved('');
                            setAccount({ ...account, new_password: event.target.value });
                          }}
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="ov-label" htmlFor="confirm-password">
                          Confirmar nova senha
                        </label>
                        <input
                          id="confirm-password"
                          className="ov-input"
                          type="password"
                          minLength={8}
                          value={account.confirm_password}
                          onChange={(event) => {
                            setAccountSaved('');
                            setAccount({ ...account, confirm_password: event.target.value });
                          }}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {accountError && (
                <p role="alert" style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>
                  {accountError}
                </p>
              )}
              {accountSaved && (
                <p role="status" style={{ color: '#16A34A', fontSize: 13, marginTop: 12 }}>
                  {accountSaved}
                </p>
              )}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="ov-btn ov-btn-primary"
                  onClick={saveAccount}
                  disabled={accountSaving || accountLoading}
                >
                  {accountSaving ? 'Salvando…' : 'Salvar dados da conta'}
                </button>
              </div>
            </section>
          )}

          {tab === 'empresa' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Dados da empresa</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Aparecem no topo de orçamentos, OS e recibos.
              </div>
              {loading ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>Carregando…</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="ov-label">Nome fantasia</label>
                    <input
                      className="ov-input"
                      placeholder="Nome fantasia"
                      value={empresa.trade_name}
                      onChange={(e) => {
                        setEmpresaSaved(false);
                        setEmpresa({ ...empresa, trade_name: e.target.value });
                      }}
                    />
                  </div>
                  <div>
                    <label className="ov-label">CNPJ</label>
                    <input
                      className="ov-input"
                      placeholder="CNPJ"
                      value={empresa.document}
                      onChange={(e) => {
                        setEmpresaSaved(false);
                        setEmpresa({ ...empresa, document: e.target.value });
                      }}
                    />
                  </div>
                  <div>
                    <label className="ov-label">Telefone</label>
                    <input
                      className="ov-input"
                      placeholder="Telefone"
                      value={empresa.phone}
                      onChange={(e) => {
                        setEmpresaSaved(false);
                        setEmpresa({ ...empresa, phone: e.target.value });
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="ov-label">Endereço</label>
                    <input
                      className="ov-input"
                      placeholder="Rua, número e bairro (vai nos recibos e orçamentos)"
                      maxLength={200}
                      value={empresa.address}
                      onChange={(e) => {
                        setEmpresaSaved(false);
                        setEmpresa({ ...empresa, address: e.target.value });
                      }}
                    />
                  </div>
                  <div>
                    <label className="ov-label">Cidade</label>
                    <input
                      className="ov-input"
                      placeholder="Cidade"
                      value={empresa.city}
                      onChange={(e) => {
                        setEmpresaSaved(false);
                        setEmpresa({ ...empresa, city: e.target.value });
                      }}
                    />
                  </div>
                  <div>
                    <label className="ov-label">Estado</label>
                    <input
                      className="ov-input"
                      placeholder="UF"
                      maxLength={2}
                      value={empresa.state}
                      onChange={(e) => {
                        setEmpresaSaved(false);
                        setEmpresa({ ...empresa, state: e.target.value.toUpperCase() });
                      }}
                    />
                  </div>
                </div>
              )}

              {empresaError && (
                <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{empresaError}</p>
              )}
              {empresaSaved && (
                <p style={{ color: '#16A34A', fontSize: 13, marginTop: 12 }}>Salvo com sucesso.</p>
              )}

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="ov-btn ov-btn-primary"
                  onClick={saveEmpresa}
                  disabled={empresaSaving || loading}
                >
                  {empresaSaving ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          )}

          {tab === 'pix' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Chave Pix</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Inserida automaticamente nos recibos enviados ao cliente.
              </div>
              {loading ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>Carregando…</p>
              ) : (
                <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
                  <div>
                    <label className="ov-label">Tipo de chave</label>
                    <select
                      className="ov-input"
                      value={pix.pix_key_type}
                      onChange={(e) => {
                        const nextType = e.target.value as PixKeyType;
                        setPixSaved(false);
                        setPix({
                          ...pix,
                          pix_key_type: nextType,
                          pix_key: maskPixKey(nextType, pix.pix_key),
                        });
                      }}
                    >
                      {PIX_KEY_TYPES.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ov-label">Chave</label>
                    <input
                      className="ov-input"
                      placeholder={PIX_KEY_PLACEHOLDERS[pix.pix_key_type]}
                      value={pix.pix_key}
                      onChange={(e) => {
                        setPixSaved(false);
                        setPix({ ...pix, pix_key: maskPixKey(pix.pix_key_type, e.target.value) });
                      }}
                    />
                  </div>
                </div>
              )}

              {pixError && (
                <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{pixError}</p>
              )}
              {pixSaved && (
                <p style={{ color: '#16A34A', fontSize: 13, marginTop: 12 }}>Salvo com sucesso.</p>
              )}

              <div style={{ marginTop: 24 }}>
                <button
                  className="ov-btn ov-btn-primary"
                  onClick={savePix}
                  disabled={pixSaving || loading}
                >
                  {pixSaving ? 'Salvando…' : 'Salvar chave'}
                </button>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="ov-card ov-card-body" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: '#0A0A0F', fontSize: 15, marginBottom: 6 }}>
                Usuários e permissões
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Gerencie usuários, funções e permissões da sua equipe.
              </div>
              <Link
                href="/equipe"
                className="ov-btn ov-btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex' }}
              >
                Ir para Equipe →
              </Link>
            </div>
          )}

          {tab === 'plano' && (
            <div className="ov-card ov-card-body" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: '#0A0A0F', fontSize: 15, marginBottom: 6 }}>
                Plano e assinatura
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Gerencie seu plano, pagamentos e uso da plataforma.
              </div>
              <Link
                href="/plano"
                className="ov-btn ov-btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex' }}
              >
                Gerenciar assinatura →
              </Link>
            </div>
          )}

          {tab === 'aprovacao' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>
                Métodos de aprovação
              </h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Defina quais métodos o cliente pode usar para aprovar pelo link público.
              </div>

              {loading ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>Carregando…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ALL_METHODS.map((m) => (
                    <label
                      key={m}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 14px',
                        border: `1.5px solid ${methods.includes(m) ? '#6D28D9' : '#E2E8F0'}`,
                        borderRadius: 10,
                        cursor: 'pointer',
                        backgroundColor: methods.includes(m) ? '#F5F3FF' : '#fff',
                        transition: 'border-color 0.12s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={methods.includes(m)}
                        onChange={() => {
                          setSaved(false);
                          setMethods((prev) =>
                            prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                          );
                        }}
                        style={{ marginTop: 2, accentColor: '#6D28D9', width: 16, height: 16 }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0A0A0F' }}>
                          {METHOD_LABELS[m].label}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                          {METHOD_LABELS[m].desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {error && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
              {saved && (
                <p style={{ color: '#16A34A', fontSize: 13, marginTop: 12 }}>Salvo com sucesso.</p>
              )}

              <button
                onClick={save}
                disabled={saving || loading}
                className="ov-btn ov-btn-primary"
                style={{ marginTop: 20 }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}

          {tab === 'visual' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>
                Identidade visual
              </h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Logo usado nos PDFs de orçamentos, ordens de serviço e recibos.
              </div>
              {!loading && <LogoField initialUrl={logoUrl} tradeName={empresa.trade_name} />}
            </div>
          )}

          {tab === 'condicoes' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Condições padrão</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Entram em todo orçamento novo. Dá para mudar em cada um.
              </div>
              <label className="ov-label" htmlFor="cfg-terms">
                Condições
              </label>
              <textarea
                id="cfg-terms"
                className="ov-textarea"
                rows={5}
                value={terms}
                maxLength={2000}
                onChange={(e) => {
                  setTerms(e.target.value);
                  setTermsSaved(false);
                }}
                style={{ width: '100%', marginBottom: 16 }}
              />
              <label className="ov-label" htmlFor="cfg-validity">
                Validade padrão
              </label>
              <select
                id="cfg-validity"
                className="ov-input"
                value={validity}
                onChange={(e) => {
                  setValidity(Number(e.target.value));
                  setTermsSaved(false);
                }}
                style={{ maxWidth: 240, marginBottom: 20 }}
              >
                {[7, 15, 30].map((d) => (
                  <option key={d} value={d}>
                    {d} dias
                  </option>
                ))}
              </select>
              <div style={{ marginBottom: 20 }}>
                <QuoteDocOptionsForm
                  value={docOptions}
                  onChange={(v) => {
                    setDocOptions(v);
                    setTermsSaved(false);
                  }}
                />
              </div>
              {termsError && (
                <p role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: '0 0 12px' }}>
                  {termsError}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  className="ov-btn ov-btn-primary"
                  disabled={termsSaving}
                  onClick={async () => {
                    setTermsSaving(true);
                    const r = await updateQuoteDefaults({
                      quote_default_terms: terms.trim() || null,
                      quote_default_validity_days: validity,
                      quote_default_doc_options: docOptions,
                    });
                    setTermsSaving(false);
                    if (!r.ok) return setTermsError(r.message);
                    setTermsError('');
                    setTermsSaved(true);
                  }}
                >
                  {termsSaving ? 'Salvando…' : 'Salvar condições'}
                </button>
                {termsSaved && (
                  <span role="status" style={{ color: '#166534', fontSize: 13 }}>
                    Condições salvas.
                  </span>
                )}
              </div>
            </div>
          )}

          {tab === 'modo' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Modo fácil</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Botões grandes e só o essencial, com tudo do modo completo a um toque. Vale para
                este aparelho; você pode trocar quando quiser, nada se perde.
              </div>
              <button
                type="button"
                className="ov-btn ov-btn-primary"
                onClick={() => {
                  setEasyMode(true);
                  window.location.href = '/facil';
                }}
              >
                Ligar o Modo fácil neste aparelho
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
