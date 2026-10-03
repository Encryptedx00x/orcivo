'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Pencil } from 'lucide-react';
import { AuditHistoryFeed } from '../AuditHistoryFeed';
import { contactLinks } from '../contact-links';

interface Customer {
  id: string;
  name: string;
  tax_id: string | null;
  phone: string | null;
  phone2: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  created_at: string;
}

interface Quote {
  id: string;
  number: number;
  title: string | null;
  status: string;
  total: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; k: string }> = {
  DRAFT: { label: 'Rascunho', k: 'slate' },
  SENT: { label: 'Pendente', k: 'info' },
  APPROVED: { label: 'Aprovado', k: 'success' },
  REJECTED: { label: 'Rejeitado', k: 'danger' },
  EXPIRED: { label: 'Expirado', k: 'warning' },
};

const PILL_COLORS: Record<string, { bg: string; color: string }> = {
  slate: { bg: '#F1F5F9', color: '#334155' },
  info: { bg: '#E0F2FE', color: '#075985' },
  success: { bg: '#DCFCE7', color: '#166534' },
  danger: { bg: '#FEE2E2', color: '#991B1B' },
  warning: { bg: '#FEF3C7', color: '#92400E' },
};

function Pill({ k = 'slate', children }: { k?: string; children: React.ReactNode }) {
  const c = PILL_COLORS[k] ?? PILL_COLORS.slate;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: '4px 9px',
        borderRadius: 9999,
        ...c,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'currentColor',
          flexShrink: 0,
        }}
      />
      {children}
    </span>
  );
}

const TABS = ['Resumo', 'Orçamentos', 'OS', 'Financeiro', 'Endereços', 'Histórico'];

