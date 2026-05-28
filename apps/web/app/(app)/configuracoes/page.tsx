'use client';
import { useState, useEffect } from 'react';
import { Building2, Image, CreditCard, Shield, Bell, FileOutput } from 'lucide-react';

type Method = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE';

const METHOD_LABELS: Record<Method, { label: string; desc: string }> = {
  APPROVE_BUTTON:  { label: 'Aprovação simples',   desc: 'Cliente confirma com um clique, sem identificação.' },
  TYPED_NAME:      { label: 'Assinar com nome',    desc: 'Cliente digita o nome completo como assinatura.' },
  DRAWN_SIGNATURE: { label: 'Assinar com desenho', desc: 'Cliente desenha a assinatura com o dedo ou mouse.' },
};
const ALL_METHODS: Method[] = ['APPROVE_BUTTON', 'TYPED_NAME', 'DRAWN_SIGNATURE'];

const TABS = [
  { id: 'empresa',   label: 'Empresa',           icon: Building2 },
  { id: 'visual',    label: 'Identidade visual',  icon: Image },
  { id: 'aprovacao', label: 'Aprovação',           icon: CreditCard },
  { id: 'seg',       label: 'Segurança',           icon: Shield },
  { id: 'notif',     label: 'Notificações',        icon: Bell },
  { id: 'exp',       label: 'Exportação',          icon: FileOutput },
];

export default function ConfiguracoesPage(): JSX.Element {
  const [tab, setTab] = useState('empresa');
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
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Configurações</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>Empresa, identidade e preferências</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        {/* Sidebar nav */}
        <aside>
          {TABS.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 9, marginBottom: 2,
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                color: tab === id ? '#4C1D95' : '#334155',
                background: tab === id ? '#F5F3FF' : 'transparent',
                transition: 'background 0.12s',
              }}
            >
              <Icon size={16} color={tab === id ? '#6D28D9' : '#64748B'} />
              {label}
            </div>
          ))}
        </aside>

        {/* Content */}
        <div>
          {tab === 'empresa' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Dados da empresa</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Aparecem no topo de orçamentos, OS e recibos.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {(['Nome fantasia', 'Razão social', 'CNPJ', 'Telefone', 'Email', 'Endereço'] as const).map((l, i) => (
                  <div key={i} style={{ gridColumn: i === 5 ? 'span 2' : 'auto' }}>
                    <label className="ov-label">{l}</label>
                    <input className="ov-input" placeholder={l} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="ov-btn ov-btn-outline">Cancelar</button>
                <button className="ov-btn ov-btn-primary">Salvar alterações</button>
              </div>
            </div>
          )}

          {tab === 'aprovacao' && (
            <div className="ov-card ov-card-body" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Métodos de aprovação</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                Defina quais métodos o cliente pode usar para aprovar pelo link público.
              </div>

              {loading ? (
                <p style={{ color: '#94A3B8', fontSize: 13 }}>Carregando…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ALL_METHODS.map(m => (
                    <label
                      key={m}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px',
                        border: `1.5px solid ${methods.includes(m) ? '#6D28D9' : '#E2E8F0'}`,
                        borderRadius: 10, cursor: 'pointer',
                        backgroundColor: methods.includes(m) ? '#F5F3FF' : '#fff',
                        transition: 'border-color 0.12s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={methods.includes(m)}
                        onChange={() => {
                          setSaved(false);
                          setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
                        }}
                        style={{ marginTop: 2, accentColor: '#6D28D9', width: 16, height: 16 }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0A0A0F' }}>{METHOD_LABELS[m].label}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>{METHOD_LABELS[m].desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {error && <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
              {saved && <p style={{ color: '#16A34A', fontSize: 13, marginTop: 12 }}>Salvo com sucesso.</p>}

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
              <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Identidade visual</h3>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Logo e cor usados nos PDFs e link público.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: 14, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6D28D9', fontWeight: 700, fontSize: 24 }}>OR</div>
                <div>
                  <button className="ov-btn ov-btn-primary">Trocar logo</button>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>PNG ou SVG, recomendado 512×512px.</div>
                </div>
              </div>
              <label className="ov-label">Cor principal</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['#6D28D9', '#0F172A', '#16A34A', '#DC2626', '#0891B2', '#EA580C'].map((c, i) => (
                  <div key={c} style={{ width: 44, height: 44, borderRadius: 10, background: c, cursor: 'pointer', boxShadow: i === 0 ? '0 0 0 3px #fff, 0 0 0 5px #6D28D9' : 'inset 0 0 0 1px rgba(0,0,0,.08)' }} />
                ))}
              </div>
            </div>
          )}

          {['seg', 'notif', 'exp'].includes(tab) && (
            <div className="ov-card ov-card-body" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: '#0A0A0F', fontSize: 15, marginBottom: 6 }}>
                {TABS.find(t => t.id === tab)?.label}
              </div>
              <div style={{ fontSize: 13, color: '#64748B' }}>Em breve — funcionalidade disponível em uma próxima atualização.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
