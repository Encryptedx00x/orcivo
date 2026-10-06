import React, { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import {
  ClipboardList,
  Download,
  FileText,
  Link2,
  MoreHorizontal,
  MessageCircle,
  Pencil,
  Plus,
  Undo2,
  Wrench,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import { easy, errorText, type EasyQuote, type QuoteStatus } from '../data';
import {
  approvalUrl,
  draftFromQuote,
  emptyDraft,
  openWhatsApp,
  useDraft,
  useEasyNav,
} from '../draft';
import { reasonSheet, useSheet, type SheetAction } from '../sheet';
import { shareQuotePdf } from '../share';
import {
  Btn,
  C,
  Card,
  Chip,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  Page,
  s,
  useLoad,
  type ChipKind,
} from '../ui';

export function quoteChip(status: QuoteStatus): { kind: ChipKind; label: string } {
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

const GROUPS: Array<{ statuses: QuoteStatus[]; title: string }> = [
  { statuses: ['SENT'], title: 'Esperando resposta' },
  { statuses: ['APPROVED'], title: 'Aprovados' },
  { statuses: ['DRAFT'], title: 'Rascunhos' },
];
const HIDDEN: QuoteStatus[] = ['REJECTED', 'EXPIRED', 'CANCELLED'];
const PAGE = 5;

type Action = 'cancel' | 'reject' | 'reopen' | 'correct';
const ACTIONS: Record<
  Action,
  { label: string; title: string; icon: LucideIcon; danger?: boolean; done: string }
> = {
  reject: {
    label: 'Cliente recusou',
    title: 'Recusar orçamento',
    icon: XCircle,
    danger: true,
    done: 'Orçamento recusado.',
  },
  cancel: {
    label: 'Cancelar orçamento',
    title: 'Cancelar orçamento',
    icon: X,
    danger: true,
    done: 'Orçamento cancelado.',
  },
  reopen: {
    label: 'Reabrir para nova aprovação',
    title: 'Reabrir orçamento',
    icon: Undo2,
    done: 'Orçamento reaberto.',
  },
  correct: {
    label: 'Corrigir (volta para rascunho)',
    title: 'Corrigir orçamento',
    icon: Wrench,
    done: 'Orçamento voltou para rascunho.',
  },
};
// Same transitions the full screen offers (backend validates them again).
const REASONS: Record<Action, { title: string; reasons: string[] }> = {
  reject: {
    title: 'Por que o cliente recusou?',
    reasons: ['Achou caro', 'Fechou com outro', 'Desistiu do serviço', 'Outro motivo'],
  },
  cancel: {
    title: 'Por que cancelar?',
    reasons: ['Cliente desistiu', 'Feito por engano', 'Itens ou valor errados', 'Outro motivo'],
  },
  reopen: {
    title: 'Por que reabrir?',
    reasons: ['Cliente pediu de novo', 'Renovar a validade', 'Outro motivo'],
  },
  correct: {
    title: 'O que vai corrigir?',
    reasons: ['Mudar itens ou preços', 'Mudar condições ou validade', 'Outro motivo'],
  },
};

export function QuotesScreen() {
  const nav = useEasyNav();
  const { setDraft } = useDraft();
  const quotes = useLoad(easy.quotes, 'Não foi possível carregar seus orçamentos.');
  const [showHidden, setShowHidden] = useState(false);
  const all = quotes.data ?? [];
  const hidden = all.filter((q) => HIDDEN.includes(q.status));

  return (
    <Page top>
      <H1>Orçamentos</H1>
      <Btn
        icon={Plus}
        onPress={() => {
          setDraft(emptyDraft());
          nav.navigate('QuoteClient');
        }}
      >
        Novo orçamento
      </Btn>
      {quotes.error ? <ErrorBox message={quotes.error} onRetry={quotes.refresh} /> : null}
      {!quotes.data && !quotes.error ? <Loading /> : null}
      {quotes.data && !all.length ? (
        <EmptyBox>Nenhum orçamento ainda. Toque em Novo orçamento.</EmptyBox>
      ) : null}
      {GROUPS.map((g) => (
        <Section
          key={g.title}
          title={g.title}
          items={all.filter((q) => g.statuses.includes(q.status))}
          onChanged={quotes.refresh}
        />
      ))}
      {hidden.length ? (
        showHidden ? (
          <Section
            title="Recusados, vencidos e cancelados"
            items={hidden}
            onChanged={quotes.refresh}
          />
        ) : (
          <Btn tone="outline" height={56} onPress={() => setShowHidden(true)}>
            Ver recusados e vencidos ({hidden.length})
          </Btn>
        )
      ) : null}
    </Page>
  );
}

function Section({
  title,
  items,
  onChanged,
}: {
  title: string;
  items: EasyQuote[];
  onChanged: () => void;
}) {
  const [limit, setLimit] = useState(PAGE);
  if (!items.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 4 }}>
        <Text style={[s.section, { marginHorizontal: 0 }]}>{title}</Text>
        <View
          style={{
            minWidth: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: C.line,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.fg2 }}>{items.length}</Text>
        </View>
      </View>
      {items.slice(0, limit).map((q) => (
        <QuoteCard key={q.id} q={q} onChanged={onChanged} />
      ))}
      {items.length > limit ? (
        <Btn tone="link" onPress={() => setLimit((l) => l + PAGE)}>
          Ver mais {Math.min(PAGE, items.length - limit)} de {items.length - limit}
        </Btn>
      ) : null}
    </View>
  );
}

/**
 * Quote "Mais ações" (link, PDF, recusar, cancelar, reabrir, corrigir with reason).
 * Shared by the easy list and the full-mode quote detail. `onSchedule` adds
 * "Criar serviço" for approved quotes where the caller has an agenda form.
 */
export function useQuoteMore(
  q: Pick<EasyQuote, 'id' | 'number' | 'status' | 'total' | 'customer'>,
  onChanged: () => void,
  onSchedule?: () => void,
  /** Easy mode: reopens a draft in the 3 steps (also right after "corrigir"). */
  onEdit?: () => void,
) {
  const sheet = useSheet();

  const run = (action: Action) =>
    reasonSheet(
      sheet,
      REASONS[action].title,
      REASONS[action].reasons,
      async (reason) => {
        try {
          await easy.quoteAction(q.id, action, reason);
          onChanged();
          if (action === 'correct' && onEdit) return onEdit();
          Alert.alert('Pronto', ACTIONS[action].done);
        } catch (err) {
          Alert.alert('Não deu certo', errorText(err, 'Não foi possível concluir agora.'));
        }
      },
      ACTIONS[action].icon,
    );
  const pdf = async () => {
    try {
      await shareQuotePdf(q.id, q.number);
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível preparar o PDF.'));
    }
  };

  const link = async () => {
    try {
      const share = await easy.quoteShare(q.id);
      return share.token ? { ...share, url: approvalUrl(share.token) } : null;
    } catch {
      return null;
    }
  };
  const resend = async () => {
    const share = await link();
    if (!share?.phone)
      return Alert.alert('Atenção', 'Este orçamento não tem telefone ou link para reenviar.');
    void openWhatsApp(share.phone, share.url, `#${share.number}`);
  };
  const openMore = () => {
    const pdfAct: SheetAction = {
      label: 'Baixar ou compartilhar PDF',
      icon: Download,
      run: () => void pdf(),
    };
    const linkAct: SheetAction = {
      label: 'Copiar ou compartilhar link',
      icon: Link2,
      run: () => void shareLink(),
    };
    const act = (a: Action): SheetAction => ({
      label: ACTIONS[a].label,
      icon: ACTIONS[a].icon,
      danger: ACTIONS[a].danger,
      run: () => run(a),
    });
    const actions: SheetAction[] =
      q.status === 'SENT'
        ? [linkAct, act('correct'), pdfAct, act('reject'), act('cancel')]
        : q.status === 'APPROVED'
          ? [
              ...(onSchedule
                ? [
                    {
                      label: 'Criar serviço',
                      sub: 'Marcar na agenda',
                      icon: ClipboardList,
                      run: onSchedule,
                    },
                  ]
                : []),
              pdfAct,
              linkAct,
              act('cancel'),
            ]
          : q.status === 'DRAFT'
            ? [
                ...(onEdit
                  ? [{ label: 'Continuar editando', icon: Pencil, run: onEdit } as SheetAction]
                  : []),
                pdfAct,
                { ...act('cancel'), label: 'Descartar rascunho' },
              ]
            : [act('reopen'), act('correct'), pdfAct];
    sheet({
      title: q.customer?.name ?? `Orçamento #${q.number}`,
      sub: `#${q.number} · ${formatMoney(q.total)}`,
      actions,
    });
  };
  const shareLink = async () => {
    const share = await link();
    if (!share) return Alert.alert('Atenção', 'Este orçamento ainda não tem link de aprovação.');
    void Share.share({ message: share.url });
  };
  return { openMore, resend, shareLink };
}

function QuoteCard({ q, onChanged }: { q: EasyQuote; onChanged: () => void }) {
  const nav = useEasyNav();
  const chip = quoteChip(q.status);
  const { setDraft } = useDraft();
  const edit = async (review = false) => {
    try {
      setDraft(draftFromQuote(await easy.quoteFull(q.id)));
      // Items first (or the review); back walks the client and items steps.
      nav.push('QuoteClient');
      nav.push('QuoteItems');
      if (review) nav.push('QuoteReview');
    } catch (err) {
      Alert.alert('Não deu certo', errorText(err, 'Não foi possível abrir o orçamento.'));
    }
  };
  const { openMore, resend } = useQuoteMore(
    q,
    onChanged,
    () =>
      nav.navigate('AgendaNew', {
        client: { id: q.customer.id, name: q.customer.name },
        type: 'INSTALACAO',
      }),
    () => void edit(),
  );

  return (
    <Card style={{ padding: 16, gap: 12 }}>
      <View>
        <Text style={[s.body, { fontWeight: '600', fontSize: 19 }]}>
          {q.customer?.name ?? 'Cliente'}
        </Text>
        <Text style={s.muted}>#{q.number}</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>
          {formatMoney(q.total)}
        </Text>
        <Chip kind={chip.kind} label={chip.label} />
      </View>
      {q.status === 'SENT' ? (
        <Btn tone="soft" icon={MessageCircle} height={56} onPress={() => void resend()}>
          Reenviar
        </Btn>
      ) : null}
      <Btn
        tone="outline"
        icon={FileText}
        height={52}
        onPress={() =>
          q.status === 'DRAFT' ? void edit(true) : nav.navigate('QuoteDetail', { id: q.id })
        }
      >
        Abrir
      </Btn>
      <Btn tone="link" icon={MoreHorizontal} onPress={openMore}>
        Mais ações
      </Btn>
    </Card>
  );
}
