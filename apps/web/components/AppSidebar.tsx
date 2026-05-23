'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, FileText, ClipboardList, Calendar, DollarSign, FolderOpen, Settings } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Catálogo', href: '/catalogo', icon: Package },
  { label: 'Orçamentos', href: '/orcamentos', icon: FileText },
  { label: 'Ordens de Serviço', href: '/ordens', icon: ClipboardList },
  { label: 'Agenda', href: '/agenda', icon: Calendar },
  { label: 'Financeiro', href: '/financeiro', icon: DollarSign },
  { label: 'Documentos', href: '/documentos', icon: FolderOpen },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
];

export function AppSidebar(): JSX.Element {
  const pathname = usePathname();
  return (
    <aside style={{ width: 260, minHeight: '100vh', borderRight: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', padding: '24px 0' }}>
      <div style={{ padding: '0 20px 24px', fontWeight: 700, fontSize: 20, color: '#6D28D9' }}>Orcivo</div>
      <nav>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', color: active ? '#6D28D9' : '#374151', fontWeight: active ? 600 : 400, textDecoration: 'none', backgroundColor: active ? '#F5F3FF' : 'transparent', borderRight: active ? '3px solid #6D28D9' : '3px solid transparent' }}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
