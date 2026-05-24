'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { approvalService, type PublicQuote } from '../../../lib/approval.service';
import { formatMoney } from '@orcivo/shared-types';
import { SignatureCanvas } from './SignatureCanvas';

type PageState = 'loading' | 'show_quote' | 'show_form' | 'approved' | 'error';
type ApproveTab = 'APPROVE_BUTTON' | 'TYPED_NAME' | 'DRAWN_SIGNATURE';

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
        return;
      }
      if (activeTab === 'DRAWN_SIGNATURE' && !signature) {
        setSubmitError('Por favor, desenhe sua assinatura.');
        return;
      }
      await approvalService.approveQuote(token, {
        approval_method: activeTab,
        typed_name: activeTab === 'TYPED_NAME' ? typedName.trim() : undefined,
        signature: activeTab === 'DRAWN_SIGNATURE' ? signature : undefined,
      });
      setPageState('approved');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Erro ao processar aprovação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }}>
      {/* Header mínimo com logo */}
      <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1a1a2e 0%, #6D28D9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7l-8-5z" fill="rgba(109,40,217,0.7)" stroke="#8B5CF6" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 17, color: '#0A0A0F', letterSpacing: '-0.01em' }}>Orcivo</span>
      </header>

      <main style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px' }}>

        {/* Loading */}
        {pageState === 'loading' && (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded w-32" />
          </div>
        )}

        {/* Erro */}
        {pageState === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-3 items-start">
            <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold text-red-800">Link inválido ou expirado</p>
              <p className="text-red-700 text-sm mt-1">
                {errorMsg || 'Este link de orçamento não é válido ou expirou.'}
              </p>
            </div>
          </div>
        )}

        {/* Exibir orçamento */}
        {(pageState === 'show_quote' || pageState === 'show_form') && quote && (
          <div className="space-y-6">
            {/* Cabeçalho do orçamento */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Orçamento de {quote.customer.name}</p>
              <h1 className="text-2xl font-bold text-gray-900">
                Orçamento #{quote.number}
                {quote.title ? ` — ${quote.title}` : ''}
              </h1>
              {quote.valid_until && (
                <p className="text-sm text-gray-500 mt-1">
                  Válido até{' '}
                  {new Date(quote.valid_until).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            {/* Tabela de itens */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Descrição</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Qtd</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Preço unit.</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quote.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-gray-800">{item.description}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatMoney(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totais */}
              <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 bg-gray-50">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(quote.subtotal)}</span>
                </div>
                {parseFloat(quote.discount_value) > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>
                      Desconto{' '}
                      {quote.discount_type === 'PERCENT'
                        ? `(${quote.discount_value}%)`
                        : ''}
                    </span>
                    <span>
                      {quote.discount_type === 'PERCENT'
                        ? `-${quote.discount_value}%`
                        : `-${formatMoney(quote.discount_value)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span style={{ color: '#6D28D9' }}>{formatMoney(quote.total)}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            {quote.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-gray-700">
                <p className="font-medium text-gray-800 mb-1">Observações</p>
                <p>{quote.notes}</p>
              </div>
            )}

            {/* Botão revisar */}
            {pageState === 'show_quote' && (
              <button
                onClick={() => setPageState('show_form')}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors"
                style={{ backgroundColor: '#6D28D9' }}
              >
                Revisar e aprovar
              </button>
            )}

            {/* Formulário de aprovação */}
            {pageState === 'show_form' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Como deseja aprovar?</h2>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                  {(
                    (
                    [
                      { key: 'APPROVE_BUTTON', label: 'Aprovação simples' },
                      { key: 'TYPED_NAME', label: 'Assinar com nome' },
                      { key: 'DRAWN_SIGNATURE', label: 'Assinar com desenho' },
                    ] as const
                  ).filter(tab => quote.company.allowed_approval_methods.includes(tab.key))
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? 'border-purple-600 text-purple-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Aba: Aprovação simples */}
                {activeTab === 'APPROVE_BUTTON' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Clique abaixo para confirmar sua aprovação deste orçamento.
                    </p>
                    <button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-white disabled:opacity-60 transition-colors"
                      style={{ backgroundColor: '#6D28D9' }}
                    >
                      {submitting ? 'Processando...' : 'Aprovar orçamento'}
                    </button>
                  </div>
                )}

                {/* Aba: Assinar com nome */}
                {activeTab === 'TYPED_NAME' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seu nome completo
                      </label>
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        placeholder="Digite seu nome completo"
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button
                      onClick={handleApprove}
                      disabled={submitting || !typedName.trim()}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-white disabled:opacity-60 transition-colors"
                      style={{ backgroundColor: '#6D28D9' }}
                    >
                      {submitting ? 'Processando...' : 'Aprovar e assinar'}
                    </button>
                  </div>
                )}

                {/* Aba: Assinar com desenho */}
                {activeTab === 'DRAWN_SIGNATURE' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Desenhe sua assinatura no campo abaixo:</p>
                    <SignatureCanvas onSign={setSignature} />
                    <button
                      onClick={handleApprove}
                      disabled={submitting || !signature}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-white disabled:opacity-60 transition-colors"
                      style={{ backgroundColor: '#6D28D9' }}
                    >
                      {submitting ? 'Processando...' : 'Aprovar com assinatura'}
                    </button>
                  </div>
                )}

                {/* Erro de submit */}
                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700 flex gap-2 items-start">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                    {submitError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aprovado */}
        {pageState === 'approved' && (
          <div className="text-center py-12 space-y-4">
            <CheckCircle size={64} className="mx-auto" style={{ color: '#16A34A' }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0F', margin: '0 auto' }}>Orçamento aprovado.</h1>
            <p style={{ color: '#64748B', maxWidth: 420, margin: '0 auto' }}>
              Sua aprovação foi registrada com sucesso. Em breve o técnico responsável entrará em contato.
            </p>
            <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 420, margin: '0 auto' }}>
              Uma ordem de serviço foi gerada automaticamente.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
