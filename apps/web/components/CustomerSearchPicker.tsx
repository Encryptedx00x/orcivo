'use client';

import { Search, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export interface CustomerSearchOption {
  id: string;
  name: string;
  phone?: string | null;
  city?: string | null;
}

interface Props {
  value: string;
  onChange: (id: string, customer?: CustomerSearchOption) => void;
  initialCustomer?: CustomerSearchOption | null;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
}

const PAGE_SIZE = 10;

export function CustomerSearchPicker({
  value,
  onChange,
  initialCustomer,
  allowEmpty = false,
  emptyLabel = 'Sem cliente',
  disabled = false,
  required = false,
}: Props): React.JSX.Element {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedRequestRef = useRef(0);
  const listRequestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CustomerSearchOption[]>(
    initialCustomer ? [initialCustomer] : [],
  );
  const [selected, setSelected] = useState<CustomerSearchOption | null>(initialCustomer ?? null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialCustomer?.id === value) setSelected(initialCustomer);
  }, [initialCustomer, value]);

  useEffect(() => {
    if (!value) {
      selectedRequestRef.current += 1;
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;
    const known = items.find((item) => item.id === value);
    if (known) {
      setSelected(known);
      return;
    }
    const requestId = ++selectedRequestRef.current;
    void fetch(`/api/customers/${encodeURIComponent(value)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((customer: CustomerSearchOption | null) => {
        if (requestId === selectedRequestRef.current && customer?.id === value) {
          setSelected(customer);
        }
      })
      .catch(() => undefined);
  }, [items, selected?.id, value]);

  useEffect(() => {
    if (!open || disabled) return;
    const timer = window.setTimeout(
      () => {
        const requestId = ++listRequestRef.current;
        setLoading(true);
        setError('');
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        if (query.trim()) params.set('search', query.trim());
        void fetch(`/api/customers?${params.toString()}`)
          .then(async (response) => {
            if (!response.ok) throw new Error();
            return response.json() as Promise<{ data?: CustomerSearchOption[] }>;
          })
          .then((body) => {
            if (requestId !== listRequestRef.current) return;
            const next = body.data ?? [];
            setItems((current) => {
              const base = page === 1 ? [] : current;
              const merged = new Map(base.map((item) => [item.id, item]));
              if (selected) merged.set(selected.id, selected);
              next.forEach((item) => merged.set(item.id, item));
              return [...merged.values()];
            });
            setHasMore(next.length === PAGE_SIZE);
          })
          .catch(() => {
            if (requestId === listRequestRef.current) {
              setError('Não foi possível carregar os clientes.');
            }
          })
          .finally(() => {
            if (requestId === listRequestRef.current) setLoading(false);
          });
      },
      page === 1 ? 250 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      listRequestRef.current += 1;
    };
  }, [disabled, open, page, query, selected]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (customer?: CustomerSearchOption) => {
    setSelected(customer ?? null);
    onChange(customer?.id ?? '', customer);
    setOpen(false);
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const queryDigits = query.replace(/\D/g, '');
  const visibleItems = items.filter((item) => {
    if (!normalizedQuery) return true;
    return (
      item.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      (item.city ?? '').toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
      (!!queryDigits && (item.phone ?? '').replace(/\D/g, '').includes(queryDigits))
    );
  });

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%' }}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-required={required}
        disabled={disabled}
        className="ov-input"
        onClick={() => {
          setPage(1);
          setQuery('');
          setOpen((current) => !current);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: selected ? '#0A0A0F' : '#64748B',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.name ?? (allowEmpty && !value ? emptyLabel : 'Buscar cliente…')}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={`${id}-options`}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 80,
            left: 0,
            right: 0,
            top: 'calc(100% + 4px)',
            padding: 8,
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            background: '#FFFFFF',
            boxShadow: '0 12px 30px rgba(15,23,42,.16)',
          }}
        >
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{ position: 'absolute', left: 10, top: 10, color: '#64748B' }}
            />
            <input
              autoFocus
              className="ov-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
              }}
              placeholder="Buscar por nome ou telefone…"
              aria-label="Buscar cliente"
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {allowEmpty ? (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => choose()}
                style={optionStyle(!value)}
              >
                {emptyLabel}
              </button>
            ) : null}
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === value}
                onClick={() => choose(item)}
                style={optionStyle(item.id === value)}
              >
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                {item.city || item.phone ? (
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    {[item.phone, item.city].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </button>
            ))}
            {!loading && visibleItems.length === 0 ? (
              <p style={{ margin: 0, padding: 12, color: '#64748B', fontSize: 13 }}>
                Nenhum cliente encontrado.
              </p>
            ) : null}
            {error ? (
              <p role="alert" style={{ margin: 0, padding: 12, color: '#B91C1C', fontSize: 13 }}>
                {error}
              </p>
            ) : null}
          </div>
          {loading ? (
            <p style={{ margin: 0, padding: 10, color: '#64748B', fontSize: 13 }}>Carregando…</p>
          ) : null}
          {hasMore && !loading ? (
            <button
              type="button"
              className="ov-btn ov-btn-outline"
              onClick={() => setPage((current) => current + 1)}
              style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}
            >
              Ver mais
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function optionStyle(selected: boolean): React.CSSProperties {
  return {
    width: '100%',
    minHeight: 44,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
    padding: '8px 10px',
    border: 0,
    borderRadius: 8,
    background: selected ? '#F5F3FF' : '#FFFFFF',
    color: '#0A0A0F',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
  };
}
