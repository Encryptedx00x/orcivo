'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Upload, CheckCircle, XCircle, PlayCircle, Trash2, Phone, MessageCircle, Plus } from 'lucide-react';
import type { WorkOrder, WorkOrderPhoto } from '../../../../lib/work-order.service';
import { uploadWorkOrderPhoto } from '../../../../lib/upload-photo';
import { updateStatusAction } from '../actions';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';

const STAGE_LABELS: Record<PhotoStage, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Depois',
};

const STATUS_MAP: Record<WorkOrder['status'], { label: string; bg: string; color: string }> = {
  PENDING:     { label: 'Pendente',      bg: '#FEF3C7', color: '#92400E' },
  IN_PROGRESS: { label: 'Em execução',   bg: '#FEF3C7', color: '#92400E' },
  DONE:        { label: 'Finalizada',    bg: '#DCFCE7', color: '#166534' },
  CANCELLED:   { label: 'Cancelada',     bg: '#FEE2E2', color: '#991B1B' },
};

function Pill({ status }: { status: WorkOrder['status'] }) {
  const s = STATUS_MAP[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 9999, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props { initial: WorkOrder }

export function WorkOrderDetail({ initial }: Props): JSX.Element {
  const router = useRouter();
  const [order, setOrder] = useState<WorkOrder>(initial);
  const [confirmAction, setConfirmAction] = useState<WorkOrder['status'] | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [uploadingStage, setUploadingStage] = useState<PhotoStage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const fileInputRefs = useRef<Partial<Record<PhotoStage, HTMLInputElement | null>>>({});

  async function handleStatusChange(newStatus: WorkOrder['status']): Promise<void> {
    setStatusError(null);
    setStatusLoading(true);
    try {
      const result = await updateStatusAction(order.id, newStatus);
      if (result.error) { setStatusError(result.error); }
      else { setOrder(prev => ({ ...prev, status: newStatus })); setConfirmAction(null); router.refresh(); }
    } finally { setStatusLoading(false); }
  }

  async function handleFileChange(stage: PhotoStage, e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStage(stage);
    setUploadError(null);
    try {
      const photo = await uploadWorkOrderPhoto(order.id, file, stage);
      setOrder(prev => ({ ...prev, photos: [...prev.photos, photo] }));
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
      const res = await fetch(`/api/work-orders/${order.id}/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir foto');
      setOrder(prev => ({ ...prev, photos: prev.photos.filter(p => p.id !== photoId) }));
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao excluir foto');
    } finally { setDeletingPhotoId(null); }
  }

  const photosByStage = (stage: PhotoStage): WorkOrderPhoto[] =>
    order.photos.filter(p => p.photo_stage === stage);

  const totalVal = order.total ? Number(order.total) : 0;
  const fmtMoney = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Breadcrumb */}
      <div style={{ height: 48, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 6, fontSize: 13, color: '#64748B' }}>
        <Link href="/ordens-de-servico" style={{ color: '#64748B', textDecoration: 'none' }}>Ordens de Serviço</Link>
        <ChevronRight size={14} />
        <span style={{ color: '#0A0A0F', fontWeight: 600 }}>OS #{order.number}</span>
      </div>

      {/* Page header */}
      <div style={{ padding: '20px 24px 0', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', margin: 0, letterSpacing: '-0.01em' }}>
                OS #{order.number} · {order.title}
              </h1>
              <Pill status={order.status} />
            </div>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              {order.technician ? `Técnico: ${order.technician.name}` : 'Sem técnico atribuído'}
              {order.started_at ? ` · Iniciada ${formatDateShort(order.started_at)}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {order.status === 'PENDING' && (
              <button
                onClick={() => { void handleStatusChange('IN_PROGRESS'); }}
                disabled={statusLoading}
                style={{ ...btnPrimary, background: '#6D28D9' }}
              >
                <PlayCircle size={15} /> {statusLoading ? 'Atualizando…' : 'Iniciar OS'}
              </button>
            )}
            {order.status === 'IN_PROGRESS' && !confirmAction && (
              <>
                <button onClick={() => setConfirmAction('DONE')} style={{ ...btnPrimary, background: '#16A34A' }}>
                  <CheckCircle size={15} /> Finalizar OS
                </button>
                <button onClick={() => setConfirmAction('CANCELLED')} style={{ ...btnOutline, color: '#991B1B', borderColor: '#FECACA' }}>
                  <XCircle size={15} /> Cancelar OS
                </button>
              </>
            )}
            {confirmAction === 'DONE' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#334155' }}>Confirmar conclusão?</span>
                <button onClick={() => { void handleStatusChange('DONE'); }} disabled={statusLoading} style={{ ...btnSmall, background: '#16A34A', color: '#fff' }}>Sim, concluir</button>
                <button onClick={() => setConfirmAction(null)} style={{ ...btnSmall, background: '#fff', color: '#334155', border: '1px solid #E2E8F0' }}>Cancelar</button>
              </div>
            )}
            {confirmAction === 'CANCELLED' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#334155' }}>Confirmar cancelamento?</span>
                <button onClick={() => { void handleStatusChange('CANCELLED'); }} disabled={statusLoading} style={{ ...btnSmall, background: '#991B1B', color: '#fff' }}>Sim, cancelar</button>
                <button onClick={() => setConfirmAction(null)} style={{ ...btnSmall, background: '#fff', color: '#334155', border: '1px solid #E2E8F0' }}>Voltar</button>
              </div>
            )}
          </div>
        </div>
        {statusError && (
          <div style={{ marginTop: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', color: '#DC2626', fontSize: 13 }}>
            {statusError}
          </div>
        )}
      </div>

      {/* 2-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, padding: '0 24px' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Informações */}
          <div style={card}>
            <div style={cardHeader}><h3 style={cardTitle}>Informações</h3></div>
            <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <KV label="Agendada para" value={formatDate(order.scheduled_at)} />
              <KV label="Iniciada em" value={formatDate(order.started_at)} />
              <KV label="Concluída em" value={formatDate(order.finished_at)} />
              {order.quote && (
                <div>
                  <div style={kvLabel}>Orçamento vinculado</div>
                  <Link href={`/orcamentos/${order.quote.id}`} style={{ fontSize: 14, color: '#6D28D9', fontWeight: 600, textDecoration: 'none' }}>
                    #{order.quote.number}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Fotos */}
          <div style={card}>
            <div style={cardHeader}><h3 style={cardTitle}>Fotos</h3></div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {uploadError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', color: '#DC2626', fontSize: 13 }}>
                  {uploadError}
                </div>
              )}
              {(['BEFORE', 'DURING', 'AFTER'] as PhotoStage[]).map(stage => {
                const photos = photosByStage(stage);
                return (
                  <div key={stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{STAGE_LABELS[stage]}</span>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: uploadingStage !== null ? 'not-allowed' : 'pointer', opacity: uploadingStage !== null ? 0.6 : 1 }}>
                        <Upload size={13} />
                        {uploadingStage === stage ? 'Enviando…' : 'Adicionar'}
                        <input ref={el => { fileInputRefs.current[stage] = el; }} type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingStage !== null} onChange={e => { void handleFileChange(stage, e); }} />
                      </label>
                    </div>
                    {photos.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Nenhuma foto adicionada.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {photos.map(photo => (
                          <div key={photo.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0', position: 'relative', aspectRatio: '1' }}>
                            <img src={photo.file_url} alt={photo.caption ?? `Foto ${STAGE_LABELS[stage]}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <button onClick={() => { void handleDeletePhoto(photo.id); }} disabled={deletingPhotoId === photo.id} title="Excluir" style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(10,10,15,0.6)', border: 'none', borderRadius: 5, padding: '3px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: deletingPhotoId === photo.id ? 0.5 : 1 }}>
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
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>Cliente</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#0A0A0F', marginBottom: 2 }}>{order.customer.name}</div>
              <Link href={`/clientes/${order.customer.id}`} style={{ fontSize: 12, color: '#6D28D9', fontWeight: 500, textDecoration: 'none' }}>
                Ver perfil →
              </Link>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button style={{ ...btnContactSmall, flex: 1 }}>
                  <Phone size={12} /> Ligar
                </button>
                <button style={{ ...btnContactSmall, flex: 1, color: '#16A34A' }}>
                  <MessageCircle size={12} /> WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div style={card}>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 12 }}>Financeiro</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                <span style={{ color: '#64748B' }}>Total da OS</span>
                <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{totalVal > 0 ? fmtMoney(totalVal) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Recebido</span>
                <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#16A34A' }}>—</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                <span>Pendente</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{totalVal > 0 ? fmtMoney(totalVal) : '—'}</span>
              </div>
              <button style={{ ...btnPrimary, width: '100%', marginTop: 12, justifyContent: 'center' }}>
                <Plus size={14} /> Registrar recebimento
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div style={card}>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 }}>Histórico</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  order.finished_at && [formatDateShort(order.finished_at), 'OS finalizada'],
                  order.started_at && [formatDateShort(order.started_at), 'Execução iniciada'],
                  order.scheduled_at && [formatDateShort(order.scheduled_at), 'Agendada'],
                  ['—', 'OS criada'],
                ].filter(Boolean).map((entry, i) => {
                  const [t, e] = entry as [string, string];
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 13, borderBottom: '1px solid #F8FAFC' }}>
                      <span style={{ width: 60, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{t}</span>
                      <span style={{ flex: 1, color: '#334155' }}>{e}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' };
const cardHeader: React.CSSProperties = { padding: '12px 18px', borderBottom: '1px solid #F1F5F9' };
const cardTitle: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 600, color: '#0A0A0F' };
const kvLabel: React.CSSProperties = { fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 };
const btnPrimary: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#6D28D9', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnOutline: React.CSSProperties = { height: 36, padding: '0 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#fff', color: '#334155', border: '1px solid #E2E8F0', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 };
const btnSmall: React.CSSProperties = { border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
const btnContactSmall: React.CSSProperties = { height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#fff', color: '#334155', border: '1px solid #E2E8F0', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 };
