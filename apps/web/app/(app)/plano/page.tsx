import Link from 'next/link';
import { Check, Inbox } from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { apiFetch } from '../../../lib/api';
import { CancelButton } from './cancel-button';
import { PLANS, priceLabel } from './plans';
import { getPendingPix } from './actions';
import { PendingPixBanner } from './PendingPixBanner';

const T = {
  ink: '#0A0A0F',
  fg2: '#334155',
  fg3: '#64748B',
  border1: '#E2E8F0',
  border2: '#F1F5F9',
  purple600: '#6D28D9',
  purple800: '#4C1D95',
  purple50: '#F5F3FF',
  success: '#16A34A',
  successBg: '#DCFCE7',
};

interface Subscription {
  plan_code: string;
  status: string | null;
}
interface SubPayment {
  id: string;
  amount: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  TRIALING: 'Aguardando pagamento',
  PAST_DUE: 'Em atraso',
  BLOCKED: 'Inativo',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const PAY_STATUS: Record<string, string> = {
  RECEIVED: 'Pago',
  CONFIRMED: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
  PAID: 'Pago',
};

function ddmmyy(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default async function PlanoPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element> {
  const [sub, paymentsRes, members, pendingPix] = await Promise.all([
    apiFetch<Subscription>('/billing/subscription'),
    apiFetch<{ data: SubPayment[] }>('/billing/payments'),
    apiFetch<Array<unknown>>('/company/members'),
    getPendingPix(),
  ]);
  const payments: SubPayment[] = paymentsRes.data;
  const memberCount = Array.isArray(members) ? members.length : 1;

  const current = PLANS.find((p) => p.code === sub.plan_code) ?? PLANS[0];
  const isLivre = current.code === 'LIVRE';
  const isCancelled = sub.status === 'CANCELLED';
  const statusLabel = sub.status ? (STATUS_LABEL[sub.status] ?? sub.status) : '—';
  const justSubscribed = searchParams?.['checkout'] === 'ok';
  const currentPrice = priceLabel(current.code, 'MONTHLY');

  return (
    <div className="ov-page" style={{ maxWidth: 1200 }}>
      <div className="ov-page-header">
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: T.ink,
              margin: 0,
            }}
          >
            Gerenciar assinatura
          </h1>
          <div style={{ color: T.fg3, fontSize: 14, marginTop: 4 }}>
            Veja o status, troque de plano ou cancele quando quiser
          </div>
        </div>
        <a href="#planos" style={{ color: T.purple600, fontWeight: 600, fontSize: 14 }}>
          Ver planos
        </a>
      </div>

      {pendingPix ? (
        <PendingPixBanner pix={pendingPix} />
      ) : (
        justSubscribed && (
          <div
            role="status"
            style={{
              background: T.successBg,
              color: '#166534',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            Pagamento em andamento. Sua assinatura é ativada assim que o pagamento for confirmado.
          </div>
        )
      )}

      <div className="ov-grid-2" style={{ marginBottom: 24 }}>
        {/* Current plan */}
        <div
          style={{
            borderRadius: 14,
            padding: 24,
            background: 'linear-gradient(135deg, #6D28D9, #4C1D95)',
            color: '#fff',
          }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  fontWeight: 600,
                }}
              >
                Plano atual
              </div>
              <div
                style={{ fontSize: 32, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}
              >
                {current.name}
              </div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                {isLivre ? 'Gratuito · uso justo' : currentPrice}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 10px',
                borderRadius: 9999,
                background: 'rgba(255,255,255,.18)',
                color: '#fff',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#fff',
                  flexShrink: 0,
                }}
              />
              {statusLabel}
            </span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.2)', margin: '20px 0' }} />
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.7,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}
              >
                Usuários na equipe
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{memberCount}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.7,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}
              >
                Plano
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {current.name.replace('Orcivo ', '')}
              </div>
            </div>
          </div>
        </div>

        {/* Payment history */}
        <div className="ov-card ov-card-body">
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: T.ink }}>
            Pagamentos recentes
          </h3>
          {payments.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '28px 16px',
                color: '#94A3B8',
              }}
            >
              <Inbox size={26} strokeWidth={1.5} />
              <p style={{ fontSize: 13, margin: 0, textAlign: 'center' }}>
                {isLivre
                  ? 'O plano Livre não gera cobranças.'
                  : 'Nenhum pagamento registrado ainda.'}
              </p>
            </div>
          ) : (
            payments.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < payments.length - 1 ? `1px solid ${T.border2}` : 'none',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: T.successBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.success,
                    flexShrink: 0,
                  }}
                >
                  <Check size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>
                    {PAY_STATUS[p.status] ?? p.status}
                  </div>
                  <div style={{ fontSize: 12, color: T.fg3 }}>
                    {p.paid_at ? `Pago em ${ddmmyy(p.paid_at)}` : ddmmyy(p.created_at)}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    fontSize: 13,
                    color: T.ink,
                  }}
                >
                  {formatMoney(p.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {!isLivre && !isCancelled && (
        <div className="ov-card ov-card-body" style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: T.ink }}>
            Cancelar assinatura
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: T.fg3 }}>
            Encerra a cobrança recorrente do {current.name}.
          </p>
          <CancelButton />
        </div>
      )}

      {/* Plan comparison */}
      <h3 id="planos" style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: '0 0 12px' }}>
        Trocar de plano
      </h3>
      <div className="ov-grid-4">
        {PLANS.map((p) => {
          const isCurrent = p.code === current.code && !isCancelled;
          return (
            <div
              key={p.code}
              className="ov-card ov-card-body"
              style={{
                position: 'relative',
                borderColor: isCurrent ? T.purple600 : T.border1,
                borderWidth: isCurrent ? 2 : 1,
              }}
            >
              {p.tag && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: 18,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    background: isCurrent ? T.purple600 : T.fg2,
                    color: '#fff',
                    lineHeight: 1,
                  }}
                >
                  {p.tag}
                </div>
              )}
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: T.ink,
                  marginTop: p.tag ? 10 : 0,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  marginTop: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: T.ink,
                  letterSpacing: '-0.01em',
                }}
              >
                {p.code === 'LIVRE' ? 'R$ 0' : priceLabel(p.code, 'MONTHLY')}
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '16px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {p.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', gap: 8, fontSize: 13, color: T.fg2 }}>
                    <Check
                      size={14}
                      color={T.purple600}
                      strokeWidth={2.5}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent || p.code === 'LIVRE' ? (
                <button
                  style={{
                    width: '100%',
                    marginTop: 18,
                    height: 36,
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'default',
                    background: 'transparent',
                    color: T.fg3,
                    border: `1px solid ${T.border1}`,
                  }}
                  disabled
                >
                  {isCurrent
                    ? 'Plano atual'
                    : isCancelled
                      ? 'Livre após o cancelamento'
                      : 'Cancele para voltar ao Livre'}
                </button>
              ) : (
                <Link
                  href={`/plano/checkout?plan=${p.code}&cycle=YEARLY`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    marginTop: 18,
                    height: 36,
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: 600,
                    background: T.purple600,
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  {isLivre
                    ? `Assinar ${p.name.replace('Orcivo ', '')}`
                    : `Mudar para ${p.name.replace('Orcivo ', '')}`}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
