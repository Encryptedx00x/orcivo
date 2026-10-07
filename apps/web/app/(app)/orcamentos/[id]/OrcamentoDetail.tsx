'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuoteDocOptions } from '@orcivo/shared-types';
import { QuoteDocOptionsForm } from '../../../../components/QuoteDocOptionsForm';
import { MessageCircle, Download, X, Send, Pencil, Undo2, Wrench, XCircle } from 'lucide-react';
import { formatMoney, multiplyDecimal } from '@orcivo/shared-types';
import { openWhatsApp } from '../../../../lib/whatsapp';
import { SignatureCanvas } from '../../../approve/[token]/SignatureCanvas';
import type { Quote, QuoteItem } from '../../../../lib/quote.service';
import { AuditHistoryFeed } from '../../clientes/AuditHistoryFeed';
import { EntityHistory } from '../../../../lib/EntityHistory';
import {
  quoteAction,
  updateQuote,
  type DirectQuoteAction,
  type QuoteWithActions,
} from '../actions';
import {
  getTechnicianSignature,
  saveTechnicianSignature,
  sendQuoteWithSignature,
} from './signature-actions';
import { maskPhone } from '@orcivo/shared-types';

const STATUS_LABEL: Record<Quote['status'], string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const STATUS_STYLE: Record<Quote['status'], React.CSSProperties> = {
  DRAFT: { backgroundColor: '#F3F4F6', color: '#64748B' },
  SENT: { backgroundColor: '#FEF3C7', color: '#92400E' },
  APPROVED: { backgroundColor: '#D1FAE5', color: '#065F46' },
  REJECTED: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  CANCELLED: { backgroundColor: '#E5E7EB', color: '#334155' },
  EXPIRED: { backgroundColor: '#FFEDD5', color: '#9A3412' },
};

interface Props {
  quote: QuoteWithActions;
}

