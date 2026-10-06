'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Download,
} from 'lucide-react';
import { approvalService, type PublicQuote } from '../../../lib/approval.service';
import { formatMoney } from '@orcivo/shared-types';
import { SignatureCanvas } from './SignatureCanvas';

type PageState = 'loading' | 'show_quote' | 'show_form' | 'approved' | 'rejected' | 'error';
type ApproveTab = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE' | 'PHOTO_SIGNATURE';

const PHOTO_MAX_SIZE = 1_500_000;

export default function ApprovePage(): JSX.Element {
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<ApproveTab>('APPROVE_BUTTON');
  const [typedName, setTypedName] = useState('');
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    approvalService
      .fetchPublicQuote(token)
      .then((q) => {
        setQuote(q);
        if (q.company.allowed_approval_methods.length > 0) {
          setActiveTab(q.company.allowed_approval_methods[0]);
        }
        setPageState('show_quote');
      })
      .catch((e: Error) => {
        setErrorMsg(e.message);
        setPageState('error');
      });
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (activeTab === 'TYPED_NAME' && !typedName.trim()) {
        setSubmitError('Por favor, informe seu nome completo.');
        setSubmitting(false);
        return;
      }
      if ((activeTab === 'DRAWN_SIGNATURE' || activeTab === 'PHOTO_SIGNATURE') && !signature) {
        setSubmitError(
          activeTab === 'DRAWN_SIGNATURE'
            ? 'Por favor, desenhe sua assinatura.'
            : 'Por favor, selecione uma foto da assinatura.',
        );
        setSubmitting(false);
        return;
      }
      await approvalService.approveQuote(token, {
        approval_method: activeTab,
        typed_name: activeTab === 'TYPED_NAME' ? typedName.trim() : undefined,
        signature:
          activeTab === 'DRAWN_SIGNATURE' || activeTab === 'PHOTO_SIGNATURE'
            ? signature
            : undefined,
      });
      setPageState('approved');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao processar aprovação');
    } finally {
      setSubmitting(false);
    }
  };

  function handlePhotoSignature(file: File | undefined): void {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setSubmitError('Envie uma imagem PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > PHOTO_MAX_SIZE) {
      setSubmitError('A foto da assinatura deve ter no máximo 1,5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSignature(typeof reader.result === 'string' ? reader.result : '');
      setSubmitError('');
    };
    reader.onerror = () => setSubmitError('Não foi possível ler a foto da assinatura.');
    reader.readAsDataURL(file);
  }

  // ─── Company initials from name ───
  const companyInitials =
    quote?.company.trade_name
      ?.split(' ')
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join('') ?? 'OV';
  const companyName = quote?.company.trade_name ?? 'Orcivo';

  const expiresDate = quote?.valid_until
    ? new Date(quote.valid_until).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  // ─── Approved state ───
  if (pageState === 'approved') {
    return (
      <div className="pub">
        <div className="pub-bar">
          <div className="biz">{companyInitials}</div>
          <div>
            <div className="biz-name">{companyName}</div>
          </div>
          <div className="powered">
            Enviado via <strong>Orcivo</strong>
          </div>
        </div>
        <div className="pub-body" style={{ textAlign: 'center', paddingTop: 80 }}>
          <CheckCircle size={64} style={{ color: '#16A34A', margin: '0 auto 20px' }} />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              color: '#0A0A0F',
              margin: '0 0 12px',
            }}
          >
            Orçamento aprovado!
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', maxWidth: 400, margin: '0 auto 8px' }}>
            Sua aprovação foi registrada com sucesso. Em breve o técnico responsável entrará em
            contato.
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 400, margin: '0 auto' }}>
            Uma ordem de serviço foi gerada automaticamente.
          </p>
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (pageState === 'error') {
    return (
      <div className="pub">
        <div className="pub-bar">
          <div className="biz">OV</div>
          <div>
            <div className="biz-name">Orcivo</div>
          </div>
        </div>
        <div className="pub-body">
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 16,
              padding: '24px 26px',
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={24} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#7F1D1D', marginBottom: 6 }}>
                Link inválido ou expirado
              </div>
              <div style={{ fontSize: 14, color: '#991B1B' }}>
                {errorMsg || 'Este link de orçamento não é válido ou expirou.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading skeleton ───
  if (pageState === 'loading') {
    return (
      <div className="pub">
        <div className="pub-bar">
          <div className="biz">OV</div>
          <div>
            <div className="biz-name">Orcivo</div>
          </div>
        </div>
        <div className="pub-body">
          {[120, 80, 200].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                background: '#E2E8F0',
                borderRadius: 16,
                marginBottom: 16,
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── Quote display ───
  return (
    <div className="pub">
      {/* Sticky top bar */}
      <div className="pub-bar">
        <div className="biz">{companyInitials}</div>
        <div>
          <div className="biz-name">{companyName}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() =>
              window.open(approvalService.getPdfUrl(token), '_blank', 'noopener,noreferrer')
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: 9999,
              border: '1px solid var(--border-1)',
              background: '#fff',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Download size={14} /> Baixar PDF
          </button>
          <div className="powered">
            Enviado via <strong>Orcivo</strong>
          </div>
        </div>
      </div>

      <div className="pub-body">
        {/* Hero */}
        <div className="pub-hero">
          <div className="ic">
            <FileText size={28} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <h1>Olá, {quote?.customer.name} 👋</h1>
            <div className="sub">
              Aqui está o orçamento #{quote?.number}, preparado por <strong>{companyName}</strong>.
              Confira os itens, valores e condições — você pode aprovar ou recusar abaixo.
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 9999,
              background: '#FEF3C7',
              color: '#92400E',
              flexShrink: 0,
            }}
          >
            <span
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}
            />
            Aguardando sua resposta
          </span>
        </div>

        {/* Meta row */}
        <div className="pub-meta-row">
          <span>
            <Calendar size={14} /> Validade:{' '}
            <strong style={{ color: 'var(--ink)' }}>{expiresDate}</strong>
          </span>
          <span>
            <Clock size={14} /> Válido até{' '}
            <strong style={{ color: 'var(--ink)' }}>{expiresDate}</strong>
          </span>
          <span>
            <ShieldCheck size={14} /> Você está num link seguro do Orcivo
          </span>
        </div>

        {/* Para (cliente) */}
        <div className="pub-card">
          <h2>Para</h2>
          <div className="pub-grid-2">
            <div className="pub-kv">
              <div className="k">Cliente</div>
              <div className="v">{quote?.customer.name}</div>
            </div>
            {quote?.title && (
              <div className="pub-kv">
                <div className="k">Título</div>
                <div className="v">{quote.title}</div>
              </div>
            )}
            {quote?.valid_until && (
              <div className="pub-kv">
                <div className="k">Validade</div>
                <div className="v">{expiresDate}</div>
              </div>
            )}
          </div>
        </div>

        {/* Itens */}
        <div className="pub-card">
          <h2>Itens do orçamento</h2>
          {quote?.items.map((item, i) => (
            <div key={i} className="pub-item">
              <div>
                <div className="name">{item.description}</div>
              </div>
              <div className="qty">{item.quantity} un</div>
              <div className="total">{formatMoney(item.total)}</div>
            </div>
          ))}

          <div className="pub-totals">
            <div className="row">
              <span>Subtotal</span>
              <span>{formatMoney(quote?.subtotal ?? '0')}</span>
            </div>
            {quote && parseFloat(quote.discount_value) > 0 && (
              <div className="row" style={{ color: '#166534' }}>
                <span>
                  Desconto {quote.discount_type === 'PERCENT' ? `(${quote.discount_value}%)` : ''}
                </span>
                <span>- {formatMoney(quote.discount_value)}</span>
              </div>
            )}
            <div className="grand">
              <span>Total</span>
              <span className="v">{formatMoney(quote?.total ?? '0')}</span>
            </div>
          </div>
        </div>

        {/* Observações */}
        {quote?.notes && (
          <div className="pub-card" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <h2>Observações</h2>
            <p style={{ fontSize: 14, color: '#334155', margin: 0 }}>{quote.notes}</p>
          </div>
        )}

        {/* Approval form */}
        {pageState === 'show_form' && (
          <div className="pub-card">
            <h2>Como deseja aprovar?</h2>

            {/* Method tabs */}
            <div
              style={{
                display: 'flex',
                gap: 0,
                borderBottom: '1px solid #E2E8F0',
                marginBottom: 20,
              }}
            >
              {(
                [
                  { key: 'APPROVE_BUTTON', label: 'Aprovação simples' },
                  { key: 'TYPED_NAME', label: 'Assinar com nome' },
                  { key: 'DRAWN_SIGNATURE', label: 'Assinar com desenho' },
                  { key: 'PHOTO_SIGNATURE', label: 'Foto da assinatura' },
                ] as const
              )
                .filter((t) => quote?.company.allowed_approval_methods.includes(t.key))
                .map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveTab(t.key);
                      if (t.key === 'DRAWN_SIGNATURE' || t.key === 'PHOTO_SIGNATURE') {
                        setSignature('');
                      }
                      setSubmitError('');
                    }}
                    style={{
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: activeTab === t.key ? 600 : 500,
                      color: activeTab === t.key ? '#0A0A0F' : '#64748B',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderBottom: `2px solid ${activeTab === t.key ? '#6D28D9' : 'transparent'}`,
                      marginBottom: -1,
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
            </div>

            {activeTab === 'APPROVE_BUTTON' && (
              <div>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>
                  Clique abaixo para confirmar sua aprovação deste orçamento.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    background: '#6D28D9',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Processando...' : 'Aprovar orçamento ✓'}
                </button>
              </div>
            )}

            {activeTab === 'TYPED_NAME' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: 8,
                  }}
                >
                  Seu nome completo
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  style={{
                    width: '100%',
                    height: 48,
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '0 14px',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginBottom: 16,
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleApprove}
                  disabled={submitting || !typedName.trim()}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    background: '#6D28D9',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: submitting || !typedName.trim() ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Processando...' : 'Aprovar e assinar'}
                </button>
              </div>
            )}

            {activeTab === 'DRAWN_SIGNATURE' && (
              <div>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>
                  Desenhe sua assinatura no campo abaixo:
                </p>
                <SignatureCanvas onSign={setSignature} />
                <button
                  onClick={handleApprove}
                  disabled={submitting || !signature}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    background: '#6D28D9',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    marginTop: 16,
                    opacity: submitting || !signature ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Processando...' : 'Aprovar com assinatura'}
                </button>
              </div>
            )}

            {activeTab === 'PHOTO_SIGNATURE' && (
              <div>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>
                  Envie uma foto nítida da sua assinatura (PNG, JPG ou WEBP, até 1,5 MB).
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handlePhotoSignature(event.target.files?.[0])}
                  style={{ marginBottom: 16 }}
                />
                {signature && (
                  <img
                    src={signature}
                    alt="Prévia da foto da assinatura"
                    style={{
                      display: 'block',
                      maxWidth: 240,
                      maxHeight: 120,
                      objectFit: 'contain',
                      marginBottom: 16,
                    }}
                  />
                )}
                <button
                  onClick={handleApprove}
                  disabled={submitting || !signature}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    background: '#6D28D9',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: submitting || !signature ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Processando...' : 'Aprovar com foto da assinatura'}
                </button>
              </div>
            )}

            {submitError && (
              <div
                style={{
                  marginTop: 14,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  fontSize: 14,
                  color: '#991B1B',
                }}
              >
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                {submitError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky CTA — only visible in show_quote state */}
      {pageState === 'show_quote' && (
        <div style={{ padding: '0 20px 20px' }}>
          <div className="pub-cta">
            <div className="total-mini">
              <div className="k">Total do orçamento</div>
              <div className="v">{formatMoney(quote?.total ?? '0')}</div>
            </div>
            <div className="actions">
              <button
                className="btn-reject"
                onClick={() => {
                  /* reject flow TBD */
                }}
              >
                Recusar
              </button>
              <button className="btn-accept" onClick={() => setPageState('show_form')}>
                Revisar e aprovar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
