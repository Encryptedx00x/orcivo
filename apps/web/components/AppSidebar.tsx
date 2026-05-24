'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, FileText, ClipboardList, Calendar, DollarSign, FolderOpen, Settings } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Catálogo', href: '/catalogo', icon: Package },
  { label: 'Orçamentos', href: '/orcamentos', icon: FileText },
  { label: 'Ordens de Serviço', href: '/ordens-de-servico', icon: ClipboardList },
  { label: 'Agenda', href: '/agenda', icon: Calendar },
  { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { label: 'Documentos', href: '/documentos', icon: FolderOpen },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
];

export function AppSidebar(): JSX.Element {
  const pathname = usePathname();
  return (
    <aside style={{ width: 260, minHeight: '100vh', borderRight: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E2E8F0' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #6D28D9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7l-8-5z" fill="rgba(109,40,217,0.7)" stroke="#8B5CF6" strokeWidth="1.5"/>
            <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#0A0A0F', letterSpacing: '-0.01em' }}>Orcivo</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', marginBottom: 2,
              color: active ? '#6D28D9' : '#334155',
              fontWeight: active ? 600 : 500,
              textDecoration: 'none',
              backgroundColor: active ? '#F5F3FF' : 'transparent',
              borderRadius: 10,
              fontSize: 14,
              transition: 'background-color 0.1s',
            }}>
              <Icon size={20} strokeWidth={active ? 2 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
