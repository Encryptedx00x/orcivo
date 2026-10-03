'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Calendar, User, Info, ChevronDown } from 'lucide-react';
import { WorkOrderCreateSchema } from '@orcivo/shared-types';

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
}

function NovaOSContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('client_id') ?? '';

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerQuery, setCustomerQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    customer_id: preselectedClientId,
    title: '',
    notes: '',
    scheduled_at: '',
    scheduled_time: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((data: unknown) => {
        const list = Array.isArray(data)
          ? data
          : ((data as { data?: CustomerOption[] }).data ?? []);
        setCustomers(list as CustomerOption[]);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, []);

  const selectedCustomer = customers.find((c) => c.id === form.customer_id);

  const filteredCustomers = customers.filter(
    (c) =>
      !customerQuery ||
      c.name.toLowerCase().includes(customerQuery.toLowerCase()) ||
      (c.phone ?? '').includes(customerQuery),
  );

  function selectCustomer(c: CustomerOption): void {
    setForm((p) => ({ ...p, customer_id: c.id }));
    setCustomerQuery(c.name);
    setDropdownOpen(false);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError('');

    let scheduled_at: string | undefined;
    if (form.scheduled_at) {
      const dt = form.scheduled_time
        ? `${form.scheduled_at}T${form.scheduled_time}:00`
        : `${form.scheduled_at}T08:00:00`;
      scheduled_at = new Date(dt).toISOString();
    }

    const payload = {
      customer_id: form.customer_id,
      title: form.title,
      notes: form.notes || undefined,
      scheduled_at,
    };

    const parsed = WorkOrderCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(', '));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || 'Erro ao criar OS.');
        return;
      }

      const created = (await res.json()) as { id: string };
      router.push(`/ordens-de-servico/${created.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '20px 32px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
            fontSize: 13,
            color: '#64748B',
          }}
        >
          <Link href="/ordens-de-servico" style={{ color: '#64748B', textDecoration: 'none' }}>
            Ordens de Serviço
          </Link>
          <span style={{ color: '#CBD5E1' }}>·</span>
          <span style={{ color: '#0A0A0F', fontWeight: 500 }}>Nova OS</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
              Nova Ordem de Serviço
            </h1>
            <p style={{ color: '#64748B', fontSize: 14, marginTop: 4, marginBottom: 0 }}>
              Crie a OS e acompanhe o andamento em campo.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/ordens-de-servico" style={btnGhost}>
              Cancelar
            </Link>
            <button
              type="submit"
              form="nova-os-form"
              style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Criando...' : 'Criar OS'}
            </button>
          </div>
        </div>
      </div>

      <form
        id="nova-os-form"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <div
          className="ov-row-detail"
          style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}
        >
          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cliente */}
            <div style={card}>
              <h3 style={sectionTitle}>
                <User
                  size={14}
                  style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                />
                Cliente
              </h3>

              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Selecionar cliente *</label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 40,
                    border: `1.5px solid ${form.customer_id ? '#6D28D9' : '#E2E8F0'}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: '#fff',
                    position: 'relative',
                  }}
                  onClick={() => {
                    setDropdownOpen((p) => !p);
                    setCustomerQuery('');
                  }}
                >
                  {selectedCustomer ? (
                    <>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: '#EDE9FE',
                          color: '#4C1D95',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: '#0A0A0F',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {selectedCustomer.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {selectedCustomer.phone ?? ''}
                          {selectedCustomer.city ? ` · ${selectedCustomer.city}` : ''}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#94A3B8', fontSize: 14 }}>
                      {loadingCustomers ? 'Carregando...' : 'Buscar cliente…'}
                    </span>
                  )}
                  <ChevronDown size={16} color="#64748B" style={{ flexShrink: 0 }} />
                </div>

                {dropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      background: '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      marginTop: 4,
                      maxHeight: 260,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>
                      <input
                        autoFocus
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        placeholder="Buscar por nome ou telefone…"
                        style={{
                          width: '100%',
                          border: '1px solid #E2E8F0',
                          borderRadius: 7,
                          height: 34,
                          padding: '0 10px',
                          fontSize: 13,
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {filteredCustomers.length === 0 ? (
                        <div
                          style={{
                            padding: '16px 14px',
                            fontSize: 13,
                            color: '#94A3B8',
                            textAlign: 'center',
                          }}
                        >
                          Nenhum cliente encontrado.{' '}
                          <Link
                            href="/clientes/novo"
                            style={{ color: '#6D28D9', textDecoration: 'none', fontWeight: 600 }}
                          >
                            Cadastrar novo
                          </Link>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F8FAFC',
                              background: form.customer_id === c.id ? '#F5F3FF' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.background =
                                form.customer_id === c.id ? '#F5F3FF' : 'transparent';
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: '#EDE9FE',
                                color: '#4C1D95',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 12,
                                flexShrink: 0,
                              }}
                            >
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: '#0A0A0F' }}>
                                {c.name}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748B' }}>
                                {c.phone ?? '—'}
                                {c.city ? ` · ${c.city}` : ''}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Serviço */}
            <div style={card}>
              <h3 style={sectionTitle}>
                <ClipboardList
                  size={14}
                  style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                />
                Serviço
              </h3>

              <Field label="Título do serviço *">
                <input
                  style={inp}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex.: Instalação de ar-condicionado split 12.000 BTUs"
                  required
                />
              </Field>

              <div style={{ marginTop: 14 }}>
                <Field label="Observações internas">
                  <textarea
                    style={{ ...inp, height: 90, resize: 'vertical', paddingTop: 10 }}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Detalhes do serviço, materiais necessários, acesso ao local…"
                  />
                </Field>
              </div>
            </div>

            {/* Agendamento */}
            <div style={card}>
              <h3 style={sectionTitle}>
                <Calendar
                  size={14}
                  style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                />
                Agendamento
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Data">
                  <input
                    type="date"
                    style={inp}
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </Field>
                <Field label="Horário">
                  <input
                    type="time"
                    style={{ ...inp, opacity: form.scheduled_at ? 1 : 0.5 }}
                    value={form.scheduled_time}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_time: e.target.value }))}
                    disabled={!form.scheduled_at}
                  />
                </Field>
              </div>

              {!form.scheduled_at && (
                <p
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    margin: '10px 0 0',
                    fontStyle: 'italic',
                  }}
                >
                  Agendamento opcional — pode ser definido depois.
                </p>
              )}
            </div>

            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#DC2626',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* ── Right rail ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Preview */}
            <div style={card}>
              <h3 style={sectionTitle}>Resumo</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={metaLabel}>Cliente</div>
                  <div style={metaValue}>
                    {selectedCustomer ? (
                      selectedCustomer.name
                    ) : (
                      <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Não selecionado</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={metaLabel}>Serviço</div>
                  <div style={metaValue}>
                    {form.title || (
                      <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Não preenchido</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={metaLabel}>Agendado para</div>
                  <div style={metaValue}>
                    {form.scheduled_at ? (
                      new Date(
                        `${form.scheduled_at}T${form.scheduled_time || '08:00'}:00`,
                      ).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>A definir</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={metaLabel}>Status inicial</div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      background: '#FEF3C7',
                      color: '#92400E',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'currentColor',
                      }}
                    />
                    Pendente
                  </span>
                </div>
              </div>
            </div>

            {/* Dica */}
            <div
              style={{
                background: '#F5F3FF',
                border: '1px solid #DDD6FE',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={18} color="#6D28D9" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: '#3B0764', lineHeight: '18px' }}>
                  <strong>Mínimo:</strong> cliente + título.
                  <br />
                  Fotos de antes/durante/depois são adicionadas pelo técnico no app mobile.
                </div>
              </div>
            </div>

            {/* Atalhos pós-criação */}
            <div style={card}>
              <h3 style={sectionTitle}>Após criar</h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: '18px' }}>
                Você será redirecionado para a OS criada, onde poderá alterar o status e acompanhar
                o andamento.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NovaOSPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{ padding: '20px 32px', maxWidth: 900, color: '#64748B', fontSize: 14 }}
        >
          Carregando formulário...
        </div>
      }
    >
      <NovaOSContent />
    </Suspense>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: '20px 22px',
};

const inp: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 40,
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 14,
  color: '#0A0A0F',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 5,
  letterSpacing: '0.01em',
};

const metaLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 2,
};

const metaValue: React.CSSProperties = {
  fontSize: 14,
  color: '#0A0A0F',
  fontWeight: 500,
};

const btnPrimary: React.CSSProperties = {
  height: 38,
  padding: '0 18px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  background: '#6D28D9',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnGhost: React.CSSProperties = {
  height: 38,
  padding: '0 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  background: 'transparent',
  color: '#64748B',
  border: '1px solid transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};
