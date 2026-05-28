import { apiFetch } from '../../../lib/api';
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';

interface Customer { id: string; name: string; phone: string | null; }

export default async function ClientesPage(): Promise<JSX.Element> {
  let customers: Customer[] = [];
  try {
    const data = await apiFetch<{ data: Customer[] }>('/customers');
    customers = data.data;
  } catch {}

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F' }}>Clientes</h1>
        <Link
          href="/clientes/novo"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            backgroundColor: '#6D28D9', color: '#fff',
            borderRadius: 12, padding: '8px 18px',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          <Plus size={16} /> Novo cliente
        </Link>
      </div>

      {/* Empty state */}
      {customers.length === 0 && (
        <div style={{
          backgroundColor: '#fff', border: '1px solid #E2E8F0',
          borderRadius: 12, padding: '48px 24px', textAlign: 'center',
        }}>
          <Users size={40} style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', marginBottom: 6 }}>
            Nenhum cliente cadastrado ainda.
          </p>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16 }}>
            Cadastre seu primeiro cliente para começar a criar orçamentos.
          </p>
          <Link
            href="/clientes/novo"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#6D28D9', fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}
          >
            <Plus size={14} /> Cadastrar primeiro cliente
          </Link>
        </div>
      )}

      {/* Table */}
      {customers.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <th style={th}>Nome</th>
                <th style={th}>Telefone</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={td}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                  <td style={{ ...td, color: '#64748B' }}>{c.phone ?? '—'}</td>
                  <td style={td}>
                    <Link
                      href={`/clientes/${c.id}`}
                      style={{ color: '#6D28D9', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}
                    >
                      Ver detalhe
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#64748B', fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: '13px 16px', fontSize: 14, color: '#0A0A0F',
};
