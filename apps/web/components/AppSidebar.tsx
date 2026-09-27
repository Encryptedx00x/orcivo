'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  FileText,
  ClipboardList,
  Calendar,
  DollarSign,
  FolderOpen,
  Settings,
  UserPlus,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const PLAN_LABEL: Record<string, string> = {
  LIVRE: 'Orcivo Livre',
  SOLO: 'Orcivo Solo',
  MAIS: 'Orcivo Mais',
  EQUIPE: 'Orcivo Equipe',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NAV_MAIN = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Catálogo', href: '/catalogo', icon: Package },
  { label: 'Orçamentos', href: '/orcamentos', icon: FileText },
  { label: 'Ordens de Serviço', href: '/ordens-de-servico', icon: ClipboardList },
  { label: 'Agenda', href: '/agenda', icon: Calendar },
  { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { label: 'Documentos', href: '/documentos', icon: FolderOpen },
];

const NAV_ACCOUNT = [
  { label: 'Equipe', href: '/equipe', icon: UserPlus },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
];

function NavItem({
  label,
  href,
  icon: Icon,
  pathname,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  pathname: string;
}) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        marginBottom: 2,
        color: active ? '#4C1D95' : '#334155',
        fontWeight: active ? 600 : 500,
        textDecoration: 'none',
        backgroundColor: active ? '#F5F3FF' : 'transparent',
        fontSize: 14,
      }}
    >
      <Icon size={18} strokeWidth={active ? 2 : 1.75} color={active ? '#6D28D9' : undefined} />
      {label}
    </Link>
  );
}

export function AppSidebar(): JSX.Element {
  const pathname = usePathname();
  const { user, company } = useAuth();
  const displayName = user?.name || 'Usuário';
  const initials = user?.name ? getInitials(user.name) : '?';
  const planLabel = company ? (PLAN_LABEL[company.plan_code] ?? company.plan_code) : '';
  const companyLine = company ? [company.trade_name, planLabel].filter(Boolean).join(' · ') : '';
  return (
    <aside
      style={{
        width: 260,
        minHeight: '100vh',
        borderRight: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        padding: '18px 14px',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 14px' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #0A0A0F 0%, #6D28D9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12 10 17 19 7" />
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
          Orcivo
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <p
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 500,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '14px 10px 4px',
            margin: 0,
          }}
        >
          Principal
        </p>
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}

        <p
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 500,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '14px 10px 4px',
            margin: 0,
          }}
        >
          Conta
        </p>
        {NAV_ACCOUNT.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 10px 0',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#EDE9FE',
            color: '#4C1D95',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#0A0A0F',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#64748B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {companyLine}
          </div>
        </div>
      </div>
    </aside>
  );
}
