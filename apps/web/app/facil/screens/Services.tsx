'use client';

import { useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileText,
  HandCoins,
  Hourglass,
  Image as ImageIcon,
  Play,
  Ban,
  Calendar,
  MoreHorizontal,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  cleanWorkOrderDetails,
  WO_CLOSED_STATUSES,
  WORK_ORDER_FIELDS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderAction,
  type WorkOrderDetails,
  type WorkOrderField,
  type WorkOrderStatus,
} from '@orcivo/shared-types';
import {
  completeWorkOrder,
  getCompany,
  getWorkOrder,
  listWorkOrders,
  startWorkOrder,
  updateEasyWorkOrderDetails,
  type EasyWorkOrder,
} from '../actions';
import { uploadWorkOrderPhoto } from '../../../lib/upload-photo';
import { workOrderAction } from '../../(app)/ordens-de-servico/actions';
import { MoreButton, reasonSheet, useSheet, type SheetAction } from '../sheet';
import { ActionBar, Hint, useLoad, useNav } from '../EasyApp';
import {
  Btn,
  C,
  Chip,
  EmptyBox,
  ErrorBox,
  Field,
  H1,
  Loading,
  card,
  hhmm,
  longDate,
  useToast,
  type ChipKind,
} from '../ui';

const PAGE = 10;

function EasyDetailsCard({
  id,
  fields,
  initial,
  editable,
}: {
  id: string;
  fields: WorkOrderField[];
  initial: WorkOrderDetails;
  editable: boolean;
}): React.JSX.Element | null {
  const [saved, setSaved] = useState<WorkOrderDetails>(initial);
  const [value, setValue] = useState<WorkOrderDetails>(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const shown = (Object.keys(WORK_ORDER_FIELDS) as WorkOrderField[]).filter(
    (key) => fields.includes(key) || saved[key],
  );
  if (!shown.length) return null;

  const save = async () => {
    setBusy(true);
    setError('');
    const clean = cleanWorkOrderDetails(value);
    const result = await updateEasyWorkOrderDetails(id, clean);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setSaved(clean);
    setEditing(false);
  };

  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, fontSize: 19, fontWeight: 700 }}>Dados do equipamento</span>
        {editable && !editing && (
          <Btn tone="link" height={44} onClick={() => setEditing(true)}>
            Editar
          </Btn>
        )}
      </div>
      {editing ? (
        <>
          {shown.map((key) => (
            <Field
              key={key}
              label={WORK_ORDER_FIELDS[key].label}
              placeholder={WORK_ORDER_FIELDS[key].placeholder}
              value={value[key] ?? ''}
              maxLength={300}
              onChange={(next) => setValue((current) => ({ ...current, [key]: next }))}
            />
          ))}
          {error && (
            <span role="alert" style={{ color: '#B91C1C' }}>
              {error}
            </span>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn disabled={busy} onClick={() => void save()}>
              {busy ? 'Salvando…' : 'Salvar'}
            </Btn>
            <Btn
              tone="outline"
              disabled={busy}
              onClick={() => {
                setValue(saved);
                setEditing(false);
              }}
            >
              Cancelar
            </Btn>
          </div>
        </>
      ) : (
        shown.map((key) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14, color: C.fg3 }}>{WORK_ORDER_FIELDS[key].label}</span>
            <span style={{ fontSize: 17 }}>{saved[key]?.trim() || '—'}</span>
          </div>
        ))
      )}
    </div>
  );
}

// Labels dos 4 status base no linguagem do Modo fácil; os status extras
// (R5b) usam o label publicado no shared-types (regra única).
const STATUS: Record<WorkOrderStatus, { kind: ChipKind; label: string }> = {
  PENDING: { kind: 'wait', label: 'Para fazer' },
  IN_PROGRESS: { kind: 'doing', label: 'Fazendo' },
  DONE: { kind: 'ok', label: 'Feito' },
  CANCELLED: { kind: 'draft', label: 'Cancelado' },
  AWAITING_PAYMENT: { kind: 'wait', label: WORK_ORDER_STATUS_LABELS.AWAITING_PAYMENT },
  WARRANTY: { kind: 'doing', label: WORK_ORDER_STATUS_LABELS.WARRANTY },
};
const STAGE_LABEL = { BEFORE: 'Antes', DURING: 'Durante', AFTER: 'Depois' } as const;

/** Ações de status extra (R5b): ícone e confirmação pós-ação. */
const EXTRA_ACTIONS: Record<
  'aguardar_pagamento' | 'receber_pagamento' | 'acionar_garantia',
  { label: string; sub: string; icon: typeof Hourglass; toast: string }
