'use client';

import { useState } from 'react';
import {
  Ban,
  ClipboardList,
  Download,
  FileText,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { formatMoney } from '@orcivo/shared-types';
import {
  getQuoteFull,
  getQuoteShare,
  listQuotes,
  type EasyQuote,
  type EasyQuoteFull,
} from '../actions';
import { quoteAction, type DirectQuoteAction } from '../../(app)/orcamentos/actions';
import { buildWhatsAppLink } from '../../../lib/whatsapp';
import { emptyDraft, useLoad, useNav, type Draft } from '../EasyApp';
import { centsToDecimal, decimalToDigits } from '../rows';
import { MoreButton, reasonSheet, useSheet, type SheetAction } from '../sheet';
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

function draftFromQuote(q: EasyQuoteFull): Draft {
  const days = q.valid_until
    ? Math.round((new Date(q.valid_until).getTime() - Date.now()) / 86_400_000)
    : 0;
  return {
    ...emptyDraft(),
    id: q.id,
    number: q.number,
    client: { id: q.customer.id, name: q.customer.name, phone: q.customer.phone ?? null },
    items: q.items.map((i, n) => ({
      key: i.catalog_item_id ?? `q${n}`,
      catalog_item_id: i.catalog_item_id ?? undefined,
      name: i.description,
      price: centsToDecimal(decimalToDigits(i.unit_price)),
      qty: Number(i.quantity),
    })),
    discountType: q.discount_type,
    discountDigits:
      Number(q.discount_value) === 0
        ? ''
        : q.discount_type === 'PERCENT'
          ? String(Number(q.discount_value))
          : decimalToDigits(q.discount_value),
    validityDays: days > 0 ? days : 15,
    terms: q.notes ?? '',
  };
}

function ago(iso?: string) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
}

export function QuotesScreen(): React.JSX.Element {
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
              onChanged={quotes.reload}
            />
          ))}
          {hidden.length > 0 &&
            (showHidden ? (
              <Section
                title="Recusados, vencidos e cancelados"
                dot="#DC2626"
                items={hidden}
                onChanged={quotes.reload}
              />
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

function Section({
  title,
  dot,
  items,
  onChanged,
}: {
  title: string;
  dot: string;
  items: EasyQuote[];
  onChanged: () => void;
}) {
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
        <QuoteCard key={q.id} q={q} onChanged={onChanged} />
      ))}
      {items.length > limit && (
        <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
          Ver mais {Math.min(PAGE, items.length - limit)} de {items.length - limit}
        </Btn>
      )}
    </div>
  );
}

const REASONS: Record<DirectQuoteAction, { title: string; reasons: string[]; done: string }> = {
  recusar: {
    title: 'Por que o cliente recusou?',
    reasons: ['Achou caro', 'Fechou com outro', 'Desistiu do serviço', 'Outro motivo'],
    done: 'Marcado como recusado.',
  },
  cancelar: {
    title: 'Por que cancelar?',
    reasons: ['Cliente desistiu', 'Feito por engano', 'Itens ou valor errados', 'Outro motivo'],
    done: 'Orçamento cancelado.',
  },
  reabrir: {
    title: 'Por que reabrir?',
    reasons: ['Cliente pediu de novo', 'Renovar a validade', 'Outro motivo'],
    done: 'Orçamento reaberto e esperando resposta.',
  },
  corrigir: {
    title: 'O que vai corrigir?',
    reasons: ['Mudar itens ou preços', 'Mudar condições ou validade', 'Outro motivo'],
    done: 'Orçamento voltou para rascunho.',
  },
};

