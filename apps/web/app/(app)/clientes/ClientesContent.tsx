'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plus, Users, Search, ChevronRight } from 'lucide-react';
import { maskPhone } from '@orcivo/shared-types';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
}

export function ClientesContent({ customers }: { customers: Customer[] }): React.JSX.Element {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(customers);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(customers.length === 20);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      setLoading(true);
      setLoadError('');
      const params = new URLSearchParams({ page: '1', limit: '20' });
      if (q.trim()) params.set('search', q.trim());
      void fetch(`/api/customers?${params.toString()}`)
        .then(async (response) => {
          if (!response.ok) throw new Error();
          return response.json() as Promise<{ data?: Customer[] }>;
        })
        .then((body) => {
          if (requestId !== requestRef.current) return;
          const next = body.data ?? [];
          setItems(next);
          setPage(1);
          setHasMore(next.length === 20);
        })
        .catch(() => {
          if (requestId === requestRef.current) {
            setLoadError('Não foi possível carregar os clientes.');
          }
        })
        .finally(() => {
          if (requestId === requestRef.current) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      requestRef.current += 1;
    };
  }, [q]);

  const loadMore = async () => {
    const requestId = ++requestRef.current;
    const nextPage = page + 1;
    const params = new URLSearchParams({ page: String(nextPage), limit: '20' });
    if (q.trim()) params.set('search', q.trim());
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/customers?${params.toString()}`);
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { data?: Customer[] };
      if (requestId !== requestRef.current) return;
      const next = body.data ?? [];
      setItems((current) => [
        ...current,
        ...next.filter((item) => !current.some((known) => known.id === item.id)),
      ]);
      setPage(nextPage);
      setHasMore(next.length === 20);
    } catch {
      if (requestId === requestRef.current) {
        setLoadError('Não foi possível carregar mais clientes.');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: 0,
            }}
          >
            Clientes
          </h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {items.length} {items.length === 1 ? 'cliente exibido' : 'clientes exibidos'}
          </div>
        </div>
        <div className="row-flex">
          <Link href="/clientes/novo" className="ov-btn ov-btn-primary">
            <Plus size={16} />
            Novo cliente
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div className="ov-search" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} color="#64748B" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, telefone…"
          />
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && !loading && (
        <div className="ov-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Users size={40} style={{ margin: '0 auto 12px', color: '#94A3B8', display: 'block' }} />
          <p style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', margin: '0 0 6px' }}>
            {q ? 'Nenhum resultado encontrado.' : 'Nenhum cliente cadastrado ainda.'}
          </p>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px' }}>
            {q
              ? 'Tente outro termo de busca.'
              : 'Cadastre seu primeiro cliente para começar a criar orçamentos.'}
          </p>
          {!q && (
            <Link
              href="/clientes/novo"
              className="ov-btn ov-btn-primary"
              style={{ display: 'inline-flex' }}
            >
              <Plus size={14} />
              Cadastrar primeiro cliente
            </Link>
          )}
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="ov-card" style={{ overflow: 'hidden' }}>
          <table className="ov-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Cidade</th>
                <th>Cadastrado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td data-label="Nome">
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                  </td>
                  <td data-label="Telefone" className="ov-muted">
                    {c.phone ? maskPhone(c.phone) : '—'}
                  </td>
                  <td data-label="Cidade" className="ov-muted">
                    {c.city ? `${c.city}${c.state ? ` / ${c.state}` : ''}` : '—'}
                  </td>
                  <td data-label="Cadastrado em" className="ov-muted" style={{ fontSize: 13 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td data-label="" style={{ textAlign: 'right' }}>
                    <Link
                      href={`/clientes/${c.id}`}
                      style={{ color: '#94A3B8', display: 'inline-flex' }}
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore ? (
            <div style={{ padding: 14, borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <button
                type="button"
                className="ov-btn ov-btn-outline"
                onClick={() => void loadMore()}
                disabled={loading}
              >
                {loading ? 'Carregando…' : 'Ver mais clientes'}
              </button>
            </div>
          ) : null}
        </div>
      )}
      {loadError ? (
        <p role="alert" style={{ color: '#B91C1C', fontSize: 14 }}>
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