> = {
  aguardar_pagamento: {
    label: 'Aguardando pagamento',
    sub: 'Serviço feito, falta receber',
    icon: Hourglass,
    toast: 'Serviço aguardando pagamento.',
  },
  receber_pagamento: {
    label: 'Receber pagamento',
    sub: 'Conclui o serviço de vez',
    icon: HandCoins,
    toast: 'Pagamento recebido — serviço concluído.',
  },
  acionar_garantia: {
    label: 'Acionar garantia',
    sub: 'O cliente acionou a garantia',
    icon: ShieldAlert,
    toast: 'Garantia acionada.',
  },
};
type ExtraAction = keyof typeof EXTRA_ACTIONS;
const isExtraAction = (a: WorkOrderAction): a is ExtraAction => a in EXTRA_ACTIONS;

/** "Mais ações" of a service: remarcar, abrir completo, extras (R5b), cancelar ou reabrir. */
function useServiceMore(onChanged: () => void) {
  const sheet = useSheet();
  const toast = useToast();
  const { go } = useNav();
  const act = (o: EasyWorkOrder, action: 'cancelar' | 'reabrir') =>
    reasonSheet(
      sheet,
      action === 'cancelar' ? 'Por que cancelar?' : 'Por que reabrir?',
      action === 'cancelar'
        ? ['Cliente desistiu', 'Cliente remarcou', 'Feito por engano', 'Outro motivo']
        : ['Faltou terminar', 'Cliente pediu ajuste', 'Finalizado por engano', 'Outro motivo'],
      async (reason) => {
        const r = await workOrderAction(o.id, { action, reason });
        if (r.error) return toast(r.error);
        toast(action === 'cancelar' ? 'Serviço cancelado.' : 'Serviço reaberto.');
        onChanged();
      },
      action === 'cancelar' ? Ban : RotateCcw,
    );
  // Status extras (R5b): transições diretas, sem motivo — só aparecem quando
  // a empresa ligou o extra e o backend liberou a ação (allowed_actions).
  const extra = async (o: EasyWorkOrder, action: ExtraAction) => {
    const r = await workOrderAction(o.id, { action });
    if (r.error) return toast(r.error);
    toast(EXTRA_ACTIONS[action].toast);
    onChanged();
  };
  return (o: EasyWorkOrder) => {
    const open = o.status === 'PENDING' || o.status === 'IN_PROGRESS';
    const allowed = o.allowed_actions;
    const canReopen = allowed ? allowed.includes('reabrir') : !open;
    const actions: SheetAction[] = [
      {
        label: 'Remarcar',
        sub: 'Escolher outro dia ou hora',
        icon: Calendar,
        run: () =>
          go('agNew', { client: o.customer?.id, clientName: o.customer?.name, type: 'INSTALACAO' }),
      },
      {
        label: 'Abrir serviço completo',
        sub: 'Itens, fotos, histórico e correções',
        icon: FileText,
        run: () => (window.location.href = `/ordens-de-servico/${o.id}`),
      },
    ];
    for (const a of allowed ?? []) {
      if (!isExtraAction(a)) continue;
      actions.push({
        label: EXTRA_ACTIONS[a].label,
        sub: EXTRA_ACTIONS[a].sub,
        icon: EXTRA_ACTIONS[a].icon,
        run: () => void extra(o, a),
      });
    }
    if (open) {
      actions.push({
        label: 'Cancelar serviço',
        icon: Ban,
        danger: true,
        run: () => act(o, 'cancelar'),
      });
    } else if (canReopen) {
      actions.push({
        label: 'Reabrir serviço',
        sub: 'Para serviço já finalizado ou cancelado',
        icon: RotateCcw,
        run: () => act(o, 'reabrir'),
      });
    }
    sheet({ title: o.title, sub: o.customer?.name ?? `Serviço #${o.number}`, actions });
  };
}

