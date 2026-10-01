'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Upload,
  CheckCircle,
  XCircle,
  PlayCircle,
  Trash2,
  Phone,
  MessageCircle,
  Plus,
  Pencil,
  Undo2,
  Wrench,
} from 'lucide-react';
import { formatMoney, sumDecimal } from '@orcivo/shared-types';
import type {
  WorkOrder,
  WorkOrderPayment,
  WorkOrderPhoto,
} from '../../../../lib/work-order.service';
import { uploadWorkOrderPhoto } from '../../../../lib/upload-photo';
import { workOrderAction, type WorkOrderAction, type WorkOrderWithActions } from '../actions';
import { contactLinks } from '../../clientes/contact-links';
import { PaymentRegistrationModal } from '../../financeiro/PaymentRegistrationModal';
import {
  PaymentDeleteModal,
  PaymentEditModal,
  type EditablePayment,
} from '../../financeiro/PaymentEditModal';
import { AuditHistoryFeed } from '../../clientes/AuditHistoryFeed';
import { EntityHistory } from '../../../../lib/EntityHistory';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';

const STAGE_LABELS: Record<PhotoStage, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Depois',
};

const STATUS_MAP: Record<WorkOrder['status'], { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pendente', bg: '#FEF3C7', color: '#92400E' },
  IN_PROGRESS: { label: 'Em execução', bg: '#FEF3C7', color: '#92400E' },
  DONE: { label: 'Finalizada', bg: '#DCFCE7', color: '#166534' },
  CANCELLED: { label: 'Cancelada', bg: '#FEE2E2', color: '#991B1B' },
};

/**
 * Fallback caso a resposta não traga allowed_actions (nunca deve acontecer
 * com o backend atual): sem saber o papel do usuário, só ações não-admin.
 */
const FALLBACK_ACTIONS: Record<WorkOrder['status'], WorkOrderAction[]> = {
  PENDING: ['iniciar', 'cancelar'],
  IN_PROGRESS: ['concluir', 'cancelar'],
  DONE: [],
  CANCELLED: [],
};

const ACTION_STATUS: Partial<Record<WorkOrderAction, WorkOrder['status']>> = {
  iniciar: 'IN_PROGRESS',
  concluir: 'DONE',
  cancelar: 'CANCELLED',
  reabrir: 'IN_PROGRESS',
};

const REASON_REQUIRED: WorkOrderAction[] = ['cancelar', 'reabrir', 'corrigir'];

