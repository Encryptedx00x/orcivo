'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Pencil } from 'lucide-react';
import { AuditHistoryFeed } from '../AuditHistoryFeed';
import { contactLinks } from '../contact-links';
import {
  WORK_ORDER_STATUS_LABELS,
  formatMoney as money,
  maskCep,
  maskCpfCnpj,
  maskPhone,
  sumDecimal,
  type WorkOrderStatus,
} from '@orcivo/shared-types';
import { methodLabel } from '../../../../lib/receipts';

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

export interface CustomerWorkOrder {
  id: string;
  number: number;
  title: string;
  status: WorkOrderStatus;
  scheduled_at?: string | null;
  created_at?: string;
}
export interface CustomerPayment {
  id: string;
  amount: string;
  status: string;
  method: string | null;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  receipt_number: number | null;
}

const WO_STATUS: Record<CustomerWorkOrder['status'], { label: string; k: string }> = {
  PENDING: { label: 'Para fazer', k: 'warning' },
  IN_PROGRESS: { label: 'Em execução', k: 'info' },
  DONE: { label: 'Concluída', k: 'success' },
  CANCELLED: { label: 'Cancelada', k: 'slate' },
  AWAITING_PAYMENT: { label: WORK_ORDER_STATUS_LABELS.AWAITING_PAYMENT, k: 'info' },
  WARRANTY: { label: WORK_ORDER_STATUS_LABELS.WARRANTY, k: 'purple' },
};

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
  CANCELLED: { label: 'Cancelado', k: 'slate' },
};

const PILL_COLORS: Record<string, { bg: string; color: string }> = {
  slate: { bg: '#F1F5F9', color: '#334155' },
  info: { bg: '#E0F2FE', color: '#075985' },
  success: { bg: '#DCFCE7', color: '#166534' },
  danger: { bg: '#FEE2E2', color: '#991B1B' },
  warning: { bg: '#FEF3C7', color: '#92400E' },
  purple: { bg: '#EDE9FE', color: '#4C1D95' },
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
  workOrders,
  payments,
}: {
  customer: Customer;
  quotes: Quote[];
  workOrders: CustomerWorkOrder[];
  payments: CustomerPayment[];
}): React.JSX.Element {
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

  const formatMoney = money;
  const approved = quotes.filter((q) => q.status === 'APPROVED');
  const totalApproved = approved.length ? sumDecimal(approved.map((q) => q.total)) : null;
  const paid = payments.filter((p) => p.status === 'PAID');
  const open = payments.filter((p) => p.status !== 'PAID' && p.status !== 'CANCELLED');
  const doneOrders = workOrders.filter((w) => w.status === 'DONE').length;
  const address = [
    [customer.street, customer.number].filter(Boolean).join(', '),
    customer.complement,
    customer.neighborhood,
    [customer.city, customer.state].filter(Boolean).join('/'),
  ].filter(Boolean);

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
          {customer.tax_id && <KV k="CPF/CNPJ" v={maskCpfCnpj(customer.tax_id)} />}
          {customer.phone && <KV k="Telefone" v={maskPhone(customer.phone)} />}
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
                {customer.cep && <div>CEP {maskCep(customer.cep)}</div>}
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
              overflowY: 'hidden',
              scrollbarWidth: 'none',
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
                  {
                    k: 'OS concluídas',
                    v: String(doneOrders),
                    s: `${workOrders.length} no total`,
                  },
                  {
                    k: 'Faturado',
                    v: totalApproved ? formatMoney(totalApproved) : '—',
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

          {/* Tab: OS */}
          {activeTab === 2 && (
            <div>
              <TabHead
                title="Ordens de serviço"
                action={{
                  href: `/ordens-de-servico/novo?client_id=${customer.id}`,
                  label: 'Nova OS',
                }}
              />
              {workOrders.length === 0 ? (
                <Empty>Nenhuma ordem de serviço para este cliente.</Empty>
              ) : (
                <RowList>
                  {workOrders.map((w) => (
                    <Row
                      key={w.id}
                      href={`/ordens-de-servico/${w.id}`}
                      title={`OS #${w.number} · ${w.title}`}
                      sub={
                        w.scheduled_at
                          ? `Marcada para ${new Date(w.scheduled_at).toLocaleDateString('pt-BR')}`
                          : w.created_at
                            ? `Criada em ${new Date(w.created_at).toLocaleDateString('pt-BR')}`
                            : ''
                      }
                      right={<Pill k={WO_STATUS[w.status].k}>{WO_STATUS[w.status].label}</Pill>}
                    />
                  ))}
                </RowList>
              )}
            </div>
          )}

          {/* Tab: Financeiro */}
          {activeTab === 3 && (
            <div>
              <TabHead
                title={`Recebido ${paid.length ? formatMoney(sumDecimal(paid.map((p) => p.amount))) : 'R$ 0,00'} · a receber ${open.length ? formatMoney(sumDecimal(open.map((p) => p.amount))) : 'R$ 0,00'}`}
                action={{ href: '/financeiro?registrar=1', label: 'Registrar recebimento' }}
              />
              {payments.length === 0 ? (
                <Empty>Nenhum recebimento deste cliente.</Empty>
              ) : (
                <RowList>
                  {payments.map((p) => (
                    <Row
                      key={p.id}
                      href={p.receipt_number ? `/documentos?recibo=${p.id}` : '/financeiro'}
                      title={`${formatMoney(p.amount)} · ${p.description || 'Recebimento'}`}
                      sub={
                        p.status === 'PAID'
                          ? `Pago em ${new Date(p.paid_at ?? p.created_at).toLocaleDateString('pt-BR')} · ${methodLabel(p.method)}${p.receipt_number ? ` · recibo nº ${String(p.receipt_number).padStart(4, '0')}` : ''}`
                          : p.due_date
                            ? `Vence em ${new Date(p.due_date).toLocaleDateString('pt-BR')}`
                            : 'A receber'
                      }
                      right={
                        <Pill
                          k={
                            p.status === 'PAID'
                              ? 'success'
                              : p.status === 'OVERDUE'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {p.status === 'PAID'
                            ? 'Recebido'
                            : p.status === 'OVERDUE'
                              ? 'Atrasado'
                              : 'A receber'}
                        </Pill>
                      }
                    />
                  ))}
                </RowList>
              )}
            </div>
          )}

          {/* Tab: Endereços */}
          {activeTab === 4 && (
            <div>
              <TabHead
                title="Endereço"
                action={{ href: `/clientes/${customer.id}/editar`, label: 'Editar endereço' }}
              />
              {address.length === 0 ? (
                <Empty>Endereço não informado.</Empty>
              ) : (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 14,
                  }}
                >
                  {address.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                  {customer.cep && (
                    <span style={{ color: '#64748B' }}>CEP {maskCep(customer.cep)}</span>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6D28D9', fontWeight: 600, marginTop: 8 }}
                  >
                    Abrir no mapa
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 5 && <AuditHistoryFeed entityType="customer" entityId={customer.id} />}
        </div>
      </div>
    </div>
  );
}

function TabHead({ title, action }: { title: string; action?: { href: string; label: string } }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h3>
      {action && (
        <Link
          href={action.href}
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
          <Plus size={14} /> {action.label}
        </Link>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

function RowList({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function Row({
  href,
  title,
  sub,
  right,
}: {
  href: string;
  title: string;
  sub: string;
  right: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderTop: '1px solid #F1F5F9',
        color: '#0A0A0F',
        textDecoration: 'none',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: '#64748B' }}>{sub}</span>}
      </span>
      {right}
      <ChevronRight size={16} color="#94A3B8" aria-hidden="true" />
    </Link>
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