export function ServicesScreen(): React.JSX.Element {
  const { go, tab } = useNav();
  const toast = useToast();
  const orders = useLoad(listWorkOrders);
  const more = useServiceMore(orders.reload);
  const today = new Date().toDateString();
  // "Todos": every service in Modo fácil itself (open first, then the finished ones).
  const [all, setAll] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const rank = (s: string) => (s === 'IN_PROGRESS' ? 0 : s === 'PENDING' ? 1 : 2);
  const everything = (orders.data ?? [])
    .filter((o) => o.status !== 'CANCELLED')
    .sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        (b.scheduled_at ?? b.created_at ?? '').localeCompare(a.scheduled_at ?? a.created_at ?? ''),
    );
  // Today's scheduled services plus anything already in progress (it must not disappear).
  const list = all
    ? everything.slice(0, limit)
    : everything
        .filter(
          (o) =>
            o.status === 'IN_PROGRESS' ||
            (o.scheduled_at && new Date(o.scheduled_at).toDateString() === today),
        )
        .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));

  const open = async (o: EasyWorkOrder) => {
    if (o.status === 'PENDING') {
      const r = await startWorkOrder(o.id);
      if (!r.ok) return toast(r.message);
      toast('Serviço começado.');
    }
    go('run', { id: o.id });
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <H1>{all ? 'Todos os serviços' : 'Serviços de hoje'}</H1>
        <span style={{ fontSize: 16, color: C.fg3 }}>
          {all ? 'Em andamento primeiro, depois os feitos' : longDate()}
        </span>
      </div>
      {orders.loading && !orders.data ? (
        <Loading />
      ) : orders.error ? (
        <ErrorBox title="Não foi possível carregar os serviços de hoje." onRetry={orders.reload} />
      ) : list.length === 0 ? (
        <EmptyBox
          icon={ClipboardList}
          title="Nenhum serviço para hoje."
          text="Os serviços marcados para hoje aparecem aqui."
          action="Marcar na agenda"
          onAction={() => go('agNew')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((o) => {
            const st = STATUS[o.status];
            const primary = o.status === 'PENDING' || o.status === 'IN_PROGRESS';
            const Icon =
              o.status === 'PENDING' ? Play : o.status === 'IN_PROGRESS' ? ChevronRight : FileText;
            return (
              <div
                key={o.id}
                style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      width: 64,
                      flexShrink: 0,
                      lineHeight: '28px',
                    }}
                  >
                    {!o.scheduled_at
                      ? '—'
                      : all && new Date(o.scheduled_at).toDateString() !== today
                        ? new Date(o.scheduled_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : hhmm(new Date(o.scheduled_at))}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 600 }}>
                      {o.title}
                    </span>
                    <span style={{ fontSize: 16, color: C.fg2 }}>{o.customer?.name}</span>
                  </span>
                </div>
                <Chip kind={st.kind} label={st.label} />
                <Btn
                  tone={primary ? 'primary' : 'outline'}
                  icon={Icon}
                  height={56}
                  onClick={() => void open(o)}
                  style={{ fontSize: 18 }}
                >
                  {o.status === 'PENDING'
                    ? 'Começar'
                    : o.status === 'IN_PROGRESS'
                      ? 'Continuar'
                      : 'Ver'}
                </Btn>
                <MoreButton icon={MoreHorizontal} onClick={() => more(o)} />
              </div>
            );
          })}
        </div>
      )}
      {all && everything.length > limit && (
        <Btn tone="link" onClick={() => setLimit((l) => l + PAGE)}>
          Ver mais {Math.min(PAGE, everything.length - limit)} de {everything.length - limit}
        </Btn>
      )}
      <Btn tone="link" onClick={() => tab('agenda')}>
        Ver outros dias na Agenda
      </Btn>
      <Btn
        tone="link"
        onClick={() => {
          setAll((a) => !a);
          setLimit(PAGE);
          window.scrollTo({ top: 0 });
        }}
      >
        {all ? 'Só os serviços de hoje' : 'Ver todos os serviços'}
      </Btn>
    </>
  );
}

