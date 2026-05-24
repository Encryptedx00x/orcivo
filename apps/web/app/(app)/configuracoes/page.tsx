'use client';

import { useEffect, useState } from 'react';

type Method = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE';

const METHOD_LABELS: Record<Method, { label: string; desc: string }> = {
  APPROVE_BUTTON:  { label: 'Aprovação simples',    desc: 'Cliente confirma com um clique, sem identificação.' },
  TYPED_NAME:      { label: 'Assinar com nome',     desc: 'Cliente digita o nome completo como assinatura.' },
  DRAWN_SIGNATURE: { label: 'Assinar com desenho',  desc: 'Cliente desenha a assinatura com o dedo ou mouse.' },
};

const ALL_METHODS: Method[] = ['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE'];

export default function ConfiguracoesPage(): JSX.Element {
  const [methods, setMethods] = useState<Method[]>(ALL_METHODS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/company/me')
      .then(r => r.json())
      .then((d: { allowed_approval_methods?: Method[] }) => {
        if (d.allowed_approval_methods?.length) setMethods(d.allowed_approval_methods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(m: Method) {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    setSaved(false);
  }

  async function save() {
    if (methods.length === 0) { setError('Habilite pelo menos um método.'); return; }
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch('/api/company/approval-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ methods }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', marginBottom: 4 }}>Configurações</h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32 }}>Preferências da sua empresa.</p>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0F', marginBottom: 4 }}>Métodos de aprovação de orçamento</h2>
        <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
          Defina quais métodos o cliente pode usar para aprovar pelo link público.
        </p>

        {loading ? <p style={{ color: '#9CA3AF', fontSize: 13 }}>Carregando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ALL_METHODS.map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', border: `1.5px solid ${methods.includes(m) ? '#6D28D9' : '#E5E7EB'}`, borderRadius: 8, cursor: 'pointer', backgroundColor: methods.includes(m) ? '#F5F3FF' : '#fff' }}>
                <input type="checkbox" checked={methods.includes(m)} onChange={() => toggle(m)} style={{ marginTop: 2, accentColor: '#6D28D9', width: 16, height: 16 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0A0A0F' }}>{METHOD_LABELS[m].label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{METHOD_LABELS[m].desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 10 }}>{error}</p>}
        {saved && <p style={{ color: '#065F46', fontSize: 13, marginTop: 10 }}>Salvo com sucesso.</p>}

        <button onClick={save} disabled={saving || loading} style={{ marginTop: 20, padding: '10px 28px', backgroundColor: '#6D28D9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </section>
    </div>
  );
}
