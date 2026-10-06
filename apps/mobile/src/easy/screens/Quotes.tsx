import React, { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import {
  FileText,
  Link2,
  MessageCircle,
  Plus,
  Undo2,
  Wrench,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { formatMoney } from '@orcivo/shared-types';
import { easy, errorText, type EasyQuote, type QuoteStatus } from '../data';
import { approvalUrl, emptyDraft, openWhatsApp, useDraft, useEasyNav } from '../draft';
import {
  Btn,
  C,
  Card,
  Chip,
  EmptyBox,
  ErrorBox,
  H1,
  Loading,
  More,
  Page,
  ReasonModal,
  Row,
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
const ACTIONS_BY_STATUS: Partial<Record<QuoteStatus, Action[]>> = {
  DRAFT: ['cancel'],
  SENT: ['reject', 'cancel'],
  REJECTED: ['reopen', 'correct'],
  CANCELLED: ['reopen', 'correct'],
  EXPIRED: ['reopen', 'correct'],
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

function QuoteCard({ q, onChanged }: { q: EasyQuote; onChanged: () => void }) {
  const nav = useEasyNav();
  const chip = quoteChip(q.status);
  const [action, setAction] = useState<Action | null>(null);
  const actions = ACTIONS_BY_STATUS[q.status] ?? [];

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
  const shareLink = async () => {
    const share = await link();
    if (!share) return Alert.alert('Atenção', 'Este orçamento ainda não tem link de aprovação.');
    void Share.share({ message: share.url });
  };

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
        onPress={() => nav.navigate('QuoteDetail', { id: q.id })}
      >
        Abrir
      </Btn>
      {q.status === 'SENT' || actions.length ? (
        <More>
          <Card style={{ overflow: 'hidden' }}>
            {q.status === 'SENT' ? (
              <Row
                icon={Link2}
                label="Copiar ou compartilhar link"
                onPress={() => void shareLink()}
              />
            ) : null}
            {actions.map((a) => (
              <Row
                key={a}
                icon={ACTIONS[a].icon}
                label={ACTIONS[a].label}
                danger={ACTIONS[a].danger}
                onPress={() => setAction(a)}
              />
            ))}
          </Card>
        </More>
      ) : null}
      <ReasonModal
        title={action ? ACTIONS[action].title : null}
        confirm={action ? ACTIONS[action].title : ''}
        danger={action ? ACTIONS[action].danger : false}
        onClose={() => setAction(null)}
        onConfirm={async (reason) => {
          if (!action) return;
          try {
            await easy.quoteAction(q.id, action, reason);
            Alert.alert('Pronto', ACTIONS[action].done);
            setAction(null);
            onChanged();
          } catch (err) {
            Alert.alert('Não deu certo', errorText(err, 'Não foi possível concluir agora.'));
          }
        }}
      />
    </Card>
  );
}
