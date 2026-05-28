'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { CustomerCreateSchema } from '@orcivo/shared-types';

export default function NovoClientePage(): JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', state: '', notes: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = CustomerCreateSchema.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.issues.map(i => i.message).join(', ')); return; }
    setLoading(true);
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
    if (!res.ok) { setError('Erro ao salvar cliente.'); setLoading(false); return; }
    router.push('/clientes'); router.refresh();
  };

  const field = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value })),
  });

  return (
    <div style={{ maxWidth: 580 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: '#64748B' }}>
        <Link href="/clientes" style={{ color: '#64748B', textDecoration: 'none' }}>Clientes</Link>
        <ChevronRight size={14} />
        <span style={{ color: '#0A0A0F', fontWeight: 500 }}>Novo cliente</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', marginBottom: 24 }}>Novo cliente</h1>

      <div style={card}>
        <form onSubmit={handleSubmit}>
          <div style={fieldGroup}>
            <label style={label}>Nome *</label>
            <input {...field('name')} style={inp} placeholder="Nome completo ou razão social" required />
          </div>
          <div style={fieldGroup}>
            <label style={label}>Telefone</label>
            <input {...field('phone')} style={inp} placeholder="(00) 00000-0000" />
          </div>
          <div style={fieldGroup}>
            <label style={label}>E-mail</label>
            <input {...field('email')} type="email" style={inp} placeholder="email@exemplo.com" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={label}>Cidade</label>
              <input {...field('city')} style={inp} placeholder="Cidade" />
            </div>
            <div>
              <label style={label}>UF</label>
              <input {...field('state')} style={inp} placeholder="SP" maxLength={2} />
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={label}>Observações</label>
            <textarea {...field('notes')} style={{ ...inp, height: 80, resize: 'vertical' }} placeholder="Informações adicionais sobre o cliente" />
          </div>

          {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btn} type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar cliente'}
            </button>
            <Link
              href="/clientes"
              style={{
                display: 'inline-flex', alignItems: 'center',
                backgroundColor: '#fff', color: '#334155',
                border: '1px solid #E2E8F0', borderRadius: 12,
                padding: '10px 20px', fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  backgroundColor: '#fff', border: '1px solid #E2E8F0',
  borderRadius: 12, padding: 24,
};
const fieldGroup: React.CSSProperties = { marginBottom: 16 };
const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#334155', marginBottom: 6,
};
const inp: React.CSSProperties = {
  display: 'block', width: '100%', border: '1px solid #E2E8F0',
  borderRadius: 8, padding: '10px 12px', fontSize: 14,
  color: '#0A0A0F', boxSizing: 'border-box', outline: 'none',
};
const btn: React.CSSProperties = {
  backgroundColor: '#6D28D9', color: '#fff', border: 'none',
  borderRadius: 12, padding: '10px 24px', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
};