function ReasonModal({
  children,
  onClose,
  busy,
}: {
  children: React.ReactNode;
  onClose: () => void;
  busy: boolean;
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Justificativa da alteração"
      style={{ ...reasonDialog, width: 420, maxWidth: '90vw', margin: 'auto' }}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

function Pill({ status }: { status: WorkOrder['status'] }) {
  const s = STATUS_MAP[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        padding: '5px 10px',
        borderRadius: 9999,
        background: s.bg,
        color: s.color,
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
      {s.label}
    </span>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  initial: WorkOrderWithActions;
  payments: WorkOrderPayment[];
}

export function WorkOrderDetail({ initial, payments }: Props): JSX.Element {
  const router = useRouter();
  const [order, setOrder] = useState<WorkOrderWithActions>(initial);
  const contact = contactLinks(order.customer.phone);
  const [pendingAction, setPendingAction] = useState<WorkOrderAction | null>(null);
  const [manualStatus, setManualStatus] = useState<WorkOrder['status'] | null>(null);
  const [reason, setReason] = useState('');
  const [correctTitle, setCorrectTitle] = useState(initial.title ?? '');
  const [correctNotes, setCorrectNotes] = useState(initial.notes ?? '');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [uploadingStage, setUploadingStage] = useState<PhotoStage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EditablePayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<EditablePayment | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const fileInputRefs = useRef<Partial<Record<PhotoStage, HTMLInputElement | null>>>({});

  // AC4: os botões vêm direto da lista de ações permitidas calculada pelo
  // backend para o estado atual + papel do usuário logado.
  const allowedActions: WorkOrderAction[] =
    order.allowed_actions ?? FALLBACK_ACTIONS[order.status] ?? [];

  async function handleAction(
    action: WorkOrderAction,
    input?: { reason?: string; title?: string; notes?: string; status?: WorkOrder['status'] },
  ): Promise<void> {
    setStatusError(null);
    setStatusLoading(true);
    try {
      const result = await workOrderAction(order.id, { action, ...input });
      if (result.error) {
        setStatusError(result.error);
      } else if (result.order) {
        setOrder(result.order);
        setHistoryRevision((value) => value + 1);
        setPendingAction(null);
        setManualStatus(null);
        setReason('');
        router.refresh();
      }
    } finally {
      setStatusLoading(false);
    }
  }

  function openAction(action: WorkOrderAction): void {
    setManualStatus(null);
    setStatusError(null);
    setReason('');
    setCorrectTitle(order.title ?? '');
    setCorrectNotes(order.notes ?? '');
    setPendingAction(action);
  }

  function submitPendingAction(): void {
    if (!pendingAction) return;
    if ((manualStatus || REASON_REQUIRED.includes(pendingAction)) && !reason.trim()) {
      setStatusError('Informe o motivo para continuar.');
      return;
    }
    const input: { reason?: string; title?: string; notes?: string; status?: WorkOrder['status'] } =
      {};
    if (manualStatus) {
      input.status = manualStatus;
      input.reason = reason.trim();
    }
    if (REASON_REQUIRED.includes(pendingAction)) input.reason = reason.trim();
    if (pendingAction === 'corrigir') {
      input.title = correctTitle.trim();
      input.notes = correctNotes;
    }
    void handleAction(pendingAction, input);
  }

  async function handleFileChange(
    stage: PhotoStage,
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStage(stage);
    setUploadError(null);
    try {
      const photo = await uploadWorkOrderPhoto(order.id, file, stage);
      setOrder((prev) => ({ ...prev, photos: [...prev.photos, photo] }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erro no upload. Tente novamente.');
    } finally {
      setUploadingStage(null);
      const ref = fileInputRefs.current[stage];
      if (ref) ref.value = '';
    }
  }

  async function handleDeletePhoto(photoId: string): Promise<void> {
    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/work-orders/${order.id}/photos/${photoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir foto');
      setOrder((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== photoId) }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao excluir foto');
    } finally {
      setDeletingPhotoId(null);
    }
  }

  const photosByStage = (stage: PhotoStage): WorkOrderPhoto[] =>
    order.photos.filter((p) => p.photo_stage === stage);

  function editablePayment(payment: WorkOrderPayment): EditablePayment {
    return {
      id: payment.id,
      customer: order.customer.name,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      dueDate: payment.due_date,
      paidAt: payment.paid_at,
    };
  }

  function paymentChanged(): void {
    setHistoryRevision((value) => value + 1);
  }

  const received = sumDecimal(
    payments.filter((payment) => payment.status === 'PAID').map((payment) => payment.amount),
  );
  const pending = sumDecimal(
    payments
      .filter((payment) => payment.status === 'PENDING' || payment.status === 'PARTIAL')
      .map((payment) => payment.amount),
  );

  return (
    <>
      <div style={{ padding: '0 0 40px' }}>
        {/* Breadcrumb */}
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
          <Link href="/ordens-de-servico" style={{ color: '#64748B', textDecoration: 'none' }}>
            Ordens de Serviço
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0A0A0F', fontWeight: 600 }}>OS #{order.number}</span>
        </div>

        {/* Page header */}
        <div style={{ padding: '20px 24px 0', marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#0A0A0F',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  OS #{order.number} · {order.title}
                </h1>
                <Pill status={order.status} />
              </div>
              <div style={{ fontSize: 13, color: '#64748B' }}>
                {order.technician ? `Técnico: ${order.technician.name}` : 'Sem técnico atribuído'}
                {order.started_at ? ` · Iniciada ${formatDateShort(order.started_at)}` : ''}
              </div>
            </div>

            {/* Ações de domínio — apenas as permitidas para o estado/papel (AC4) */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <EntityHistory
                entityType="work_order"
                entityId={order.id}
                label={`OS #${order.number}`}
                revision={historyRevision}
              />
              <label style={{ fontSize: 13 }}>
                Alterar status
                <select
                  aria-label="Alterar status"
                  value=""
                  disabled={statusLoading || !!pendingAction}
                  style={btnOutline}
                  onChange={(event) => {
                    const action = event.target.value as WorkOrderAction;
                    const target = ACTION_STATUS[action];
                    if (target) {
                      openAction(action);
                      setManualStatus(target);
                    }
                  }}
                >
                  <option value="">Selecione um status</option>
                  {(order.allowed_actions ?? [])
                    .filter((action) => ACTION_STATUS[action])
                    .map((action) => (
                      <option key={action} value={action}>
                        {STATUS_MAP[ACTION_STATUS[action]!].label}
                      </option>
                    ))}
                </select>
              </label>
              {manualStatus && pendingAction && (
                <ReasonModal
                  busy={statusLoading}
                  onClose={() => {
                    setPendingAction(null);
                    setManualStatus(null);
                  }}
                >
                  <strong>Alterar status para {STATUS_MAP[manualStatus].label}?</strong>
                  <label htmlFor="manual-status-reason">
                    Justificativa obrigatória — registrada no histórico
                  </label>
                  <textarea
                    id="manual-status-reason"
                    autoFocus
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    style={reasonInput}
                  />
                  {statusError && <p role="alert">{statusError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={submitPendingAction}
                      disabled={statusLoading || !reason.trim()}
                      style={btnPrimary}
                    >
                      {statusLoading ? 'Salvando…' : 'Confirmar alteração'}
                    </button>
                    <button
                      disabled={statusLoading}
                      onClick={() => {
                        setPendingAction(null);
                        setManualStatus(null);
                      }}
                      style={btnOutline}
                    >
                      Voltar
                    </button>
                  </div>
                </ReasonModal>
              )}
              {allowedActions.includes('iniciar') && !pendingAction && (
                <button
                  onClick={() => {
                    void handleAction('iniciar');
                  }}
                  disabled={statusLoading}
                  style={{ ...btnPrimary, background: '#6D28D9' }}
                >
                  <PlayCircle size={15} /> {statusLoading ? 'Atualizando…' : 'Iniciar OS'}
                </button>
              )}
              {allowedActions.includes('concluir') && !pendingAction && (
                <button
                  onClick={() => openAction('concluir')}
                  style={{ ...btnPrimary, background: '#16A34A' }}
                >
                  <CheckCircle size={15} /> Finalizar OS
                </button>
              )}
              {allowedActions.includes('cancelar') && !pendingAction && (
                <button
                  onClick={() => openAction('cancelar')}
                  style={{ ...btnOutline, color: '#991B1B', borderColor: '#FECACA' }}
                >
                  <XCircle size={15} /> Cancelar OS
                </button>
              )}
              {allowedActions.includes('reabrir') && !pendingAction && (
                <button
                  onClick={() => openAction('reabrir')}
                  style={{ ...btnOutline, color: '#92400E', borderColor: '#FDE68A' }}
                >
                  <Undo2 size={15} /> Reabrir OS
                </button>
              )}
              {allowedActions.includes('corrigir') && !pendingAction && (
                <button
                  onClick={() => openAction('corrigir')}
                  style={{ ...btnOutline, color: '#334155' }}
                >
                  <Wrench size={15} /> Corrigir OS
                </button>
              )}

              {pendingAction === 'concluir' && !manualStatus && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#334155' }}>Confirmar conclusão?</span>
                  <button
                    onClick={() => {
                      void handleAction('concluir');
                    }}
                    disabled={statusLoading}
                    style={{ ...btnSmall, background: '#16A34A', color: '#fff' }}
                  >
                    Sim, concluir
                  </button>
                  <button
                    onClick={() => setPendingAction(null)}
                    style={{
                      ...btnSmall,
                      background: '#fff',
                      color: '#334155',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {pendingAction === 'cancelar' && !manualStatus && (
                <ReasonModal busy={statusLoading} onClose={() => setPendingAction(null)}>
                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    Cancelar a OS #{order.number}?
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    O motivo é obrigatório e fica registrado no histórico.
                  </span>
                  <textarea
                    aria-label="Justificativa"
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo do cancelamento (obrigatório)"
                    style={reasonInput}
                  />
                  {statusError && <p role="alert">{statusError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={submitPendingAction}
                      disabled={statusLoading}
                      style={{ ...btnSmall, background: '#991B1B', color: '#fff' }}
                    >
                      {statusLoading ? 'Cancelando…' : 'Sim, cancelar'}
                    </button>
                    <button
                      disabled={statusLoading}
                      onClick={() => setPendingAction(null)}
                      style={{
                        ...btnSmall,
                        background: '#fff',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      Voltar
                    </button>
                  </div>
                </ReasonModal>
              )}

              {pendingAction === 'reabrir' && !manualStatus && (
                <ReasonModal busy={statusLoading} onClose={() => setPendingAction(null)}>
                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    Reabrir a OS #{order.number}?
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    A OS volta para execução. O motivo é obrigatório e fica registrado no histórico.
                  </span>
                  <textarea
                    aria-label="Justificativa"
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo da reabertura (obrigatório)"
                    style={reasonInput}
                  />
                  {statusError && <p role="alert">{statusError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={submitPendingAction}
                      disabled={statusLoading}
                      style={{ ...btnSmall, background: '#92400E', color: '#fff' }}
                    >
                      {statusLoading ? 'Reabrindo…' : 'Sim, reabrir'}
                    </button>
                    <button
                      disabled={statusLoading}
                      onClick={() => setPendingAction(null)}
                      style={{
                        ...btnSmall,
                        background: '#fff',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      Voltar
                    </button>
                  </div>
                </ReasonModal>
              )}

              {pendingAction === 'corrigir' && !manualStatus && (
                <ReasonModal busy={statusLoading} onClose={() => setPendingAction(null)}>
                  <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    Corrigir a OS #{order.number}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Ajuste operacional pós-encerramento — o status não muda e a correção fica no
                    histórico.
                  </span>
                  <textarea
                    aria-label="Justificativa"
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo da correção (obrigatório)"
                    style={reasonInput}
                  />
                  <input
                    value={correctTitle}
                    onChange={(e) => setCorrectTitle(e.target.value)}
                    placeholder="Título"
                    style={{ ...reasonInput, height: 34, resize: 'none' }}
                  />
                  <textarea
                    value={correctNotes}
                    onChange={(e) => setCorrectNotes(e.target.value)}
                    placeholder="Observações"
                    style={reasonInput}
                  />
                  {statusError && <p role="alert">{statusError}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={submitPendingAction}
                      disabled={statusLoading}
                      style={{ ...btnSmall, background: '#334155', color: '#fff' }}
                    >
                      {statusLoading ? 'Salvando…' : 'Salvar correção'}
                    </button>
                    <button
                      disabled={statusLoading}
                      onClick={() => setPendingAction(null)}
                      style={{
                        ...btnSmall,
                        background: '#fff',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      Voltar
                    </button>
                  </div>
                </ReasonModal>
              )}
            </div>
          </div>
          {statusError && (
            <div
              style={{
                marginTop: 10,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#DC2626',
                fontSize: 13,
              }}
            >
              {statusError}
            </div>
          )}
        </div>

        {/* 2-column layout */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, padding: '0 24px' }}
        >
          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Informações */}
            <div style={card}>
              <div style={cardHeader}>
                <h3 style={cardTitle}>Informações</h3>
              </div>
              <div
                style={{
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 16,
                }}
              >
                <KV label="Agendada para" value={formatDate(order.scheduled_at)} />
                <KV label="Iniciada em" value={formatDate(order.started_at)} />
                <KV label="Concluída em" value={formatDate(order.finished_at)} />
                {order.quote && (
                  <div>
                    <div style={kvLabel}>Orçamento vinculado</div>
                    <Link
                      href={`/orcamentos/${order.quote.id}`}
                      style={{
                        fontSize: 14,
                        color: '#6D28D9',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      #{order.quote.number}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Fotos */}
            <div style={card}>
              <div style={cardHeader}>
                <h3 style={cardTitle}>Fotos</h3>
              </div>
              <div
                style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {uploadError && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#DC2626',
                      fontSize: 13,
                    }}
                  >
                    {uploadError}
                  </div>
                )}
                {(['BEFORE', 'DURING', 'AFTER'] as PhotoStage[]).map((stage) => {
                  const photos = photosByStage(stage);
                  return (
                    <div key={stage}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                          {STAGE_LABELS[stage]}
                        </span>
                        <label
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: '#F5F3FF',
                            color: '#6D28D9',
                            border: '1px solid #DDD6FE',
                            borderRadius: 8,
                            padding: '5px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: uploadingStage !== null ? 'not-allowed' : 'pointer',
                            opacity: uploadingStage !== null ? 0.6 : 1,
                          }}
                        >
                          <Upload size={13} />
                          {uploadingStage === stage ? 'Enviando…' : 'Adicionar'}
                          <input
                            ref={(el) => {
                              fileInputRefs.current[stage] = el;
                            }}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            disabled={uploadingStage !== null}
                            onChange={(e) => {
                              void handleFileChange(stage, e);
                            }}
                          />
                        </label>
                      </div>
                      {photos.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
                          Nenhuma foto adicionada.
                        </p>
                      ) : (
                        <div
                          style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}
                        >
                          {photos.map((photo) => (
                            <div
                              key={photo.id}
                              style={{
                                borderRadius: 8,
                                overflow: 'hidden',
                                border: '1px solid #E2E8F0',
                                position: 'relative',
                                aspectRatio: '1',
                              }}
                            >
                              <img
                                src={photo.file_url}
                                alt={photo.caption ?? `Foto ${STAGE_LABELS[stage]}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                              <button
                                onClick={() => {
                                  void handleDeletePhoto(photo.id);
                                }}
                                disabled={deletingPhotoId === photo.id}
                                title="Excluir"
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  background: 'rgba(10,10,15,0.6)',
                                  border: 'none',
                                  borderRadius: 5,
                                  padding: '3px 4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: deletingPhotoId === photo.id ? 0.5 : 1,
                                }}
                              >
                                <Trash2 size={12} color="#fff" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cliente */}
            <div style={card}>
              <div style={{ padding: '14px 18px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Cliente
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', marginBottom: 2 }}>
                  {order.customer.name}
                </div>
                <Link
                  href={`/clientes/${order.customer.id}`}
                  style={{
                    fontSize: 12,
                    color: '#6D28D9',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  Ver perfil →
                </Link>
                {contact && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <a
                      href={contact.tel}
                      style={{ ...btnContactSmall, flex: 1, textDecoration: 'none' }}
                    >
                      <Phone size={12} /> Ligar
                    </a>
                    <a
                      href={contact.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...btnContactSmall,
                        flex: 1,
                        color: '#16A34A',
                        textDecoration: 'none',
                      }}
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Financeiro */}
            <div style={card}>
              <div style={{ padding: '14px 18px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  Financeiro
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: '#64748B' }}>Total da OS</span>
                  <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                    {order.total ? formatMoney(order.total) : '—'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: '#64748B' }}>Recebido</span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#16A34A',
                    }}
                  >
                    {formatMoney(received)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: 14,
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: 8,
                  }}
                >
                  <span>Pendente</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatMoney(pending)}
                  </span>
                </div>
                {payments.length ? (
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 12, paddingTop: 10 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#64748B',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '.06em',
                        marginBottom: 6,
                      }}
                    >
                      Recebimentos registrados
                    </div>
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}
                      >
                        <span
                          style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                        >
                          {formatMoney(payment.amount)}
                        </span>
                        <span style={{ color: '#64748B', fontSize: 12 }}>{payment.status}</span>
                        <button
                          type="button"
                          aria-label="Editar recebimento"
                          onClick={() => setEditingPayment(editablePayment(payment))}
                          style={{ ...btnOutline, height: 28, padding: '0 7px' }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label="Excluir recebimento"
                          onClick={() => setDeletingPayment(editablePayment(payment))}
                          style={{ ...btnOutline, height: 28, padding: '0 7px', color: '#DC2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  style={{
                    ...btnPrimary,
                    width: '100%',
                    marginTop: 12,
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={14} /> Registrar recebimento
                </button>
              </div>
            </div>

            {/* Histórico */}
            <div style={card}>
              <div style={{ padding: '14px 18px' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  Histórico
                </div>
                <AuditHistoryFeed
                  entityType="work_order"
                  entityId={order.id}
                  revision={historyRevision}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {showPaymentModal ? (
        <PaymentRegistrationModal
          customers={[order.customer]}
          workOrder={{ id: order.id, number: order.number, title: order.title }}
          onClose={() => setShowPaymentModal(false)}
        />
      ) : null}
      {editingPayment ? (
        <PaymentEditModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onChanged={paymentChanged}
        />
      ) : null}
      {deletingPayment ? (
        <PaymentDeleteModal
          payment={deletingPayment}
          onClose={() => setDeletingPayment(null)}
          onChanged={paymentChanged}
        />
      ) : null}
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={kvLabel}>{label}</div>
      <div style={{ fontSize: 14, color: '#0A0A0F', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  overflow: 'hidden',
};
const cardHeader: React.CSSProperties = { padding: '12px 18px', borderBottom: '1px solid #F1F5F9' };
const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: '#0A0A0F',
};
const kvLabel: React.CSSProperties = {
  fontSize: 11,
  color: '#64748B',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
};
const btnPrimary: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
  background: '#6D28D9',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
const btnOutline: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 9,
  fontSize: 13,
  fontWeight: 600,
  background: '#fff',
  color: '#334155',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
const btnSmall: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '6px 14px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnContactSmall: React.CSSProperties = {
  height: 32,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  background: '#fff',
  color: '#334155',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
};
const reasonDialog: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'stretch',
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  padding: 12,
  minWidth: 280,
  maxWidth: 380,
};
const reasonInput: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 13,
  color: '#0A0A0F',
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '8px 10px',
  resize: 'vertical',
  minHeight: 60,
  outline: 'none',
};
