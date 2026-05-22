import { apiFetch } from '../../../lib/api';
import Link from 'next/link';

interface Customer { id: string; name: string; phone: string | null; }

export default async function ClientesPage() {
  let customers: Customer[] = [];
  try {
    const data = await apiFetch<{ data: Customer[] }>('/customers');
    customers = data.data;
  } catch {}

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Clientes</h1>
        <Link href="/clientes/novo" style={{ backgroundColor: '#6D28D9', color: '#fff', borderRadius: 8, padding: '8px 18px', textDecoration: 'none', fontWeight: 600 }}>+ Novo cliente</Link>
      </div>
      {customers.length === 0 ? (
        <p style={{ color: '#6B7280' }}>Nenhum cliente cadastrado ainda.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead><tr style={{ borderBottom: '1px solid #E5E7EB' }}><th style={th}>Nome</th><th style={th}>Telefone</th></tr></thead>
          <tbody>{customers.map(c => <tr key={c.id} style={{ borderBottom: '1px solid #E5E7EB' }}><td style={td}>{c.name}</td><td style={td}>{c.phone ?? '—'}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#6B7280', fontWeight: 600 };
const td: React.CSSProperties = { padding: '12px 16px', fontSize: 15, color: '#0A0A0F' };