/** Fallback caso a resposta não traga allowed_actions: sem saber o papel, só ações não-admin. */
const FALLBACK_ACTIONS: Record<Quote['status'], DirectQuoteAction[]> = {
  DRAFT: ['cancelar'],
  SENT: ['recusar', 'cancelar'],
  APPROVED: [],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const REASON_REQUIRED: DirectQuoteAction[] = ['cancelar', 'recusar', 'reabrir', 'corrigir'];

const ACTION_LABEL: Record<DirectQuoteAction, string> = {
  cancelar: 'Cancelar orçamento',
  recusar: 'Recusar orçamento',
  reabrir: 'Reabrir orçamento',
  corrigir: 'Corrigir orçamento',
};

type TechnicianSignatureMethod =
  | 'APPROVE_BUTTON'
  | 'TYPED_NAME'
  | 'DRAWN_SIGNATURE'
  | 'PHOTO_SIGNATURE';

const TECHNICIAN_SIGNATURE_METHODS: Array<{ key: TechnicianSignatureMethod; label: string }> = [
  { key: 'APPROVE_BUTTON', label: 'Simples' },
  { key: 'TYPED_NAME', label: 'Nome digitado' },
  { key: 'DRAWN_SIGNATURE', label: 'Desenhar' },
  { key: 'PHOTO_SIGNATURE', label: 'Foto' },
];

export default function OrcamentoDetail({ quote: initialQuote }: Props): React.JSX.Element {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteWithActions>(initialQuote);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [applySignature, setApplySignature] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [signatureError, setSignatureError] = useState('');
  const [technicianSignatureMethod, setTechnicianSignatureMethod] =
    useState<TechnicianSignatureMethod>('PHOTO_SIGNATURE');
  const [drawnSignature, setDrawnSignature] = useState('');
  const [typedSignatureName, setTypedSignatureName] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);

  // PB1-P35/AC2: os botões vêm direto da lista de ações permitidas calculada
  // pelo backend para o estado atual + papel do usuário logado.
  const allowedActions: DirectQuoteAction[] =
    quote.allowed_actions?.filter(
      (a): a is DirectQuoteAction =>
        a === 'cancelar' || a === 'recusar' || a === 'reabrir' || a === 'corrigir',
    ) ??
    FALLBACK_ACTIONS[quote.status] ??
    [];

  // Justificativa obrigatória (AC3): abre um modal pedindo o motivo antes de aplicar a ação.
  const [pendingAction, setPendingAction] = useState<DirectQuoteAction | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  function openAction(action: DirectQuoteAction): void {
    setActionError('');
    setReason('');
    setPendingAction(action);
  }

  async function submitPendingAction(): Promise<void> {
    if (!pendingAction) return;
    if (REASON_REQUIRED.includes(pendingAction) && !reason.trim()) {
      setActionError('Informe o motivo para continuar.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const result = await quoteAction(quote.id, { action: pendingAction, reason: reason.trim() });
      if (result.error) {
        setActionError(result.error);
      } else if (result.quote) {
        setQuote(result.quote);
        setHistoryRevision((v) => v + 1);
        setPendingAction(null);
        setReason('');
        router.refresh();
      }
    } finally {
      setActionLoading(false);
    }
  }

  // PB1-P35/AC1: edição direta dos campos do orçamento fora do assistente guiado.
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [editDiscountValue, setEditDiscountValue] = useState('0');
  const [editDocOptions, setEditDocOptions] = useState<QuoteDocOptions | null>(null);
  const [editItems, setEditItems] = useState<QuoteItem[]>([]);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  function openEdit(): void {
    setEditError('');
    setEditTitle(quote.title ?? '');
    setEditNotes(quote.notes ?? '');
    setEditValidUntil(
      quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('sv-SE') : '',
    );
    setEditDiscountType(quote.discount_type);
    setEditDiscountValue(quote.discount_value);
    setEditDocOptions(quote.doc_options ?? null);
    setEditItems(quote.items.map((i) => ({ ...i })));
    setShowEditModal(true);
  }

  function updateEditItem(
    idx: number,
    field: 'description' | 'quantity' | 'unit_price',
    val: string,
  ) {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  }
  function addEditItem() {
    setEditItems((prev) => [
      ...prev,
      {
        id: `new-${prev.length}`,
        description: '',
        quantity: '1',
        unit_price: '0.00',
        total: '0.00',
      },
    ]);
  }
  function removeEditItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submitEdit(): Promise<void> {
    const validItems = editItems.filter((i) => i.description.trim() && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      setEditError('Adicione pelo menos um item com descrição e quantidade.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const result = await updateQuote(quote.id, {
        title: editTitle || undefined,
        notes: editNotes || undefined,
        valid_until: editValidUntil
          ? new Date(`${editValidUntil}T23:59:59`).toISOString()
          : undefined,
        discount_type: editDiscountType,
        doc_options: editDocOptions ?? undefined,
        discount_value: editDiscountValue || '0',
        items: validItems.map((i) => ({
          catalog_item_id: i.catalog_item_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      if (result.error) {
        setEditError(result.error);
      } else if (result.quote) {
        setQuote(result.quote);
        setHistoryRevision((v) => v + 1);
        setShowEditModal(false);
        router.refresh();
      }
    } finally {
      setEditLoading(false);
    }
  }

  // Full link for the client: env when set, else this page's origin (set after mount to keep SSR stable).
  const [webUrl, setWebUrl] = useState(process.env['NEXT_PUBLIC_WEB_URL'] ?? '');
  useEffect(() => {
    if (!webUrl) setWebUrl(window.location.origin);
  }, [webUrl]);

  useEffect(() => {
    if (initialQuote.status !== 'DRAFT') return;
    getTechnicianSignature()
      .then((data) => {
        if (data.signature_url) {
          setSignatureUrl(data.signature_url);
          setApplySignature(true);
        }
      })
      .catch(() => null);
  }, [initialQuote.status]);

  async function handleSignatureUpload(file: File) {
    setSignatureUploading(true);
    setSignatureError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await saveTechnicianSignature(formData);
      if (!result.ok) throw new Error(result.message);
      setSignatureUrl(result.signature_url ?? null);
      setApplySignature(true);
    } catch (err: unknown) {
      setSignatureError(err instanceof Error ? err.message : 'Erro ao salvar assinatura.');
    } finally {
      setSignatureUploading(false);
    }
  }

  async function saveDrawnSignature(): Promise<void> {
    if (!drawnSignature) {
      setSignatureError('Desenhe sua assinatura antes de salvar.');
      return;
    }
    const response = await fetch(drawnSignature);
    const blob = await response.blob();
    await handleSignatureUpload(
      new File([blob], 'assinatura-desenhada.png', { type: 'image/png' }),
    );
  }

  async function saveTypedSignature(): Promise<void> {
    const name = typedSignatureName.trim();
    if (!name) {
      setSignatureError('Informe o nome que deve aparecer na assinatura.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    if (!context) {
      setSignatureError('Não foi possível preparar a assinatura digitada.');
      return;
    }
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#0A0A0F';
    context.font = 'italic 52px cursive';
    context.textBaseline = 'middle';
    context.fillText(name, 28, canvas.height / 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      setSignatureError('Não foi possível preparar a assinatura digitada.');
      return;
    }
    await handleSignatureUpload(new File([blob], 'assinatura-digitada.png', { type: 'image/png' }));
  }

  function chooseTechnicianSignatureMethod(method: TechnicianSignatureMethod): void {
    setTechnicianSignatureMethod(method);
    setSignatureError('');
    if (method === 'APPROVE_BUTTON') setApplySignature(false);
  }

  function getApprovalUrl(q: Quote): string {
    if (approvalUrl) return approvalUrl;
    if (q.approval_token) return `${webUrl}/approve/${q.approval_token}`;
    return '';
  }

  async function handleSend() {
    setLoading(true);
    setError('');
    try {
      const result = await sendQuoteWithSignature(quote.id, !!signatureUrl && applySignature);
      if (!result.ok) throw new Error(result.message);
      const data = result.quote as Quote & { approvalUrl?: string };
      setQuote(data);
      if (data.approvalUrl) setApprovalUrl(data.approvalUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  const currentApprovalUrl = getApprovalUrl(quote);

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0F', marginBottom: 4 }}>
            Orçamento #{quote.number}
            {quote.title ? ` — ${quote.title}` : ''}
          </h1>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              ...STATUS_STYLE[quote.status],
            }}
          >
            {STATUS_LABEL[quote.status]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <EntityHistory
            entityType="quote"
            entityId={quote.id}
            label={`Orçamento #${quote.number}`}
            revision={`${quote.status}-${historyRevision}`}
            size="md"
          />
          {quote.status === 'DRAFT' && (
            <button onClick={openEdit} style={headerBtn}>
              <Pencil size={15} /> Editar
            </button>
          )}
          <button
            onClick={() =>
              window.open(`/api/quotes/${quote.id}/pdf`, '_blank', 'noopener,noreferrer')
            }
            style={headerBtn}
          >
            <Download size={15} /> Baixar PDF
          </button>
          <button onClick={() => router.back()} style={headerBtn}>
            Voltar
          </button>
        </div>
      </div>

      {/* Client info */}
      <div style={card}>
        <h2 style={sectionTitle}>Cliente</h2>
        <p style={{ fontWeight: 600, fontSize: 15 }}>{quote.customer.name}</p>
        {quote.customer.phone && (
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {maskPhone(quote.customer.phone)}
          </p>
        )}
      </div>

      {/* Items */}
      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={sectionTitle}>Itens</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <th style={th}>Descrição</th>
              <th style={thNum}>Qtd</th>
              <th style={thNum}>Preço unit.</th>
              <th style={thNum}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                <td style={td}>{item.description}</td>
                <td style={tdNum}>{item.quantity}</td>
                <td style={tdNum}>{formatMoney(item.unit_price)}</td>
                <td style={{ ...tdNum, fontWeight: 500 }}>{formatMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 16, paddingTop: 16 }}>
          <div
            style={{
              maxWidth: 280,
              marginLeft: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B', fontSize: 14 }}>Subtotal</span>
              <span>{formatMoney(quote.subtotal)}</span>
            </div>
            {!/^0*(\.0*)?$/.test(quote.discount_value ?? '0') && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B', fontSize: 14 }}>
                  Desconto {quote.discount_type === 'PERCENT' ? `(${quote.discount_value}%)` : ''}
                </span>
                <span style={{ color: '#DC2626' }}>
                  -{' '}
                  {quote.discount_type === 'PERCENT'
                    ? formatMoney(
                        multiplyDecimal(
                          quote.subtotal,
                          multiplyDecimal(quote.discount_value, '0.01'),
                        ),
                      )
                    : formatMoney(quote.discount_value)}
                </span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #E2E8F0',
                paddingTop: 8,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: '#6D28D9' }}>
                {formatMoney(quote.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section style={{ ...card, marginTop: 16 }} aria-label="Histórico">
        <h2 style={sectionTitle}>Histórico</h2>
        <AuditHistoryFeed
          entityType="quote"
          entityId={quote.id}
          revision={`${quote.status}-${historyRevision}`}
        />
      </section>

      {/* Actions by status */}
      <div style={{ ...card, marginTop: 16 }}>
        <h2 style={sectionTitle}>Ações</h2>

        {quote.status === 'DRAFT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* If just sent (approvalUrl available after send click) */}
            {approvalUrl && (
              <div
                style={{
                  backgroundColor: '#EDE9FE',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 8,
                }}
              >
                <p style={{ fontWeight: 600, color: '#5B21B6', marginBottom: 8 }}>
                  Orçamento enviado! Link de aprovação:
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    readOnly
                    value={approvalUrl}
                    style={{
                      flex: 1,
                      border: '1px solid #C4B5FD',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 13,
                      minWidth: 200,
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  {quote.customer.phone && (
                    <button
                      onClick={() =>
                        openWhatsApp(
                          quote.customer.phone!,
                          approvalUrl,
                          quote.title || `#${quote.number}`,
                        )
                      }
                      style={{ ...btnGreen, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <MessageCircle size={16} /> Compartilhar no WhatsApp
                    </button>
                  )}
                </div>
              </div>
            )}
            <div
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>
                Assinatura do técnico
              </p>
              {signatureError && (
                <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{signatureError}</p>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TECHNICIAN_SIGNATURE_METHODS.map((method) => (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => chooseTechnicianSignatureMethod(method.key)}
                    style={{
                      border:
                        technicianSignatureMethod === method.key
                          ? '1px solid #6D28D9'
                          : '1px solid #E2E8F0',
                      background: technicianSignatureMethod === method.key ? '#F5F3FF' : '#FFFFFF',
                      color: technicianSignatureMethod === method.key ? '#5B21B6' : '#334155',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              {technicianSignatureMethod === 'APPROVE_BUTTON' && (
                <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
                  Envie este orçamento sem aplicar uma assinatura. Sua assinatura reutilizável atual
                  permanece salva para uso futuro.
                </p>
              )}
              {technicianSignatureMethod === 'TYPED_NAME' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={typedSignatureName}
                    onChange={(event) => setTypedSignatureName(event.target.value)}
                    placeholder="Nome para a assinatura"
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void saveTypedSignature()}
                    disabled={signatureUploading || !typedSignatureName.trim()}
                    style={{
                      border: '1px solid #6D28D9',
                      background: '#FFFFFF',
                      color: '#5B21B6',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Salvar assinatura digitada
                  </button>
                </div>
              )}
              {technicianSignatureMethod === 'DRAWN_SIGNATURE' && (
                <div>
                  <SignatureCanvas onSign={setDrawnSignature} />
                  <button
                    type="button"
                    onClick={() => void saveDrawnSignature()}
                    disabled={signatureUploading || !drawnSignature}
                    style={{
                      marginTop: 8,
                      border: '1px solid #6D28D9',
                      background: '#FFFFFF',
                      color: '#5B21B6',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Salvar assinatura desenhada
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {signatureUrl && (
                  <img
                    src={signatureUrl}
                    alt="Assinatura salva"
                    style={{
                      maxWidth: 140,
                      maxHeight: 48,
                      objectFit: 'contain',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: 4,
                    }}
                  />
                )}
                {technicianSignatureMethod === 'PHOTO_SIGNATURE' && (
                  <label
                    style={{
                      fontSize: 13,
                      color: '#334155',
                      cursor: 'pointer',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '6px 10px',
                    }}
                  >
                    {signatureUploading
                      ? 'Enviando...'
                      : signatureUrl
                        ? 'Substituir assinatura'
                        : 'Salvar assinatura'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: 'none' }}
                      disabled={signatureUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleSignatureUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
                {signatureUrl && technicianSignatureMethod !== 'APPROVE_BUTTON' && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#334155',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={applySignature}
                      onChange={(e) => setApplySignature(e.target.checked)}
                    />
                    Aplicar minha assinatura ao enviar
                  </label>
                )}
              </div>
            </div>
            {/* Send errors show next to the button that caused them. */}
            {error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#B91C1C',
                  fontSize: 14,
                }}
              >
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleSend}
                disabled={loading || !!approvalUrl}
                style={{
                  ...btnPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: loading || !!approvalUrl ? 0.6 : 1,
                }}
              >
                <Send size={16} /> {loading ? 'Enviando...' : 'Enviar orçamento'}
              </button>
              {allowedActions.includes('cancelar') && (
                <button
                  onClick={() => openAction('cancelar')}
                  disabled={loading || !!pendingAction}
                  style={btnDanger}
                >
                  <X size={16} /> Cancelar orçamento
                </button>
              )}
            </div>
          </div>
        )}

        {quote.status === 'SENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentApprovalUrl && (
              <div style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 16 }}>
                <p style={{ fontWeight: 600, color: '#065F46', marginBottom: 8 }}>
                  Link de aprovação:
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    readOnly
                    value={currentApprovalUrl}
                    style={{
                      flex: 1,
                      border: '1px solid #A7F3D0',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 13,
                      minWidth: 200,
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quote.customer.phone && currentApprovalUrl && (
                <button
                  onClick={() =>
                    openWhatsApp(
                      quote.customer.phone!,
                      currentApprovalUrl,
                      quote.title || `#${quote.number}`,
                    )
                  }
                  style={{ ...btnGreen, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <MessageCircle size={16} /> Compartilhar no WhatsApp
                </button>
              )}
              {quote.pdf_url && (
                <button
                  onClick={() => window.open(quote.pdf_url!, '_blank', 'noopener,noreferrer')}
                  style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={16} /> Baixar PDF
                </button>
              )}
              {allowedActions.includes('recusar') && (
                <button
                  onClick={() => openAction('recusar')}
                  disabled={loading || !!pendingAction}
                  style={btnDanger}
                >
                  <XCircle size={16} /> Recusar orçamento
                </button>
              )}
              {allowedActions.includes('cancelar') && (
                <button
                  onClick={() => openAction('cancelar')}
                  disabled={loading || !!pendingAction}
                  style={btnDanger}
                >
                  <X size={16} /> Cancelar orçamento
                </button>
              )}
            </div>
          </div>
        )}

        {quote.status === 'APPROVED' && (
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#D1FAE5',
                borderRadius: 8,
                padding: '10px 16px',
              }}
            >
              <span style={{ color: '#065F46', fontWeight: 600 }}>Aprovado</span>
            </div>
            {quote.approval && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>
                  Aprovado em{' '}
                  {new Date(quote.approval.approved_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {quote.approval.typed_name && (
                    <>
                      {' '}
                      ·{' '}
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        {quote.approval.typed_name}
                      </span>
                    </>
                  )}
                </p>
                {quote.approval.signature_image_url && (
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: '#F9FAFB',
                      display: 'inline-block',
                    }}
                  >
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Assinatura</p>
                    <img
                      src={quote.approval.signature_image_url}
                      alt="Assinatura do cliente"
                      style={{
                        maxWidth: 280,
                        maxHeight: 120,
                        display: 'block',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            {quote.pdf_url && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => window.open(quote.pdf_url!, '_blank', 'noopener,noreferrer')}
                  style={{ ...btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={16} /> Baixar PDF
                </button>
              </div>
            )}
          </div>
        )}

        {['REJECTED', 'CANCELLED', 'EXPIRED'].includes(quote.status) && (
          <p style={{ color: '#64748B', fontSize: 14 }}>
            Este orçamento está {STATUS_LABEL[quote.status].toLowerCase()}.
          </p>
        )}

        {/* PB1-P35/AC2: saídas admin-controladas de estados terminais (reabrir/corrigir). */}
        {(allowedActions.includes('reabrir') || allowedActions.includes('corrigir')) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {allowedActions.includes('reabrir') && (
              <button
                onClick={() => openAction('reabrir')}
                disabled={loading || !!pendingAction}
                style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Undo2 size={16} /> Reabrir orçamento
              </button>
            )}
            {allowedActions.includes('corrigir') && (
              <button
                onClick={() => openAction('corrigir')}
                disabled={loading || !!pendingAction}
                style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Wrench size={16} /> Corrigir orçamento
              </button>
            )}
          </div>
        )}

        {actionError && (
          <p style={{ color: '#DC2626', fontSize: 13, marginTop: 12 }}>{actionError}</p>
        )}
      </div>

      {/* Meta info */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {quote.created_at && (
            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Criado em</p>
              <p style={{ fontSize: 14 }}>
                {new Date(quote.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {quote.valid_until && (
            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Válido até</p>
              <p style={{ fontSize: 14 }}>
                {new Date(quote.valid_until).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PB1-P35/AC3: modal de justificativa — obrigatório antes de aplicar a ação de status. */}
      {pendingAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10,10,15,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 400,
              maxWidth: '90vw',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {ACTION_LABEL[pendingAction]}
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>
              O motivo é obrigatório e fica registrado no histórico do orçamento.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                Motivo
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo"
                style={{
                  width: '100%',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  minHeight: 72,
                  resize: 'vertical',
                }}
              />
            </div>
            {actionError && (
              <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{actionError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setPendingAction(null);
                  setActionError('');
                }}
                style={btnSecondary}
              >
                Voltar
              </button>
              <button
                onClick={() => void submitPendingAction()}
                disabled={actionLoading}
                style={{ ...btnDanger, opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PB1-P35/AC1: edição direta dos campos do orçamento (fora do assistente guiado). */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10,10,15,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 560,
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Editar orçamento</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={editLabel}>Título</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={editInput}
                />
              </div>
              <div
                className="ov-row-stack"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}
              >
                <div>
                  <label style={editLabel}>Tipo de desconto</label>
                  <select
                    value={editDiscountType}
                    onChange={(e) => setEditDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                    style={editInput}
                  >
                    <option value="PERCENT">Percentual (%)</option>
                    <option value="FIXED">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label style={editLabel}>Desconto</label>
                  <input
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(e.target.value.replace(',', '.'))}
                    style={editInput}
                  />
                </div>
                <div>
                  <label style={editLabel}>Válido até</label>
                  <input
                    type="date"
                    value={editValidUntil}
                    onChange={(e) => setEditValidUntil(e.target.value)}
                    style={editInput}
                  />
                </div>
              </div>
              <QuoteDocOptionsForm value={editDocOptions} onChange={setEditDocOptions} />
              <div>
                <label style={editLabel}>Observações</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{ ...editInput, minHeight: 64, resize: 'vertical' }}
                />
              </div>
            </div>

            <div
              style={{
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <label style={{ ...editLabel, marginBottom: 0 }}>Itens</label>
              <button
                type="button"
                onClick={addEditItem}
                style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}
              >
                Adicionar item
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {editItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={item.description}
                    onChange={(e) => updateEditItem(idx, 'description', e.target.value)}
                    placeholder="Descrição"
                    style={{ ...editInput, flex: 1 }}
                  />
                  <input
                    value={item.quantity}
                    onChange={(e) =>
                      updateEditItem(idx, 'quantity', e.target.value.replace(',', '.'))
                    }
                    placeholder="Qtd"
                    style={{ ...editInput, width: 64 }}
                  />
                  <input
                    value={item.unit_price}
                    onChange={(e) =>
                      updateEditItem(idx, 'unit_price', e.target.value.replace(',', '.'))
                    }
                    placeholder="Preço"
                    style={{ ...editInput, width: 90 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeEditItem(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {editError && (
              <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{editError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={btnSecondary}>
                Voltar
              </button>
              <button
                onClick={() => void submitEdit()}
                disabled={editLoading}
                style={{ ...btnPrimary, opacity: editLoading ? 0.6 : 1 }}
              >
                {editLoading ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  fontSize: 13,
  color: '#64748B',
  fontWeight: 600,
};
const td: React.CSSProperties = { padding: '10px 8px', fontSize: 14, color: '#0A0A0F' };
// Money and quantities never break across lines ("R$" / "150,00").
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap' };
const thNum: React.CSSProperties = { ...th, textAlign: 'right', whiteSpace: 'nowrap' };
const headerBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  height: 36,
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '0 14px',
  cursor: 'pointer',
  fontSize: 13,
  color: '#334155',
  whiteSpace: 'nowrap',
};
/** Action buttons share size and grow to full width when they wrap (phones). */
const actionBase: React.CSSProperties = {
  flex: '1 1 200px',
  minHeight: 44,
  borderRadius: 10,
  padding: '10px 16px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};
const card: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  padding: 20,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginBottom: 16,
  color: '#0A0A0F',
};
const btnPrimary: React.CSSProperties = {
  ...actionBase,
  backgroundColor: '#6D28D9',
  color: '#fff',
  border: 'none',
};
const btnSecondary: React.CSSProperties = {
  ...actionBase,
  backgroundColor: '#fff',
  color: '#334155',
  border: '1px solid #E2E8F0',
};
const btnDanger: React.CSSProperties = {
  ...actionBase,
  backgroundColor: '#FEF2F2',
  color: '#991B1B',
  border: '1px solid #FECACA',
};
const btnGreen: React.CSSProperties = {
  ...actionBase,
  backgroundColor: '#25D366',
  color: '#fff',
  border: 'none',
};
const editLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 4,
};
const editInput: React.CSSProperties = {
  width: '100%',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  boxSizing: 'border-box',
};
