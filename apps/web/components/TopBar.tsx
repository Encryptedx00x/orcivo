'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

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
      padding: '0 32px', backgroundColor: '#FFFFFF', flexShrink: 0,
    }}>
      <span style={{ fontWeight: 600, color: '#0A0A0F', fontSize: 15 }}>{companyName ?? ''}</span>
      <button
        onClick={handleLogout}
        style={{
          background: 'none', border: '1px solid #E2E8F0', borderRadius: 10,
          padding: '6px 14px', cursor: 'pointer', color: '#334155', fontSize: 13,
          fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <LogOut size={15} /> Sair
      </button>
    </header>
  );
}
