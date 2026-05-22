'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerCreateSchema } from '@orcivo/shared-types';

export default function NovoClientePage() {
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
    const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), credentials: 'include' });
    if (!res.ok) { setError('Erro ao salvar cliente.'); setLoading(false); return; }
    router.push('/clientes'); router.refresh();
  };

  const f = (k: keyof typeof form) => ({ style: inp, value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value })) });
  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Novo cliente</h1>
      <form onSubmit={handleSubmit}>
        <input {...f('name')} placeholder="Nome *" required />
        <input {...f('phone')} placeholder="Telefone" />
        <input {...f('email')} placeholder="E-mail" type="email" />
        <input {...f('city')} placeholder="Cidade" />
        <input {...f('state')} placeholder="UF" maxLength={2} />
        <textarea {...f('notes')} placeholder="Observações" style={{ ...inp, height: 80 }} />
        {error && <p style={{ color: '#DC2626', fontSize: 13 }}>{error}</p>}
        <button style={btn} type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar cliente'}</button>
      </form>
    </div>
  );
}
const inp: React.CSSProperties = { display: 'block', width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 15, boxSizing: 'border-box' };
const btn: React.CSSProperties = { backgroundColor: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
