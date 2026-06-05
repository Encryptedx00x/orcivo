'use client';
import { Check } from 'lucide-react';

const T = {
  ink:       '#0A0A0F',
  fg2:       '#334155',
  fg3:       '#64748B',
  border1:   '#E2E8F0',
  border2:   '#F1F5F9',
  purple600: '#6D28D9',
  purple800: '#4C1D95',
  purple50:  '#F5F3FF',
  slate50:   '#F8FAFC',
  success:   '#16A34A',
  successBg: '#DCFCE7',
};

const PLANS: {
  name: string;
  price: string;
  tag: string | null;
  features: string[];
  current: boolean;
}[] = [
  {
    name: 'Orcivo Livre',
    price: 'R$ 0',
    tag: null,
    features: ['1 usuário', 'Até 5 OS / mês', 'PDF com marca Orcivo', 'Suporte por email'],
    current: false,
  },
  {
    name: 'Orcivo Solo',
    price: 'R$ 39,90',
    tag: null,
    features: ['3 usuários', 'OS ilimitadas', 'Seu logo no PDF', 'Chave Pix'],
    current: false,
  },
  {
    name: 'Orcivo Mais',
    price: 'R$ 89,90',
    tag: 'Recomendado',
    features: ['10 usuários', 'Tudo do Orcivo Solo', 'Catálogo avançado', 'Relatórios', 'Suporte prioritário'],
    current: true,
  },
  {
    name: 'Orcivo Equipe',
    price: 'R$ 199,90',
    tag: 'Para escala',
    features: ['Usuários ilimitados', 'Tudo do Orcivo Mais', 'Multi-empresa', 'API pública', 'Gerente dedicado'],
    current: false,
  },
];

const PAYMENTS = [
  { date: '28/04', label: 'Orcivo Mais · mensal', value: 'R$ 89,90' },
  { date: '28/03', label: 'Orcivo Mais · mensal', value: 'R$ 89,90' },
  { date: '28/02', label: 'Orcivo Mais · mensal', value: 'R$ 89,90' },
  { date: '28/01', label: 'Orcivo Mais · mensal', value: 'R$ 89,90' },
];

export default function PlanoPage(): JSX.Element {
  return (
    <div className="ov-page" style={{ maxWidth: 1200 }}>

      {/* Header */}
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: T.ink, margin: 0 }}>
            Plano e assinatura
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>Gerencie seu plano, pagamentos e uso</div>
        </div>
      </div>

      {/* Current plan + payment history */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Current plan — gradient card */}
        <div style={{
          borderRadius: 14, padding: 24,
          background: 'linear-gradient(135deg, #6D28D9, #4C1D95)',
          border: 'none', color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Plano atual</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>Orcivo Mais</div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>Próxima cobrança em 28/06 · R$ 89,90/mês</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 9999, background: 'rgba(255,255,255,.18)', color: '#fff' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
              Ativo
            </span>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,.2)', margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {[
              ['Usuários', '4 / 10'],
              ['OS no mês', '42'],
              ['Armazenamento', '1.2 / 20 GB'],
              ['Docs gerados', '18'],
            ].map(([l, v], i) => (
              <div key={i}>
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,.18)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Ver planos
            </button>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Histórico de pagamentos
            </button>
            <button style={{ height: 36, padding: '0 14px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: 'transparent', color: 'rgba(255,255,255,.65)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar assinatura
            </button>
          </div>
        </div>

        {/* Payment history */}
        <div className="ov-card ov-card-body">
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: T.ink }}>Pagamentos recentes</h3>
          {PAYMENTS.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < PAYMENTS.length - 1 ? `1px solid ${T.border2}` : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: T.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.success, flexShrink: 0 }}>
                <Check size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>{p.label}</div>
                <div style={{ fontSize: 12, color: T.fg3 }}>Pago em {p.date}</div>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 13, color: T.ink }}>{p.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan comparison */}
      <h3 style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: '0 0 12px' }}>Compare os planos</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {PLANS.map((p, i) => (
          <div
            key={i}
            className="ov-card ov-card-body"
            style={{
              position: 'relative',
              borderColor: p.current ? T.purple600 : T.border1,
              borderWidth: p.current ? 2 : 1,
            }}
          >
            {p.tag && (
              <div style={{
                position: 'absolute', top: -10, left: 18,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 9999,
                background: p.current ? T.purple600 : T.fg2, color: '#fff',
              }}>
                {p.tag}
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: 17, color: T.ink }}>{p.name}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 14, fontFamily: 'JetBrains Mono, monospace', color: T.ink, letterSpacing: '-0.01em' }}>
              {p.price}
              <span style={{ fontSize: 13, color: T.fg3, fontWeight: 500, fontFamily: 'inherit' }}>/mês</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.features.map((f, j) => (
                <li key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: T.fg2 }}>
                  <Check size={14} color={T.purple600} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              style={{
                width: '100%', marginTop: 18, height: 36, borderRadius: 9,
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: p.current ? 'default' : 'pointer',
                background: p.current ? 'transparent' : T.purple600,
                color: p.current ? T.fg3 : '#fff',
                border: p.current ? `1px solid ${T.border1}` : 'none',
              }}
              disabled={p.current}
            >
              {p.current ? 'Plano atual' : `Mudar para ${p.name.replace('Orcivo ', '')}`}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