function QuoteCard({ q, onChanged }: { q: EasyQuote; onChanged: () => void }) {
  const toast = useToast();
  const sheet = useSheet();
  const { go, setDraft } = useNav();
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
  // Drafts reopen in the same 3 steps (items first; back goes to the client step).
  const edit = async () => {
    const r = await getQuoteFull(q.id);
    if (!r.ok) return toast(r.message);
    setDraft(draftFromQuote(r.data));
    go('q1');
    go('q2');
  };
  const copyLink = async () => {
    let problem = '';
    const url = getQuoteShare(q.id).then((r) => {
      if (!r.ok || !r.data.token) {
        problem = r.ok ? 'Este orçamento ainda não tem link de aprovação.' : r.message;
        throw new Error(problem);
      }
      return `${window.location.origin}/approve/${r.data.token}`;
    });
    try {
      // The clipboard gets the pending link right away: awaiting the fetch first loses
      // the click's user activation and Safari (iPhone) refuses the copy.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': url.then((u) => new Blob([u], { type: 'text/plain' })),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(await url);
      }
      toast('Link de aprovação copiado.');
    } catch {
      toast(problem || 'Não foi possível copiar o link.');
    }
  };
  const run = (action: DirectQuoteAction, then?: () => void) =>
    reasonSheet(
      sheet,
      REASONS[action].title,
      REASONS[action].reasons,
      async (reason) => {
        const r = await quoteAction(q.id, { action, reason });
        if (r.error) return toast(r.error);
        toast(REASONS[action].done);
        onChanged();
        then?.();
      },
      action === 'cancelar' || action === 'recusar' ? Ban : RotateCcw,
    );

  const pdf: SheetAction = {
    label: 'Baixar PDF',
    icon: Download,
    run: () => window.open(`/api/quotes/${q.id}/pdf`, '_blank', 'noopener'),
  };
  const link: SheetAction = {
    label: 'Copiar link de aprovação',
    icon: Link2,
    run: () => void copyLink(),
  };
  const cancel: SheetAction = {
    label: 'Cancelar orçamento',
    icon: Ban,
    danger: true,
    run: () => run('cancelar'),
  };
  const correct: SheetAction = {
    label: 'Corrigir orçamento',
    sub: 'Volta para rascunho para mudar e reenviar',
    icon: Pencil,
    run: () => run('corrigir', () => void edit()),
  };
  const actions: SheetAction[] =
    q.status === 'SENT'
      ? [
          link,
          correct,
          pdf,
          { label: 'Cliente recusou', icon: XCircle, run: () => run('recusar') },
          cancel,
        ]
      : q.status === 'APPROVED'
        ? [
            {
              label: 'Criar serviço',
              sub: 'Marcar na agenda',
              icon: ClipboardList,
              run: () =>
                go('agNew', {
                  client: q.customer?.id,
                  clientName: q.customer?.name,
                  type: 'INSTALACAO',
                }),
            },
            pdf,
            link,
            cancel,
          ]
        : q.status === 'DRAFT'
          ? [
              {
                label: 'Continuar editando',
                icon: Pencil,
                run: () => void edit(),
              },
              pdf,
              { label: 'Descartar rascunho', icon: Ban, danger: true, run: () => run('cancelar') },
            ]
          : [
              {
                label: 'Reabrir e mandar de novo',
                sub: 'Volta a esperar a resposta do cliente',
                icon: RotateCcw,
                run: () => run('reabrir'),
              },
              correct,
              pdf,
            ];

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
      {q.status === 'SENT' && (
        <Btn tone="soft" icon={MessageCircle} height={56} onClick={() => void resend()}>
          Reenviar
        </Btn>
      )}
      <a
        href={`/orcamentos/${q.id}`}
        style={{
          height: 56,
          borderRadius: 16,
          fontSize: 18,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          textDecoration: 'none',
          background: '#FFFFFF',
          color: C.ink,
          border: `1.5px solid ${C.borderStrong}`,
        }}
      >
        <FileText size={22} aria-hidden="true" /> Abrir
      </a>
      <MoreButton
        icon={MoreHorizontal}
        onClick={() =>
          sheet({
            title: q.customer?.name ?? `Orçamento #${q.number}`,
            sub: `#${q.number} · ${formatMoney(q.total)}`,
            actions,
          })
        }
      />
    </div>
  );
}
