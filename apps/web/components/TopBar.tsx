'use client';
import { useRouter } from 'next/navigation';

export function TopBar({ companyName }: { companyName?: string }) {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };
  return (
    <header style={{ height: 64, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: '#FFFFFF' }}>
      <span style={{ fontWeight: 600, color: '#0A0A0F' }}>{companyName ?? ''}</span>
      <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: '#374151', fontSize: 14 }}>Sair</button>
    </header>
  );
}
