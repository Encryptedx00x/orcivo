'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { CustomerCreateSchema } from '@orcivo/shared-types';
import { maskCep, maskCpfCnpj, maskPhone, onlyDigits } from '@orcivo/shared-types';

const MASKS: Record<string, (v: string) => string> = {
  cpf: maskCpfCnpj,
  phone: maskPhone,
  phone2: maskPhone,
  cep: maskCep,
};

type Tipo = 'fisica' | 'empresa';

interface CustomerData {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  type?: string;
}

export default function EditarClientePage(): React.JSX.Element {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [tipo, setTipo] = useState<Tipo>('fisica');
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Não encontrado');
        return r.json();
      })
      .then((data: CustomerData) => {
        setTipo(data.type === 'PJ' ? 'empresa' : 'fisica');
        setForm({
          name: data.name ?? '',
          cpf: maskCpfCnpj(data.tax_id),
          phone: maskPhone(data.phone),
          phone2: maskPhone(data.phone2),
          email: data.email ?? '',
          cep: maskCep(data.cep),
          street: data.street ?? '',
          number: data.number ?? '',
          complement: data.complement ?? '',
          neighborhood: data.neighborhood ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          notes: data.notes ?? '',
        });
      })
      .catch(() => setFetchError('Erro ao carregar dados do cliente.'))
      .finally(() => setFetching(false));
  }, [id]);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: MASKS[k]?.(e.target.value) ?? e.target.value }));

  const initials =
    form.name
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?';

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');
    setSaved(false);

    const payload = Object.fromEntries(
      Object.entries({
        name: form.name,
        type: tipo === 'empresa' ? 'PJ' : 'PF',
        tax_id: onlyDigits(form.cpf) || undefined,
        phone: onlyDigits(form.phone) || undefined,
        phone2: onlyDigits(form.phone2) || undefined,
        email: form.email || undefined,
        cep: onlyDigits(form.cep) || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood || undefined,
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
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        setError('Erro ao salvar. Tente novamente.');
        return;
      }

      setSaved(true);
      setTimeout(() => {
        router.push(`/clientes/${id}`);
        // Refetch server props instead of reusing the cached customer detail.
        router.refresh();
      }, 800);
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 200,
          gap: 10,
          color: '#64748B',
          fontSize: 14,
        }}
      >
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        Carregando…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ padding: '32px', maxWidth: 500 }}>
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '16px',
            color: '#DC2626',
            fontSize: 14,
          }}
        >
          {fetchError}
        </div>
        <Link
          href="/clientes"
          style={{ display: 'inline-block', marginTop: 12, color: '#6D28D9', fontSize: 13 }}
        >
          ← Voltar para clientes
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
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
          <Link href={`/clientes/${id}`} style={{ color: '#64748B', textDecoration: 'none' }}>
            {form.name || 'Cliente'}
          </Link>
          <span style={{ color: '#CBD5E1' }}>·</span>
          <span style={{ color: '#0A0A0F', fontWeight: 500 }}>Editar</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
              Editar cliente
            </h1>
            <p style={{ color: '#64748B', fontSize: 14, marginTop: 4, marginBottom: 0 }}>
              Alterações salvas imediatamente em todos os orçamentos e OS vinculados.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/clientes/${id}`} style={btnGhost}>
              Cancelar
            </Link>
            <button
              type="submit"
              form="editar-cliente-form"
              style={{
                ...btnPrimary,
                opacity: loading ? 0.7 : 1,
                background: saved ? '#16A34A' : '#6D28D9',
              }}
              disabled={loading || saved}
            >
              {saved ? (
                <>
                  <Check size={14} /> Salvo!
                </>
              ) : loading ? (
                'Salvando…'
              ) : (
                'Salvar alterações'
              )}
            </button>
          </div>
        </div>
      </div>

      <form
        id="editar-cliente-form"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <div
          className="ov-row-detail"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20 }}
        >
          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Dados básicos */}
            <div style={card}>
              {/* Tipo toggle */}
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 18 }}>
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
              </div>

              <h3 style={sectionTitle}>Dados básicos</h3>

              <div
                className="ov-row-stack"
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}
              >
                <Field label={tipo === 'fisica' ? 'Nome completo *' : 'Razão social *'}>
                  <input
                    style={inp}
                    value={form.name}
                    onChange={set('name')}
                    required
                    placeholder="Ex.: Marcos Pereira"
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
                className="ov-row-stack"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 14,
                  marginTop: 14,
                }}
              >
                <Field label="Telefone principal">
                  <input
                    style={inp}
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="(11) 90000-0000"
                  />
                </Field>
                <Field label="Telefone secundário">
                  <input style={inp} value={form.phone2} onChange={set('phone2')} placeholder="—" />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    style={inp}
                    value={form.email}
                    onChange={set('email')}
                    placeholder="email@exemplo.com"
                  />
                </Field>
              </div>
            </div>

            {/* Endereço */}
            <div style={card}>
              <h3 style={sectionTitle}>Endereço</h3>
              <div
                className="ov-row-stack"
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
                className="ov-row-stack"
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
                    placeholder="Centro"
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
                style={{ ...inp, height: 90, resize: 'vertical', paddingTop: 10 }}
                value={form.notes}
                onChange={set('notes')}
                placeholder="Ex.: prefere atendimento pela manhã, paga sempre via Pix…"
              />
            </div>

            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#DC2626',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* ── Right rail ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pré-visualização */}
            <div style={card}>
              <h3 style={sectionTitle}>Pré-visualização</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <div style={avatarStyle}>{initials}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {form.name || 'Nome do cliente'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{form.phone || 'Telefone'}</div>
                </div>
              </div>
              {(form.city || form.state) && (
                <div style={{ fontSize: 13, color: '#334155' }}>
                  {form.city}
                  {form.state ? ` / ${form.state}` : ''}
                </div>
              )}
            </div>

            {/* Link para perfil */}
            <div style={card}>
              <h3 style={sectionTitle}>Ações</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link
                  href={`/clientes/${id}`}
                  style={{
                    fontSize: 13,
                    color: '#6D28D9',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  ← Ver perfil completo
                </Link>
                <Link
                  href={`/orcamentos/novo?client_id=${id}`}
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Criar orçamento →
                </Link>
                <Link
                  href={`/ordens-de-servico/novo?client_id=${id}`}
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Nova OS →
                </Link>
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
const avatarStyle: React.CSSProperties = {
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
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
