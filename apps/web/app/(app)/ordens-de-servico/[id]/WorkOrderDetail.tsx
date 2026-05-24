'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle, XCircle, PlayCircle, Trash2 } from 'lucide-react';
import type { WorkOrder, WorkOrderPhoto } from '../../../../lib/work-order.service';
import { uploadWorkOrderPhoto } from '../../../../lib/upload-photo';
import { updateStatusAction } from '../actions';

type PhotoStage = 'BEFORE' | 'DURING' | 'AFTER';

const STAGE_LABELS: Record<PhotoStage, string> = {
  BEFORE: 'Antes',
  DURING: 'Durante',
  AFTER: 'Depois',
};

function statusLabel(status: WorkOrder['status']): string {
  const map: Record<WorkOrder['status'], string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    DONE: 'Concluída',
    CANCELLED: 'Cancelada',
  };
  return map[status];
}

function statusBadgeStyle(status: WorkOrder['status']): React.CSSProperties {
  const styles: Record<WorkOrder['status'], React.CSSProperties> = {
    PENDING: { backgroundColor: '#FEF3C7', color: '#92400E' },
    IN_PROGRESS: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
    DONE: { backgroundColor: '#D1FAE5', color: '#065F46' },
    CANCELLED: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  };
  return { ...styles[status], display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 };
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  initial: WorkOrder;
}

export function WorkOrderDetail({ initial }: Props): JSX.Element {
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
      if (result.error) {
        setStatusError(result.error);
      } else {
        setOrder(prev => ({ ...prev, status: newStatus }));
        setConfirmAction(null);
      }
    } finally {
      setStatusLoading(false);
    }
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
    } finally {
      setDeletingPhotoId(null);
    }
  }

  const photosByStage = (stage: PhotoStage): WorkOrderPhoto[] =>
    order.photos.filter(p => p.photo_stage === stage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/ordens-de-servico" style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={16} /> Ordens de Serviço
        </Link>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span style={{ fontSize: 14, color: '#0A0A0F', fontWeight: 500 }}>OS #{order.number}</span>
      </div>

      {/* Header */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', margin: '0 0 6px' }}>
              OS #{order.number} — {order.title}
            </h1>
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>{order.customer.name}</p>
          </div>
          <span style={statusBadgeStyle(order.status)}>{statusLabel(order.status)}</span>
        </div>

        {statusError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', color: '#DC2626', fontSize: 13, marginTop: 12 }}>
            {statusError}
          </div>
        )}

        {/* Status actions */}
        {order.status === 'PENDING' && (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => { void handleStatusChange('IN_PROGRESS'); }}
              disabled={statusLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: statusLoading ? 'not-allowed' : 'pointer' }}
            >
              <PlayCircle size={16} /> {statusLoading ? 'Atualizando...' : 'Iniciar OS'}
            </button>
          </div>
        )}

        {order.status === 'IN_PROGRESS' && (
          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {confirmAction === 'DONE' ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Confirmar conclusão?</span>
                <button onClick={() => { void handleStatusChange('DONE'); }} disabled={statusLoading} style={{ ...btnSmall, backgroundColor: '#065F46', color: '#fff' }}>Sim, concluir</button>
                <button onClick={() => setConfirmAction(null)} style={{ ...btnSmall, backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>Cancelar</button>
              </div>
            ) : confirmAction === 'CANCELLED' ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Confirmar cancelamento?</span>
                <button onClick={() => { void handleStatusChange('CANCELLED'); }} disabled={statusLoading} style={{ ...btnSmall, backgroundColor: '#991B1B', color: '#fff' }}>Sim, cancelar</button>
                <button onClick={() => setConfirmAction(null)} style={{ ...btnSmall, backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>Voltar</button>
              </div>
            ) : (
              <>
                <button onClick={() => setConfirmAction('DONE')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#065F46', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  <CheckCircle size={16} /> Concluir
                </button>
                <button onClick={() => setConfirmAction('CANCELLED')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 8, padding: '9px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  <XCircle size={16} /> Cancelar OS
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Informações */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0F', margin: '0 0 16px' }}>Informações</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <p style={infoLabel}>Agendado para</p>
            <p style={infoValue}>{formatDate(order.scheduled_at)}</p>
          </div>
          <div>
            <p style={infoLabel}>Iniciado em</p>
            <p style={infoValue}>{formatDate(order.started_at)}</p>
          </div>
          <div>
            <p style={infoLabel}>Concluído em</p>
            <p style={infoValue}>{formatDate(order.finished_at)}</p>
          </div>
          {order.quote && (
            <div>
              <p style={infoLabel}>Orçamento vinculado</p>
              <Link href={`/orcamentos/${order.quote.id}`} style={{ ...infoValue, color: '#6D28D9', textDecoration: 'none' }}>
                #{order.quote.number}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Fotos */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0F', margin: '0 0 16px' }}>Fotos</h2>

        {uploadError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
            {uploadError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {(['BEFORE', 'DURING', 'AFTER'] as PhotoStage[]).map(stage => {
            const photos = photosByStage(stage);
            return (
              <div key={stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>{STAGE_LABELS[stage]}</h3>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: uploadingStage !== null ? 'not-allowed' : 'pointer', opacity: uploadingStage !== null ? 0.6 : 1 }}>
                    <Upload size={14} />
                    {uploadingStage === stage ? 'Enviando...' : 'Upload de foto'}
                    <input
                      ref={el => { fileInputRefs.current[stage] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingStage !== null}
                      onChange={e => { void handleFileChange(stage, e); }}
                    />
                  </label>
                </div>

                {photos.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Nenhuma foto adicionada.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {photos.map(photo => (
                      <div key={photo.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB', position: 'relative' }}>
                        <img
                          src={photo.file_url}
                          alt={photo.caption ?? `Foto ${STAGE_LABELS[stage]}`}
                          style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          onClick={() => { void handleDeletePhoto(photo.id); }}
                          disabled={deletingPhotoId === photo.id}
                          title="Excluir foto"
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 6, padding: '4px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: deletingPhotoId === photo.id ? 0.5 : 1 }}
                        >
                          <Trash2 size={13} color="#fff" />
                        </button>
                        {photo.caption && (
                          <p style={{ fontSize: 12, color: '#6B7280', margin: 0, padding: '6px 8px', backgroundColor: '#F9FAFB' }}>{photo.caption}</p>
                        )}
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
  );
}

const btnSmall: React.CSSProperties = { border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const infoLabel: React.CSSProperties = { fontSize: 12, color: '#6B7280', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
const infoValue: React.CSSProperties = { fontSize: 14, color: '#0A0A0F', margin: 0 };
