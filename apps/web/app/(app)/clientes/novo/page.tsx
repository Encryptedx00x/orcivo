'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Info, Check, Plus } from 'lucide-react';
import { CustomerCreateSchema } from '@orcivo/shared-types';

type Tipo = 'fisica' | 'empresa';

const TAGS = ['Residência', 'Recorrente', 'VIP', 'Indicação', 'Obras'];

export default function NovoClientePage(): JSX.Element {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>('fisica');
  const [activeTags, setActiveTags] = useState<string[]>(['Residência']);
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    phone2: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    notes: '',
  });
  const [shortcuts, setShortcuts] = useState({ quote: true, visit: false, address: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const toggleTag = (t: string) =>
    setActiveTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const initials =
    form.name
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        notes: form.notes || undefined,
      }).filter(([, v]) => v !== undefined),
    );
    const parsed = CustomerCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(', '));
      return;
    }
    setLoading(true);
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      setError('Erro ao salvar cliente.');
      setLoading(false);
      return;
    }
    if (shortcuts.quote) {
      const data = await res.json();
      router.push(`/orcamentos/novo?client_id=${data.id}`);
    } else {
      router.push('/clientes');
      router.refresh();
    }
  };

  return (
    <div style={{ padding: '20px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
              fontSize: 13,
              color: '#64748B',
            }}
          >
            <Link href="/clientes" style={{ color: '#64748B', textDecoration: 'none' }}>
              Clientes
            </Link>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span style={{ color: '#0A0A0F', fontWeight: 500 }}>Novo cliente</span>
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: 0,
            }}
          >
            Novo cliente
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Cadastre uma vez, use em orçamentos, OS e cobranças.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/clientes" style={btnGhost}>
            Cancelar
          </Link>
          <button
            type="button"
            disabled
            title="Salvar e novo indisponível"
            style={{ ...btnOutline, opacity: 0.5, cursor: 'not-allowed' }}
          >
            Salvar e novo
          </button>
          <button form="novo-cliente-form" type="submit" style={btnPrimary} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </div>

      <form id="novo-cliente-form" onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Dados básicos */}
            <div style={card}>
              {/* tipo toggle + tags */}
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                <div style={seg}>
                  <button
                    type="button"
                    style={tipo === 'fisica' ? segActive : segInactive}
                    onClick={() => setTipo('fisica')}
                  >
                    Pessoa física
                  </button>
                  <button
                    type="button"
                    style={tipo === 'empresa' ? segActive : segInactive}
                    onClick={() => setTipo('empresa')}
                  >
                    Empresa
                  </button>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TAGS.map((t) => {
                    const on = activeTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: on ? 'var(--purple-50, #F5F3FF)' : 'transparent',
                          color: on ? '#4C1D95' : '#334155',
                          border: `1px solid ${on ? '#DDD6FE' : '#E2E8F0'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          fontFamily: 'inherit',
                        }}
                      >
                        {on && <Check size={11} />}
                        {t}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled
                    title="Criação de etiquetas indisponível"
                    style={{ ...tagAdd, opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    <Plus size={11} /> etiqueta
                  </button>
                </div>
              </div>

              <h3 style={sectionTitle}>Dados básicos</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <Field label={tipo === 'fisica' ? 'Nome completo *' : 'Razão social *'}>
                  <input
                    style={inp}
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Ex.: Marcos Pereira"
                    required
                  />
                </Field>
                <Field label={tipo === 'fisica' ? 'CPF' : 'CNPJ'}>
                  <input
                    style={inp}
                    value={form.cpf}
                    onChange={set('cpf')}
                    placeholder={tipo === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                  />
                </Field>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 14,
                  marginTop: 14,
                }}
              >
                <Field label="Telefone principal *">
                  <input
                    style={inp}
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="(11) 90000-0000"
                    required
                  />
                </Field>
                <Field label="Telefone secundário">
                  <input style={inp} value={form.phone2} onChange={set('phone2')} placeholder="—" />
                </Field>
                <Field label="Email">
                  <input
                    style={inp}
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="email@exemplo.com"
                  />
                </Field>
              </div>
            </div>

            {/* Endereço */}
            <div style={card}>
              <h3
                style={{
                  ...sectionTitle,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Endereço</span>
                <button
                  type="button"
                  disabled
                  title="Busca por CEP indisponível"
                  style={{
                    color: '#6D28D9',
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: 0,
                    textTransform: 'none',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'inherit',
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  }}
                >
                  Buscar por CEP
                </button>
              </h3>
              <div
                style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px 200px', gap: 14 }}
              >
                <Field label="CEP">
                  <input
                    style={inp}
                    value={form.cep}
                    onChange={set('cep')}
                    placeholder="00000-000"
                  />
                </Field>
                <Field label="Rua">
                  <input
                    style={inp}
                    value={form.street}
                    onChange={set('street')}
                    placeholder="Av. das Nações"
                  />
                </Field>
                <Field label="Número">
                  <input
                    style={inp}
                    value={form.number}
                    onChange={set('number')}
                    placeholder="123"
                  />
                </Field>
                <Field label="Complemento">
                  <input
                    style={inp}
                    value={form.complement}
                    onChange={set('complement')}
                    placeholder="apto, bloco…"
                  />
                </Field>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 100px',
                  gap: 14,
                  marginTop: 14,
                }}
              >
                <Field label="Bairro">
                  <input
                    style={inp}
                    value={form.neighborhood}
                    onChange={set('neighborhood')}
                    placeholder="Bairro"
                  />
                </Field>
                <Field label="Cidade">
                  <input
                    style={inp}
                    value={form.city}
                    onChange={set('city')}
                    placeholder="São Paulo"
                  />
                </Field>
                <Field label="UF">
                  <input
                    style={inp}
                    value={form.state}
                    onChange={set('state')}
                    placeholder="SP"
                    maxLength={2}
                  />
                </Field>
              </div>
            </div>

            {/* Observações */}
            <div style={card}>
              <h3 style={sectionTitle}>
                Observações internas{' '}
                <span
                  style={{
                    color: '#64748B',
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontWeight: 400,
                  }}
                >
                  · só você e sua equipe veem
                </span>
              </h3>
              <textarea
                style={{ ...inp, height: 90, resize: 'vertical' }}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Ex.: prefere atendimento pela manhã, paga sempre via Pix…"
              />
            </div>

            {error && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>}
          </div>

          {/* ── Right rail ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview */}
            <div style={card}>
              <h3 style={sectionTitle}>Pré-visualização</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <div style={avatar}>{initials}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {form.name || 'Nome do cliente'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{form.phone || 'Telefone'}</div>
                </div>
              </div>
              {(form.street || form.city) && (
                <div style={{ fontSize: 13, color: '#334155', lineHeight: '20px' }}>
                  {form.street}
                  {form.number ? `, ${form.number}` : ''}
                  {form.complement ? ` — ${form.complement}` : ''}
                  <br />
                  {form.neighborhood && `${form.neighborhood} · `}
                  {form.city}
                  {form.state ? ` / ${form.state}` : ''}
                  <br />
                  {form.cep && `CEP ${form.cep}`}
                </div>
              )}
            </div>

            {/* Info */}
            <div
              style={{
                background: '#F5F3FF',
                border: '1px solid #DDD6FE',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={18} color="#6D28D9" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: '#3B0764', lineHeight: '18px' }}>
                  Cadastro mínimo: <strong>nome + telefone.</strong>
                  <br />
                  Endereço e demais dados são opcionais.
                </div>
              </div>
            </div>

            {/* Shortcuts */}
            <div style={card}>
              <h3 style={sectionTitle}>Atalhos depois de salvar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(
                  [
                    ['quote', 'Criar orçamento em seguida'],
                    ['visit', 'Agendar visita técnica'],
                    ['address', 'Salvar endereço como obra'],
                  ] as [keyof typeof shortcuts, string][]
                ).map(([k, label]) => (
                  <label
                    key={k}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <div
                      onClick={() => setShortcuts((p) => ({ ...p, [k]: !p[k] }))}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `1.5px solid ${shortcuts[k] ? '#6D28D9' : '#E2E8F0'}`,
                        background: shortcuts[k] ? '#6D28D9' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    >
                      {shortcuts[k] && <Check size={11} color="#fff" />}
                    </div>
                    <span style={{ color: '#334155' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 600,
          color: '#334155',
          marginBottom: 5,
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '20px 22px',
};
const inp: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 40,
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 14,
  color: '#0A0A0F',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 12px',
};
const avatar: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  background: '#EDE9FE',
  color: '#4C1D95',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 17,
  flexShrink: 0,
};
const seg: React.CSSProperties = {
  display: 'flex',
  padding: 3,
  background: '#F1F5F9',
  borderRadius: 8,
};
const segActive: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  background: '#fff',
  color: '#0A0A0F',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const segInactive: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  background: 'transparent',
  color: '#64748B',
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const tagAdd: React.CSSProperties = {
  padding: '5px 11px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 600,
  color: '#6D28D9',
  border: '1px dashed #A78BFA',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
const btnPrimary: React.CSSProperties = {
  height: 38,
  padding: '0 18px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  background: '#6D28D9',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnOutline: React.CSSProperties = {
  height: 38,
  padding: '0 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  background: '#fff',
  color: '#334155',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};
const btnGhost: React.CSSProperties = {
  height: 38,
  padding: '0 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  background: 'transparent',
  color: '#64748B',
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};
