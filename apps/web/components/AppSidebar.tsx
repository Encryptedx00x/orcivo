'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  CreditCard,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { BrandMark } from './BrandMark';
import { useMobileSidebar } from './MobileSidebar';

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
  { label: 'Plano e assinatura', href: '/plano', icon: CreditCard },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
];

function NavItem({
  label,
  href,
  icon: Icon,
  pathname,
  onNavigate,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onNavigate}
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

export function AppSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { user, company } = useAuth();
  const { open, close } = useMobileSidebar();
  const displayName = user?.name || 'Usuário';
  const initials = user?.name ? getInitials(user.name) : '?';
  const planLabel = company ? (PLAN_LABEL[company.plan_code] ?? company.plan_code) : '';
  const companyLine = company ? [company.trade_name, planLabel].filter(Boolean).join(' · ') : '';
  return (
    <>
      {open && <div className="ov-sidebar-backdrop" onClick={close} />}
      <aside
        className={`ov-sidebar${open ? ' ov-sidebar-open' : ''}`}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 14px',
          }}
        >
          <BrandMark />
          <button
            type="button"
            className="ov-hamburger"
            aria-label="Fechar menu"
            onClick={close}
            style={{
              width: 40,
              height: 40,
              border: 0,
              borderRadius: 10,
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
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
            <NavItem key={item.href} {...item} pathname={pathname} onNavigate={close} />
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
            <NavItem key={item.href} {...item} pathname={pathname} onNavigate={close} />
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
          <button
            type="button"
            aria-label="Sair"
            title="Sair"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
              router.refresh();
            }}
            style={{
              marginLeft: 'auto',
              width: 40,
              height: 40,
              flexShrink: 0,
              border: 0,
              borderRadius: 10,
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
