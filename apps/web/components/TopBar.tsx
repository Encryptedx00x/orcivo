'use client';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function TopBar(): JSX.Element {
  const router = useRouter();
  const { company } = useAuth();
  const companyName = company?.trade_name;
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };
  return (
    <header
      style={{
        height: 64,
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#FFFFFF',
        flexShrink: 0,
        gap: 16,
      }}
    >
      {/* Search — disabled: no cross-entity search backend yet */}
      <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#CBD5E1',
            pointerEvents: 'none',
          }}
        />
        <input
          type="search"
          placeholder="Busca em breve"
          disabled
          title="Busca em breve"
          aria-disabled="true"
          style={{
            width: '100%',
            height: 40,
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            paddingLeft: 36,
            paddingRight: 12,
            fontSize: 14,
            color: '#94A3B8',
            backgroundColor: '#F1F5F9',
            outline: 'none',
            cursor: 'not-allowed',
          }}
        />
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          disabled
          aria-disabled="true"
          title="Notificações em breve"
          style={{
            background: 'none',
            border: 'none',
            borderRadius: 10,
            width: 40,
            height: 40,
            cursor: 'not-allowed',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={18} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px',
            height: 40,
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {(companyName ?? 'O').charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#0A0A0F',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {companyName ?? ''}
          </span>
          <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            borderRadius: 10,
            width: 40,
            height: 40,
            cursor: 'pointer',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
