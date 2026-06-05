'use client';

import Link from 'next/link';
import { Plus, Users, FileText, ClipboardList, Calendar, DollarSign, Package, Info } from 'lucide-react';

// ── Token aliases ─────────────────────────────────────────────────────
const T = {
  ink:       '#0A0A0F',
  fg2:       '#334155',
  fg3:       '#64748B',
  border2:   '#F1F5F9',
  purple600: '#6D28D9',
  purple700: '#5B21B6',
  purple50:  '#F5F3FF',
  purple800: '#4C1D95',
  slate50:   '#F8FAFC',
  slate100:  '#F1F5F9',
  warning:   '#D97706',
  warningBg: '#FEF3C7',
  success:   '#16A34A',
  successBg: '#DCFCE7',
  danger:    '#DC2626',
  dangerBg:  '#FEE2E2',
  infoBg:    '#E0F2FE',
  info:      '#0284C7',
};

// ── Atoms ─────────────────────────────────────────────────────────────

const PILL: Record<string, { bg: string; color: string }> = {
  slate:   { bg: T.slate100,   color: T.fg2 },
  warning: { bg: T.warningBg,  color: '#92400E' },
  success: { bg: T.successBg,  color: '#166534' },
  danger:  { bg: T.dangerBg,   color: '#991B1B' },
  info:    { bg: T.infoBg,     color: '#075985' },
  brand:   { bg: T.purple50,   color: T.purple800 },
};

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const c = PILL[k] ?? PILL.slate;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 9999,
      background: c.bg, color: c.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {children}
    </span>
  );
}

// ── Static data (matches Dashboard.jsx + WDashboard reference) ────────

const UPCOMING = [
  { time: '09:00', title: 'Visita técnica — CFTV', client: 'Marcos Pereira', tag: 'OS #312', status: 'in_progress' },
  { time: '11:30', title: 'Instalação portão eletrônico', client: 'Ana Souza', tag: 'OS #318', status: 'scheduled' },
  { time: '14:00', title: 'Orçamento presencial', client: 'Construtora Vila Nova', tag: 'ORÇ #248', status: 'open' },
  { time: '16:00', title: 'Retorno cliente', client: 'Luiz Henrique', tag: 'Cliente', status: 'scheduled' },
];

const OS_STATUS: Record<string, [string, string]> = {
  open:             ['info',    'Aberta'],
  scheduled:        ['brand',   'Agendada'],
  in_progress:      ['warning', 'Em execução'],
  waiting_material: ['slate',   'Aguard. material'],
  finished:         ['success', 'Finalizada'],
  cancelled:        ['danger',  'Cancelada'],
};

const ACTIVITY = [
  { who: 'Marcos Pereira',  what: 'aprovou o orçamento', target: '#248', when: 'há 2h',    k: 'success' },
  { who: 'Você',            what: 'criou a OS',           target: '#318', when: 'há 4h',    k: 'brand'   },
  { who: 'Téc. Carlos',     what: 'finalizou a OS',       target: '#311', when: 'ontem',    k: 'success' },
  { who: 'Ana Souza',       what: 'rejeitou o orçamento', target: '#244', when: 'ontem',    k: 'danger'  },
];

const QUICK_ACTIONS: [typeof Users, string, string][] = [
  [Users,        'Novo cliente',    '/clientes/novo'],
  [FileText,     'Novo orçamento',  '/orcamentos/novo'],
  [ClipboardList,'Nova OS',         '/ordens-de-servico'],
  [Calendar,     'Compromisso',     '/agenda'],
  [DollarSign,   'Recebimento',     '/financeiro'],
  [Package,      'Item catálogo',   '/catalogo'],
];

