'use client';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut, ChevronDown } from 'lucide-react';

export function TopBar({ companyName }: { companyName?: string }): JSX.Element {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };
  return (
    <header style={{
      height: 64, borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', backgroundColor: '#FFFFFF', flexShrink: 0, gap: 16,
    }}>
      {/* Search */}
      <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
        <input
          type="search"
          placeholder="Buscar clientes, orçamentos..."
          style={{
            width: '100%', height: 40, border: '1px solid #E2E8F0', borderRadius: 10,
            paddingLeft: 36, paddingRight: 12, fontSize: 14, color: '#0A0A0F',
            backgroundColor: '#F8FAFC', outline: 'none',
          }}
        />
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          background: 'none', border: 'none', borderRadius: 10,
          width: 40, height: 40, cursor: 'pointer', color: '#64748B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bell size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', height: 40, borderRadius: 10, border: '1px solid #E2E8F0', cursor: 'pointer' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {(companyName ?? 'O').charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0F', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {companyName ?? ''}
          </span>
          <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', borderRadius: 10,
            width: 40, height: 40, cursor: 'pointer', color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
