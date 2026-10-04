import Link from 'next/link';
import {
  Plus,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  DollarSign,
  Package,
  Inbox,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';
import { DashboardLayout } from '../../../components/DashboardLayout';

const T = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#64748B',
  border2: '#F1F5F9',
  purple600: '#6D28D9',
  purple700: '#5B21B6',
  purple50: '#F5F3FF',
  purple800: '#4C1D95',
  slate100: '#F1F5F9',
  warningBg: '#FEF3C7',
  successBg: '#DCFCE7',
  dangerBg: '#FEE2E2',
  danger: '#DC2626',
  infoBg: '#E0F2FE',
};

interface Summary {
  user: { name: string };
  company: { trade_name: string; plan_code: string };
  kpis: {
    agenda_today: number;
    os_pending: number;
    quotes_pending: number;
    quotes_pending_total: string;
    receivables_pending_total: string;
    receivables_pending_count: number;
    receivables_overdue_count: number;
  };
  upcoming: Array<{
    id: string;
    title: string;
    type: string;
    starts_at: string;
    customer: { id: string; name: string } | null;
  }>;
  activity: Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    metadata?: { humanText?: string | null } | null;
  }>;
}

const PLAN_LABEL: Record<string, string> = {
  LIVRE: 'Orcivo Livre',
  SOLO: 'Orcivo Solo',
  MAIS: 'Orcivo Mais',
  EQUIPE: 'Orcivo Equipe',
};

// Onde a ação aconteceu (área do produto) e um rótulo curto por ação, usados
// para montar o "caminho" da atividade (ex.: "Agenda → Novo compromisso").
// O texto do evento em si (humanText) já vem pronto do AuditService.
const AREA_LABEL: Record<string, string> = {
  appointment: 'Agenda',
  customer: 'Clientes',
  work_order: 'Ordens de serviço',
  payment: 'Financeiro',
  quote: 'Orçamentos',
  company: 'Empresa',
  invite: 'Equipe',
};

const STEP_LABEL: Record<string, string> = {
  'appointment.created': 'Novo compromisso',
  'appointment.updated': 'Compromisso editado',
  'appointment.deleted': 'Compromisso removido',
  'customer.created': 'Novo cliente',
  'customer.updated': 'Cliente editado',
  'customer.deleted': 'Cliente removido',
  'work_order.created': 'Nova OS',
  'work_order.started': 'OS iniciada',
  'work_order.finished': 'OS finalizada',
  'work_order.completed': 'OS concluída',
  'work_order.cancelled': 'OS cancelada',
  'work_order.reopened': 'OS reaberta',
  'work_order.corrected': 'OS corrigida',
  'payment.created': 'Novo recebimento',
  'payment.settled': 'Recebimento quitado',
  'payment.deleted': 'Recebimento removido',
  'quote.created': 'Novo orçamento',
  'quote.sent': 'Orçamento enviado',
  'quote.approved': 'Orçamento aprovado',
  'quote.rejected': 'Orçamento recusado',
  'quote.cancelled': 'Orçamento cancelado',
  'quote.expired': 'Orçamento expirado',
  'quote.reopened': 'Orçamento reaberto',
  'quote.corrected': 'Orçamento corrigido',
  'company.profile_updated': 'Perfil atualizado',
  'company.approval_methods_changed': 'Formas de aprovação alteradas',
  'invite.created': 'Convite enviado',
  'invite.accepted': 'Convite aceito',
  'invite.revoked': 'Convite revogado',
};

const ENTITY_LABEL: Record<string, string> = {
  quote: 'Orçamento',
  work_order: 'OS',
  payment: 'Recebimento',
  customer: 'Cliente',
  appointment: 'Compromisso',
  company: 'Empresa',
  invite: 'Convite',
};

function activityPath(entityType: string, action: string): string {
  const area = AREA_LABEL[entityType] ?? ENTITY_LABEL[entityType] ?? entityType;
  const step = STEP_LABEL[action] ?? action;
  return `${area} → ${step}`;
}