// ── Page ──────────────────────────────────────────────────────────────
export default function DashboardPage(): JSX.Element {
  const now = new Date();
  const greet = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
  const dateCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const kpis = [
    { label: 'Agenda hoje',             value: '5',        sub: '2 em execução',         k: 'brand'   },
    { label: 'OS pendentes',            value: '12',       sub: '3 aguard. material',     k: 'warning' },
    { label: 'Orçamentos pendentes',    value: '8',        sub: '2 vencem em 7 dias',     k: 'info'    },
    { label: 'Recebimentos pendentes',  value: 'R$ 2.480', sub: '1 vencido',              k: 'danger'  },
  ];

  return (
    <div className="ov-page" style={{ maxWidth: 1440 }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em', color: T.ink, margin: 0 }}>
            {greet}, João
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>
            {dateCapitalized} · Ribeiro Elétrica · Orcivo Mais
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/clientes/novo" className="ov-btn ov-btn-outline" style={{ gap: 8, textDecoration: 'none' }}>
            <Users size={16} />Novo cliente
          </Link>
          <Link href="/orcamentos/novo" className="ov-btn ov-btn-primary" style={{ gap: 8, textDecoration: 'none' }}>
            <Plus size={16} />Novo orçamento
          </Link>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {kpis.map((m, i) => (
          <div key={i} className="ov-card">
            <div className="ov-card-body" style={{ padding: '16px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: T.fg3, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {m.label}
              </div>
              <div style={{
                fontSize: 28, lineHeight: '36px', fontWeight: 700, letterSpacing: '-0.02em',
                marginTop: 6, fontVariantNumeric: 'tabular-nums',
                color: m.k === 'danger' ? T.danger : T.ink,
              }}>
                {m.value}
              </div>
              <div style={{ marginTop: 8 }}>
                <Pill k={m.k}>{m.sub}</Pill>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Agenda de hoje */}
        <div className="ov-card">
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border2}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>Agenda de hoje</h3>
            <Link href="/agenda" style={{ fontSize: 13, color: T.purple700, fontWeight: 500, textDecoration: 'none' }}>
              Ver tudo →
            </Link>
          </div>
          {UPCOMING.map((u, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 18px',
              borderBottom: i < UPCOMING.length - 1 ? `1px solid ${T.border2}` : 0,
            }}>
              <div style={{ width: 54, fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: T.ink, flexShrink: 0 }}>
                {u.time}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{u.title}</div>
                <div style={{ fontSize: 12, color: T.fg3, marginTop: 2 }}>{u.client}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: T.fg3, marginRight: 8 }}>{u.tag}</span>
              <Pill k={OS_STATUS[u.status][0]}>{OS_STATUS[u.status][1]}</Pill>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ações rápidas */}
          <div className="ov-card">
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border2}` }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>Ações rápidas</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {QUICK_ACTIONS.map(([Icon, label, href], x) => (
                <Link
                  key={x}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0 18px', height: 64,
                    borderRight: x % 2 === 0 ? `1px solid ${T.border2}` : 'none',
                    borderTop: x > 1 ? `1px solid ${T.border2}` : 'none',
                    fontSize: 13, fontWeight: 500, color: T.ink, textDecoration: 'none',
                  }}
                >
                  <Icon size={18} color={T.purple600} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Plan info banner */}
          <div className="ov-card ov-card-body" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Info size={18} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#92400E' }}>Orcivo Mais · uso da equipe</div>
                <div style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>
                  4 técnicos ativos. Veja os planos se sua equipe for crescer.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Últimas atividades ──────────────────────────────────────── */}
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: T.ink }}>Últimas atividades</h3>
      <div className="ov-card">
        {ACTIVITY.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px',
            borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${T.border2}` : 0,
          }}>
            <Pill k={a.k}>{a.target}</Pill>
            <div style={{ flex: 1, fontSize: 13 }}>
              <b style={{ fontWeight: 600 }}>{a.who}</b>{' '}
              <span style={{ color: T.fg3 }}>{a.what}</span>
            </div>
            <div style={{ fontSize: 12, color: T.fg3, flexShrink: 0 }}>{a.when}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