export function RunScreen(): React.JSX.Element {
  const { params, tab } = useNav();
  const toast = useToast();
  const id = params.id ?? '';
  const order = useLoad(() => getWorkOrder(id), [id]);
  const company = useLoad(getCompany);
  const more = useServiceMore(order.reload);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  if (order.loading && !order.data) return <Loading />;
  if (order.error || !order.data)
    return <ErrorBox title="Não foi possível carregar este serviço." onRetry={order.reload} />;
  const o = order.data;
  const photos = o.photos ?? [];
  const stage: 'BEFORE' | 'DURING' | 'AFTER' = photos.length === 0 ? 'BEFORE' : 'DURING';

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadWorkOrderPhoto(o.id, file, stage);
      toast(`Foto guardada como "${STAGE_LABEL[stage]}".`);
      order.reload();
    } catch {
      toast('Não foi possível guardar a foto.');
    } finally {
      setUploading(false);
    }
  };
  const finish = async () => {
    const r = await completeWorkOrder(o.id);
    if (!r.ok) return toast(r.message);
    setDone(true);
  };
  // R5b: extra "Aguardando pagamento" ligado — recebe e conclui a OS.
  const receive = async () => {
    const r = await workOrderAction(o.id, { action: 'receber_pagamento' });
    if (r.error) return toast(r.error);
    toast('Pagamento recebido — serviço concluído.');
    order.reload();
  };

  if (done)
    return (
      <>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            textAlign: 'center',
            padding: '48px 8px 0',
          }}
        >
          <span
            style={{
              width: 104,
              height: 104,
              borderRadius: 9999,
              background: '#DCFCE7',
              color: C.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={56} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <h1
            style={{
              margin: '8px 0 0',
              fontSize: 30,
              lineHeight: '36px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Pronto! Serviço finalizado
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: C.fg2 }}>
            {o.title} em {o.customer?.name} ficou como Feito.
          </p>
          <div
            style={{
              ...card,
              width: '100%',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 600 }}>Serviço #{o.number}</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{o.customer?.name}</span>
            <Chip kind="ok" label="Feito" />
          </div>
        </div>
        <ActionBar>
          <Btn onClick={() => tab('home')}>Voltar ao início</Btn>
          {/* Back to this service (now Feito): "Mais ações" there reopens it. */}
          <Btn
            tone="link"
            onClick={() => {
              setDone(false);
              order.reload();
            }}
          >
            Abrir o serviço (desfazer ou reabrir)
          </Btn>
        </ActionBar>
      </>
    );

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <H1 size={28}>{o.title}</H1>
        <span style={{ fontSize: 17, color: C.fg2 }}>{o.customer?.name}</span>
      </div>
      <Chip kind={STATUS[o.status].kind} label={STATUS[o.status].label} />
      {o.notes && (
        <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>O que fazer</span>
          <span style={{ fontSize: 17, lineHeight: '25px', color: C.fg2, whiteSpace: 'pre-wrap' }}>
            {o.notes}
          </span>
        </div>
      )}
      <EasyDetailsCard
        id={o.id}
        fields={company.data?.work_order_fields ?? []}
        initial={o.details ?? {}}
        editable={o.status === 'PENDING' || o.status === 'IN_PROGRESS'}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          margin: '6px 4px 0',
        }}
      >
        <span style={{ fontSize: 19, fontWeight: 700 }}>Fotos</span>
        <span style={{ fontSize: 16, color: C.fg3 }}>
          {photos.length === 1 ? '1 foto' : `${photos.length} fotos`}
        </span>
      </div>
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {photos.slice(0, 9).map((p) => (
            <div
              key={p.id}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: 16,
                overflow: 'hidden',
                background: C.line,
                border: `1px solid ${C.border}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.file_url}
                alt={STAGE_LABEL[p.photo_stage]}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 6,
                  bottom: 6,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: 'rgba(10,10,15,0.7)',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {STAGE_LABEL[p.photo_stage]}
              </span>
            </div>
          ))}
        </div>
      )}
      <label style={{ display: 'block' }}>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          capture="environment"
          hidden
          disabled={uploading}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <span
          style={{
            height: 64,
            borderRadius: 18,
            border: `1.5px solid ${C.purple200}`,
            background: C.purple50,
            color: C.purple800,
            fontSize: 19,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <Camera size={26} aria-hidden="true" /> {uploading ? 'Guardando…' : 'Tirar foto'}
        </span>
      </label>
      <label style={{ display: 'block' }}>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={uploading}
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <span
          style={{
            height: 56,
            borderRadius: 16,
            border: `1.5px solid ${C.borderStrong}`,
            background: '#FFFFFF',
            color: C.ink,
            fontSize: 18,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <ImageIcon size={22} aria-hidden="true" /> Escolher da galeria
        </span>
      </label>
      <MoreButton icon={MoreHorizontal} onClick={() => more(o)} />
      {!WO_CLOSED_STATUSES.includes(o.status) && (
        <ActionBar>
          {o.status === 'PENDING' && <Hint>Toque em Finalizar quando terminar.</Hint>}
          <Btn icon={CheckCircle} onClick={() => void finish()}>
            Finalizar serviço
          </Btn>
        </ActionBar>
      )}
      {o.status === 'AWAITING_PAYMENT' && o.allowed_actions?.includes('receber_pagamento') && (
        <ActionBar>
          <Btn icon={HandCoins} onClick={() => void receive()}>
            Receber pagamento
          </Btn>
        </ActionBar>
      )}
    </>
  );
}