function activityDetail(a: Summary['activity'][number]): string {
  const humanText = a.metadata?.humanText;
  if (humanText) return humanText;
  return `${ENTITY_LABEL[a.entity_type] ?? a.entity_type} — ${STEP_LABEL[a.action] ?? a.action}`;
}

const QUICK_ACTIONS: [typeof Users, string, string][] = [
  [Users, 'Novo cliente', '/clientes/novo'],
  [FileText, 'Novo orçamento', '/orcamentos/novo'],
  [ClipboardList, 'Nova OS', '/ordens-de-servico/novo'],
  [Calendar, 'Compromisso', '/agenda'],
  [DollarSign, 'Recebimento', '/financeiro'],
  [Package, 'Item catálogo', '/catalogo/novo'],
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

function Pill({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 9px',
        borderRadius: 9999,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  );
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const s = await apiFetch<Summary>('/dashboard/summary');

  const now = new Date();
  const greet = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
  const dateCap = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const firstName = (s?.user.name ?? '').split(' ')[0] || 'técnico';
  const planLabel = PLAN_LABEL[s?.company.plan_code ?? 'LIVRE'] ?? 'Orcivo Livre';

  const k = s?.kpis;
  const overdue = k?.receivables_overdue_count ?? 0;
  const kpis = [
    {
      label: 'Agenda hoje',
      value: String(k?.agenda_today ?? 0),
      sub: 'compromissos',
      bg: T.purple50,
      color: T.purple800,
    },
    {
      label: 'OS pendentes',
      value: String(k?.os_pending ?? 0),
      sub: 'abertas / em execução',
      bg: T.warningBg,
      color: '#92400E',
    },
    {
      label: 'Orçamentos pendentes',
      value: String(k?.quotes_pending ?? 0),
      sub: formatMoney(k?.quotes_pending_total ?? '0'),
      bg: T.infoBg,
      color: '#075985',
    },
    {
      label: 'Recebimentos pendentes',
      value: formatMoney(k?.receivables_pending_total ?? '0'),
      sub: overdue > 0 ? `${overdue} vencido${overdue > 1 ? 's' : ''}` : 'em dia',
      danger: overdue > 0,
      bg: overdue > 0 ? T.dangerBg : T.successBg,
      color: overdue > 0 ? '#991B1B' : '#166534',
    },
  ];

  const next = s?.upcoming[0];
  const bento = (
    <div className="ov-bento">
      <div className="ov-bento-hello">
        <strong>
          {greet}, {firstName}
        </strong>
        <span>
          {dateCap} · {planLabel}
        </span>
      </div>
      <Link href="/orcamentos/novo" className="ov-bento-tile ov-bento-cta ov-bento-wide">
        <Plus size={22} aria-hidden="true" />
        <span>
          <strong>Novo orçamento</strong>
          <small>PDF pronto para enviar no WhatsApp</small>
        </span>
      </Link>
      <Link href="/agenda" className="ov-bento-tile ov-bento-tall">
        <Calendar size={18} aria-hidden="true" />
        <span className="ov-bento-label">Agenda hoje</span>
        <span className="ov-bento-value">{k?.agenda_today ?? 0}</span>
        <span className="ov-bento-sub">
          {next
            ? `${new Date(next.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${next.title}`
            : 'Nenhum compromisso'}
        </span>
      </Link>
      <Link href="/ordens-de-servico" className="ov-bento-tile">
        <ClipboardList size={18} aria-hidden="true" />
        <span className="ov-bento-label">OS pendentes</span>
        <span className="ov-bento-value">{k?.os_pending ?? 0}</span>
      </Link>
      <Link href="/orcamentos" className="ov-bento-tile">
        <FileText size={18} aria-hidden="true" />
        <span className="ov-bento-label">Orçamentos</span>
        <span className="ov-bento-value">{k?.quotes_pending ?? 0}</span>
        <span className="ov-bento-sub">{formatMoney(k?.quotes_pending_total ?? '0')}</span>
      </Link>
      <Link
        href="/financeiro"
        className={`ov-bento-tile ov-bento-wide${overdue > 0 ? ' ov-bento-alert' : ''}`}
      >
        <DollarSign size={18} aria-hidden="true" />
        <span className="ov-bento-label">A receber</span>
        <span className="ov-bento-value">{formatMoney(k?.receivables_pending_total ?? '0')}</span>
        <span className="ov-bento-sub">
          {overdue > 0 ? `${overdue} vencido${overdue > 1 ? 's' : ''}` : 'Tudo em dia'}
        </span>
        <ChevronRight size={18} className="ov-bento-chevron" aria-hidden="true" />
      </Link>
      <div className="ov-bento-shortcuts ov-bento-wide">
        {(
          [
            [Users, 'Clientes', '/clientes'],
            [ClipboardList, 'Nova OS', '/ordens-de-servico/novo'],
            [Calendar, 'Compromisso', '/agenda'],
            [Package, 'Catálogo', '/catalogo'],
            [DollarSign, 'Recebimento', '/financeiro'],
            [FolderOpen, 'Documentos', '/documentos'],
          ] as const
        ).map(([Icon, label, href]) => (
          <Link key={label} href={href} className="ov-bento-shortcut">
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const easy = (
    <div className="ov-easy-home">
      <h1>
        {greet}, {firstName}!
      </h1>
      <div className="ov-easy-today">
        <p>
          Hoje você tem{' '}
          <strong>{plural(k?.agenda_today ?? 0, 'compromisso', 'compromissos')}</strong> e{' '}
          <strong>{plural(k?.os_pending ?? 0, 'serviço em aberto', 'serviços em aberto')}</strong>.
        </p>
        <p>
          Falta receber <strong>{formatMoney(k?.receivables_pending_total ?? '0')}</strong>
          {overdue > 0 ? (
            <>
              {' '}
              —{' '}
              <strong className="ov-easy-late">
                {plural(overdue, 'pagamento atrasado', 'pagamentos atrasados')}
              </strong>
            </>
          ) : null}
          .
        </p>
      </div>
      <h2>O que você quer fazer agora?</h2>
      <div className="ov-easy-actions">
        {(
          [
            [
              FileText,
              'Fazer um orçamento',
              'Monte o preço e mande pelo WhatsApp',
              '/orcamentos/novo',
            ],
            [Users, 'Cadastrar um cliente', 'Nome e telefone já bastam', '/clientes/novo'],
            [Calendar, 'Ver minha agenda', 'Seus compromissos de hoje e da semana', '/agenda'],
            [
              ClipboardList,
              'Abrir um serviço (OS)',
              'Registre o serviço que vai fazer',
              '/ordens-de-servico/novo',
            ],
            [DollarSign, 'Anotar um pagamento', 'Marque o que o cliente já pagou', '/financeiro'],
            [
              FolderOpen,
              'Ver meus orçamentos',
              'Veja quem aprovou e quem falta responder',
              '/orcamentos',
            ],
          ] as const
        ).map(([Icon, title, hint, href]) => (
          <Link key={href + title} href={href} className="ov-easy-action">
            <span className="ov-easy-icon">
              <Icon size={26} aria-hidden="true" />
            </span>
            <span className="ov-easy-text">
              <strong>{title}</strong>
              <span>{hint}</span>
            </span>
            <ChevronRight size={22} aria-hidden="true" className="ov-easy-chevron" />
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="ov-page" style={{ maxWidth: 1440 }}>
      <DashboardLayout bento={bento} easy={easy}>
        <div className="ov-page-header">
          <div>
            <h1
              style={{
                fontSize: 24,
                lineHeight: '32px',
                fontWeight: 700,
                letterSpacing: '-0.015em',
                color: T.ink,
                margin: 0,
              }}
            >
              {greet}, {firstName}
            </h1>
            <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>
              {dateCap} · {s?.company.trade_name ?? ''} · {planLabel}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              href="/clientes/novo"
              className="ov-btn ov-btn-outline"
              style={{ gap: 8, textDecoration: 'none' }}
            >
              <Users size={16} />
              Novo cliente
            </Link>
            <Link
              href="/orcamentos/novo"
              className="ov-btn ov-btn-primary"
              style={{ gap: 8, textDecoration: 'none' }}
            >
              <Plus size={16} />
              Novo orçamento
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="ov-grid-4" style={{ marginBottom: 20 }}>
          {kpis.map((m, i) => (
            <div key={i} className="ov-card">
              <div className="ov-card-body" style={{ padding: '16px 18px' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: T.fg3,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    lineHeight: '36px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    marginTop: 6,
                    fontVariantNumeric: 'tabular-nums',
                    color: m.danger ? T.danger : T.ink,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Pill bg={m.bg} color={m.color}>
                    {m.sub}
                  </Pill>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div
          className="ov-row-detail"
          style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}
        >
          {/* Agenda de hoje */}
          <div className="ov-card">
            <div
              style={{
                padding: '14px 18px',
                borderBottom: `1px solid ${T.border2}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>
                Agenda de hoje
              </h3>
              <Link
                href="/agenda"
                style={{
                  fontSize: 13,
                  color: T.purple700,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Ver tudo →
              </Link>
            </div>
            {(s?.upcoming ?? []).length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '40px 16px',
                  color: '#94A3B8',
                }}
              >
                <Inbox size={28} strokeWidth={1.5} />
                <p style={{ fontSize: 14, margin: 0 }}>Nenhum compromisso para hoje.</p>
              </div>
            ) : (
              s!.upcoming.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 18px',
                    borderBottom: i < s!.upcoming.length - 1 ? `1px solid ${T.border2}` : 0,
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      fontSize: 13,
                      color: T.ink,
                      flexShrink: 0,
                    }}
                  >
                    {new Date(u.starts_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{u.title}</div>
                    {u.customer && (
                      <div style={{ fontSize: 12, color: T.fg3, marginTop: 2 }}>
                        {u.customer.name}
                      </div>
                    )}
                  </div>
                  <Pill bg={T.purple50} color={T.purple800}>
                    {u.type.charAt(0) + u.type.slice(1).toLowerCase()}
                  </Pill>
                </div>
              ))
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ov-card">
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border2}` }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>
                  Ações rápidas
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {QUICK_ACTIONS.map(([Icon, label, href], x) => (
                  <Link
                    key={x}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0 18px',
                      height: 64,
                      borderRight: x % 2 === 0 ? `1px solid ${T.border2}` : 'none',
                      borderTop: x > 1 ? `1px solid ${T.border2}` : 'none',
                      fontSize: 13,
                      fontWeight: 500,
                      color: T.ink,
                      textDecoration: 'none',
                    }}
                  >
                    <Icon size={18} color={T.purple600} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Atividades */}
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: T.ink }}>
          Últimas atividades
        </h3>
        <div className="ov-card">
          {(s?.activity ?? []).length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '40px 16px',
                color: '#94A3B8',
              }}
            >
              <Inbox size={28} strokeWidth={1.5} />
              <p style={{ fontSize: 14, margin: 0 }}>Sem atividades recentes.</p>
            </div>
          ) : (
            s!.activity.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 18px',
                  borderBottom: i < s!.activity.length - 1 ? `1px solid ${T.border2}` : 0,
                }}
              >
                <Pill bg={T.purple50} color={T.purple800}>
                  {AREA_LABEL[a.entity_type] ?? ENTITY_LABEL[a.entity_type] ?? a.entity_type}
                </Pill>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.fg2 }}>{activityDetail(a)}</div>
                  <div style={{ fontSize: 11, color: T.fg3, marginTop: 2 }}>
                    {activityPath(a.entity_type, a.action)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.fg3, flexShrink: 0 }}>
                  {relativeTime(a.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardLayout>
    </div>
  );
}