export function ClienteDetail({
  customer,
  quotes,
}: {
  customer: Customer;
  quotes: Quote[];
}): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);
  const contact = contactLinks(customer.phone);

  const initials = customer.name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  const memberSince = new Date(customer.created_at).toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  });

  const formatMoney = (v: string) =>
    `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const totalApproved = quotes
    .filter((q) => q.status === 'APPROVED')
    .reduce((acc, q) => acc + Number(q.total), 0);

  return (
    <div>
      {/* Topbar breadcrumb */}
      <div
        style={{
          height: 48,
          background: '#fff',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 6,
          fontSize: 13,
          color: '#64748B',
        }}
      >
        <Link href="/clientes" style={{ color: '#64748B', textDecoration: 'none' }}>
          Clientes
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: '#0A0A0F', fontWeight: 600 }}>{customer.name}</span>
      </div>

      {/* Main grid: aside + content */}
      <div
        className="ov-row-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: 20,
          padding: '20px 24px',
          minWidth: 0,
        }}
      >
        {/* ── Aside ── */}
        <div style={aside}>
          <div style={avatarStyle}>{initials}</div>

          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: '26px',
            }}
          >
            {customer.name}
          </h2>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
            Cliente desde {memberSince} · {quotes.length} orçamento{quotes.length !== 1 ? 's' : ''}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            <Pill k="info">Pessoa física</Pill>
            <Pill k="slate">Residência</Pill>
          </div>

          {/* Action buttons 2×2 */}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}
          >
            <Link
              href={`/orcamentos/novo?client_id=${customer.id}`}
              style={{ ...actionBtn, background: '#6D28D9', color: '#fff', border: 'none' }}
            >
              <Plus size={16} /> Orçamento
            </Link>
            <Link
              href={`/clientes/${customer.id}/editar`}
              style={{
                ...actionBtn,
                background: '#fff',
                color: '#334155',
                border: '1px solid #E2E8F0',
              }}
            >
              <Pencil size={15} /> Editar
            </Link>
            <Link
              href={`/ordens-de-servico/novo?client_id=${customer.id}`}
              style={{
                ...actionBtn,
                background: '#fff',
                color: '#334155',
                border: '1px solid #E2E8F0',
              }}
            >
              Nova OS
            </Link>
            {contact && (
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...actionBtn,
                  background: '#fff',
                  color: '#334155',
                  border: '1px solid #E2E8F0',
                }}
              >
                WhatsApp
              </a>
            )}
          </div>

          {/* Contact KVs */}
          <h3 style={kvHead}>Contato</h3>
          {customer.tax_id && <KV k="CPF/CNPJ" v={customer.tax_id} />}
          {customer.phone && <KV k="Telefone" v={customer.phone} />}
          {customer.phone2 && <KV k="Telefone secundário" v={customer.phone2} />}
          {customer.email && <KV k="Email" v={customer.email} />}

          {/* Address */}
          {(customer.street || customer.city || customer.state) && (
            <>
              <h3 style={{ ...kvHead, marginTop: 18 }}>Endereço</h3>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: '20px' }}>
                {customer.street && (
                  <div>
                    {customer.street}
                    {customer.number ? `, ${customer.number}` : ''}
                    {customer.complement ? ` — ${customer.complement}` : ''}
                  </div>
                )}
                {(customer.neighborhood || customer.city || customer.state) && (
                  <div>
                    {customer.neighborhood && `${customer.neighborhood} · `}
                    {customer.city}
                    {customer.state ? ` / ${customer.state}` : ''}
                  </div>
                )}
                {customer.cep && <div>CEP {customer.cep}</div>}
              </div>
            </>
          )}

          {customer.notes && (
            <>
              <h3 style={{ ...kvHead, marginTop: 18 }}>Observações</h3>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: '20px' }}>
                {customer.notes}
              </div>
            </>
          )}
        </div>

        {/* ── Main content ── */}
        <div style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: 20,
              overflowX: 'auto',
            }}
          >
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: activeTab === i ? 600 : 500,
                  color: activeTab === i ? '#0A0A0F' : '#64748B',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: `2px solid ${activeTab === i ? '#6D28D9' : 'transparent'}`,
                  marginBottom: -1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                {t}
                {i === 1 && quotes.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 9,
                      background: activeTab === 1 ? '#EDE9FE' : '#F1F5F9',
                      color: activeTab === 1 ? '#4C1D95' : '#334155',
                    }}
                  >
                    {quotes.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Resumo */}
          {activeTab === 0 && (
            <div>
              <div className="ov-grid-4" style={{ gap: 12, marginBottom: 24 }}>
                {[
                  {
                    k: 'Orçamentos',
                    v: String(quotes.length),
                    s: `${quotes.filter((q) => q.status === 'APPROVED').length} aprovados`,
                  },
                  { k: 'OS concluídas', v: '—', s: 'sem dados' },
                  {
                    k: 'Faturado',
                    v: totalApproved > 0 ? formatMoney(String(totalApproved)) : '—',
                    s: 'orçamentos aprovados',
                  },
                  {
                    k: 'Em aberto',
                    v: `${quotes.filter((q) => q.status === 'SENT').length}`,
                    s: 'aguardando aprovação',
                  },
                ].map((m, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '14px',
                      background: '#F8FAFC',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748B',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {m.k}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        marginTop: 6,
                        letterSpacing: '-0.01em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {m.v}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{m.s}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  margin: '0 0 12px',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Últimos orçamentos</h3>
                <button
                  onClick={() => setActiveTab(1)}
                  style={{
                    fontSize: 13,
                    color: '#6D28D9',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Ver todos →
                </button>
              </div>

              <QuotesTable quotes={quotes.slice(0, 5)} formatMoney={formatMoney} />
            </div>
          )}

          {/* Tab: Orçamentos */}
          {activeTab === 1 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Orçamentos</h3>
                <Link
                  href={`/orcamentos/novo?client_id=${customer.id}`}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#6D28D9',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <Plus size={14} /> Novo orçamento
                </Link>
              </div>
              <QuotesTable quotes={quotes} formatMoney={formatMoney} />
            </div>
          )}

          {/* Other tabs: placeholder */}
          {activeTab === 5 && <AuditHistoryFeed entityType="customer" entityId={customer.id} />}
          {activeTab >= 2 && activeTab < 5 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 14 }}>
              Nenhum dado disponível ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuotesTable({
  quotes,
  formatMoney,
}: {
  quotes: {
    id: string;
    number: number;
    title: string | null;
    status: string;
    total: string;
    created_at: string;
  }[];
  formatMoney: (v: string) => string;
}) {
  if (quotes.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '40px 20px',
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: 14,
        }}
      >
        Nenhum orçamento encontrado.
      </div>
    );
  }
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            {['Nº', 'Título', 'Status', 'Valor', 'Criado em', ''].map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: i === 3 ? 'right' : 'left',
                  padding: '10px 14px',
                  fontSize: 11,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                  borderBottom: '1px solid #E2E8F0',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, i) => {
            const st = STATUS_MAP[q.status] ?? { label: q.status, k: 'slate' };
            return (
              <tr
                key={q.id}
                style={{ borderBottom: i < quotes.length - 1 ? '1px solid #F1F5F9' : 'none' }}
              >
                <td
                  style={{
                    padding: '11px 14px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  #{String(q.number).padStart(4, '0')}
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 500, color: '#0A0A0F' }}>
                  {q.title || 'Sem título'}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <Pill k={st.k}>{st.label}</Pill>
                </td>
                <td
                  style={{
                    padding: '11px 14px',
                    textAlign: 'right',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    color: '#0A0A0F',
                  }}
                >
                  {formatMoney(q.total)}
                </td>
                <td style={{ padding: '11px 14px', color: '#64748B' }}>
                  {new Date(q.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  <Link
                    href={`/orcamentos/${q.id}`}
                    style={{
                      color: '#6D28D9',
                      fontSize: 12,
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        padding: '10px 0',
        borderBottom: '1px solid #F1F5F9',
        fontSize: 14,
      }}
    >
      <span style={{ color: '#64748B', flexShrink: 0 }}>{k}</span>
      <span
        style={{ color: '#0A0A0F', fontWeight: 500, textAlign: 'right', wordBreak: 'break-all' }}
      >
        {v}
      </span>
    </div>
  );
}

const aside: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 14,
  padding: 18,
  alignSelf: 'start',
  position: 'sticky',
  top: 20,
};
const avatarStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 18,
  background: '#EDE9FE',
  color: '#4C1D95',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 26,
  marginBottom: 14,
};
const kvHead: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 8px',
};
const actionBtn: React.CSSProperties = {
  height: 38,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  textDecoration: 'none',
};
