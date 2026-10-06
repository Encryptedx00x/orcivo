'use client';

import { useState } from 'react';
import { FileText, Link2, MessageCircle, Plus } from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import { getQuoteShare, listQuotes, type EasyQuote } from '../actions';
import { buildWhatsAppLink } from '../../../lib/whatsapp';
import { emptyDraft, useLoad, useNav } from '../EasyApp';
import {
  Btn,
  C,
  Chip,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  card,
  useToast,
  type ChipKind,
} from '../ui';

export function quoteChip(status: EasyQuote['status']): { kind: ChipKind; label: string } {
  switch (status) {
    case 'SENT':
      return { kind: 'wait', label: 'Esperando resposta' };
    case 'APPROVED':
      return { kind: 'ok', label: 'Aprovado' };
    case 'DRAFT':
      return { kind: 'draft', label: 'Rascunho' };
    case 'REJECTED':
      return { kind: 'late', label: 'Recusado' };
    case 'EXPIRED':
      return { kind: 'late', label: 'Vencido' };
    default:
      return { kind: 'draft', label: 'Cancelado' };
  }
}

const GROUPS: Array<{ statuses: EasyQuote['status'][]; title: string; dot: string }> = [
  { statuses: ['SENT'], title: 'Esperando resposta', dot: '#D97706' },
  { statuses: ['APPROVED'], title: 'Aprovados', dot: '#16A34A' },
  { statuses: ['DRAFT'], title: 'Rascunhos', dot: '#64748B' },
];
const HIDDEN: EasyQuote['status'][] = ['REJECTED', 'EXPIRED', 'CANCELLED'];
const PAGE = 5;

function ago(iso?: string) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
}

export function QuotesScreen(): JSX.Element {
  const { go, setDraft } = useNav();
  const quotes = useLoad(listQuotes);
  const [showHidden, setShowHidden] = useState(false);
  const all = quotes.data ?? [];
  const hidden = all.filter((q) => HIDDEN.includes(q.status));
  const newQuote = () => {
    setDraft(emptyDraft());
    go('q1');
  };

  return (
    <>
      <div style={{ padding: '8px 4px 0' }}>
        <H1>Orçamentos</H1>
      </div>
      {quotes.loading && !quotes.data ? (
        <Loading />
      ) : quotes.error ? (
        <ErrorBox title="Não foi possível carregar seus orçamentos." onRetry={quotes.reload} />
      ) : all.length === 0 ? (
        <EmptyBox
          icon={FileText}
          title="Você ainda não fez orçamentos."
          text="Faça o primeiro em 3 passos e envie pelo WhatsApp."
          action="Novo orçamento"
          onAction={newQuote}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn icon={Plus} onClick={newQuote}>
            Novo orçamento
          </Btn>
          {GROUPS.map((g) => (
            <Section
              key={g.title}
              title={g.title}
              dot={g.dot}
              items={all.filter((q) => g.statuses.includes(q.status))}
            />
          ))}
          {hidden.length > 0 &&
            (showHidden ? (
              <Section title="Recusados, vencidos e cancelados" dot="#DC2626" items={hidden} />
            ) : (
              <Btn tone="link" onClick={() => setShowHidden(true)}>
                Ver recusados e vencidos ({hidden.length})
              </Btn>
            ))}
        </div>
      )}
    </>
  );
}

function Section({ title, dot, items }: { title: string; dot: string; items: EasyQuote[] }) {
  const [limit, setLimit] = useState(PAGE);
  if (items.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 4px' }}>
        <span style={{ width: 12, height: 12, borderRadius: 9999, background: dot }} />
        <span style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>{title}</span>
        <span
          style={{
            minWidth: 32,
            height: 32,
            padding: '0 10px',
            borderRadius: 9999,
            background: C.line,
            color: C.fg2,
            fontSize: 16,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {items.length}
        </span>
      </div>
      {items.slice(0, limit).map((q) => (
        <QuoteCard key={q.id} q={q} />
      ))}
      {items.length > limit && (
        <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
          Ver mais {Math.min(PAGE, items.length - limit)} de {items.length - limit}
        </Btn>
      )}
    </div>
  );
}

function QuoteCard({ q }: { q: EasyQuote }) {
  const toast = useToast();
  const chip = quoteChip(q.status);
  const meta = `#${q.number} · ${q.status === 'DRAFT' ? 'criado' : q.status === 'APPROVED' ? 'aprovado' : 'atualizado'} ${ago(q.updated_at ?? q.created_at)}`;
  const resend = async () => {
    // Open synchronously inside the tap so mobile browsers allow it, then point it at WhatsApp.
    const tab = window.open('', '_blank');
    const r = await getQuoteShare(q.id);
    if (!r.ok || !r.data.token || !r.data.phone) {
      tab?.close();
      toast(r.ok ? 'Este orçamento não tem telefone ou link para reenviar.' : r.message);
      return;
    }
    const link = buildWhatsAppLink(
      r.data.phone,
      `${window.location.origin}/approve/${r.data.token}`,
      `#${r.data.number}`,
    );
    if (tab) tab.location.href = link;
    else window.location.href = link;
    toast(`Pronto! Reenviado para ${q.customer?.name?.split(' ')[0] ?? 'o cliente'} no WhatsApp.`);
  };
  const copyLink = async () => {
    const r = await getQuoteShare(q.id);
    if (!r.ok || !r.data.token)
      return toast(r.ok ? 'Este orçamento ainda não tem link de aprovação.' : r.message);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/approve/${r.data.token}`);
      toast('Link de aprovação copiado.');
    } catch {
      toast('Não foi possível copiar o link.');
    }
  };
  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 600 }}>
          {q.customer?.name ?? 'Cliente'}
        </span>
        <span style={{ fontSize: 15, color: C.fg3 }}>{meta}</span>
      </span>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px 12px',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {formatMoney(q.total)}
        </span>
        <Chip kind={chip.kind} label={chip.label} />
      </div>
      {q.status === 'SENT' ? (
        <>
          <Btn tone="soft" icon={MessageCircle} height={56} onClick={() => void resend()}>
            Reenviar
          </Btn>
          <Btn tone="link" icon={Link2} onClick={() => void copyLink()}>
            Copiar link de aprovação
          </Btn>
          <a
            href={`/orcamentos/${q.id}`}
            style={{
              ...actionLink,
              height: 48,
              border: 'none',
              color: C.purple700,
              fontSize: 17,
              fontWeight: 600,
            }}
          >
            Abrir orçamento
          </a>
        </>
      ) : (
        <a
          href={`/orcamentos/${q.id}`}
          style={{
            ...actionLink,
            background: '#FFFFFF',
            color: C.ink,
            border: `1.5px solid ${C.borderStrong}`,
          }}
        >
          <FileText size={22} aria-hidden="true" /> Abrir
        </a>
      )}
    </div>
  );
}

const actionLink: React.CSSProperties = {
  height: 56,
  borderRadius: 16,
  fontSize: 18,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  textDecoration: 'none',
};
