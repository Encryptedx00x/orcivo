'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Eye, MessageCircle, Plus, Search, X } from 'lucide-react';
import { formatMoney, sumDecimal } from '@orcivo/shared-types';
import {
  RECEIPT_METHODS,
  methodLabel,
  receiptDate,
  receiptNo,
  receiptOrigin,
  receiptPdfUrl,
  shareReceipt,
  type Receipt,
} from '../../../lib/receipts';
import { ReceiptPaper } from '../../../components/ReceiptPaper';
import {
  createReceipt,
  getReceipt,
  listReceipts,
  receiptCompany,
  receiptFormData,
  setReceiptSignature,
  type LinkOption,
  type ReceiptCompany,
} from './receipt-actions';

const PERIODS = [
  { value: 'month', label: 'Este mês' },
  { value: 'last', label: 'Mês passado' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'year', label: 'Este ano' },
  { value: 'all', label: 'Tudo' },
];

function inPeriod(iso: string, period: string): boolean {
  if (period === 'all') return true;
  const d = new Date(iso);
  const now = new Date();
  if (period === 'month')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === 'last') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
  }
  if (period === '3m') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return d.getFullYear() === now.getFullYear();
}

const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #E2E8F0',
  cursor: 'pointer',
  color: '#475569',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 8,
  padding: 0,
};

/** Documentos › Recibos (modo completo). */
export function ReceiptsTab({ onCount }: { onCount?: (n: number) => void }): React.JSX.Element {
  const search = useSearchParams();
  const [rows, setRows] = useState<Receipt[] | null>(null);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<ReceiptCompany | null>(null);
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('all');
  const [method, setMethod] = useState('all');
  const [openId, setOpenId] = useState<string | null>(search.get('recibo'));
  const [creating, setCreating] = useState(search.get('novo-recibo') === '1');

  const load = useCallback(async () => {
    const r = await listReceipts();
    if (!r.ok) return setError(r.message);
    setError('');
    setRows(r.data);
    onCount?.(r.data.length);
  }, [onCount]);

  useEffect(() => {
    void load();
    void receiptCompany().then((r) => r.ok && setCompany(r.data));
  }, [load]);

  const list = useMemo(() => {
    const qq = norm(q.trim());
    return (rows ?? []).filter(
      (r) =>
        (!qq || norm(r.customer.name).includes(qq) || receiptNo(r.receipt_number).includes(qq)) &&
        (method === 'all' || r.method === method) &&
        inPeriod(r.paid_at ?? r.created_at, period),
    );
  }, [rows, q, period, method]);
  const total = list.length ? sumDecimal(list.map((r) => r.amount)) : '0.00';

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div className="ov-search" style={{ gridColumn: '1 / -1' }}>
          <Search size={16} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente ou nº"
            aria-label="Buscar recibo por cliente ou número"
          />
        </div>
        <select
          className="ov-input"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Período"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              Período: {p.label.toLowerCase()}
            </option>
          ))}
        </select>
        <select
          className="ov-input"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          aria-label="Forma de pagamento"
        >
          <option value="all">Método: todos</option>
          {RECEIPT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              Método: {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ov-btn ov-btn-primary"
          style={{ justifyContent: 'center' }}
          onClick={() => setCreating(true)}
        >
          <Plus size={16} aria-hidden="true" /> Novo recibo
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: '#B91C1C', fontSize: 14 }}>
          {error}{' '}
          <button type="button" className="ov-btn ov-btn-ghost" onClick={() => void load()}>
            Tentar de novo
          </button>
        </div>
      )}
      {!rows && !error && (
        <div style={{ color: '#64748B', fontSize: 14, padding: 24 }}>Carregando recibos…</div>
      )}
      {rows && list.length === 0 && (
        <div style={{ color: '#64748B', fontSize: 14, padding: '40px 8px', textAlign: 'center' }}>
          {rows.length === 0
            ? 'Nenhum recibo ainda. O recibo aparece quando você marca um recebimento como pago — ou crie um agora.'
            : 'Nenhum recibo com esses filtros.'}
        </div>
      )}
      {list.length > 0 && (
        <>
          <table className="ov-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente · origem · método</th>
                <th>Data</th>
                <th className="num">Valor</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    <button
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      style={{
                        background: 'none',
                        border: 0,
                        padding: 0,
                        font: 'inherit',
                        color: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      nº {receiptNo(r.receipt_number)}
                    </button>
                  </td>
                  <td data-label="Cliente">
                    <div style={{ fontWeight: 600, color: '#0A0A0F' }}>{r.customer.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {receiptOrigin(r)} · {methodLabel(r.method)}
                    </div>
                  </td>
                  <td data-label="Data">{receiptDate(r)}</td>
                  <td data-label="Valor" className="num" style={{ fontWeight: 600 }}>
                    {formatMoney(r.amount)}
                  </td>
                  {/* On phones the row is a grid card: actions take their own full-width line. */}
                  <td data-label="Ações" style={{ gridColumn: '1 / -1' }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        style={iconBtn}
                        onClick={() => setOpenId(r.id)}
                        aria-label={`Ver recibo ${receiptNo(r.receipt_number)}`}
                        title="Ver"
                      >
                        <Eye size={16} />
                      </button>
                      <a
                        style={iconBtn}
                        href={receiptPdfUrl(r.id, true)}
                        aria-label={`Baixar PDF do recibo ${receiptNo(r.receipt_number)}`}
                        title="Baixar PDF"
                      >
                        <Download size={16} />
                      </a>
                      <button
                        type="button"
                        style={iconBtn}
                        onClick={async () => {
                          const full = await getReceipt(r.id);
                          await shareReceipt(full.ok ? full.data : r);
                        }}
                        aria-label={`Enviar recibo ${receiptNo(r.receipt_number)} no WhatsApp`}
                        title="Enviar no WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 13, color: '#64748B', textAlign: 'right' }}>
            {list.length} recibo{list.length === 1 ? '' : 's'} · total {formatMoney(total)}
          </div>
        </>
      )}

      {openId && (
        <ReceiptModal
          id={openId}
          company={company}
          onClose={() => setOpenId(null)}
          onChanged={() => void load()}
        />
      )}
      {creating && (
        <NewReceiptModal
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setCreating(false);
            void load();
            setOpenId(r.id);
          }}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  width = 560,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,15,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: width,
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{ ...iconBtn, border: 0 }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ReceiptModal({
  id,
  company,
  onClose,
  onChanged,
}: {
  id: string;
  company: ReceiptCompany | null;
  onClose: () => void;
  onChanged: () => void;
}): React.JSX.Element {
  const [r, setR] = useState<Receipt | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getReceipt(id).then((res) => (res.ok ? setR(res.data) : setErr(res.message)));
  }, [id]);

  const toggleSig = async () => {
    if (!r || busy) return;
    setBusy(true);
    const res = await setReceiptSignature(r.id, !r.receipt_signature_key);
    setBusy(false);
    if (!res.ok) return setErr(res.message);
    setErr('');
    setR(res.data);
    onChanged();
  };

  return (
    <Modal title={r ? `Recibo nº ${receiptNo(r.receipt_number)}` : 'Recibo'} onClose={onClose}>
      {!r && !err && <div style={{ color: '#64748B' }}>Carregando…</div>}
      {r && <ReceiptPaper receipt={r} company={company ?? { trade_name: '' }} />}
      {r && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={!!r.receipt_signature_key}
            disabled={busy}
            onChange={() => void toggleSig()}
          />
          Aplicar minha assinatura salva
        </label>
      )}
      {err && (
        <p role="alert" style={{ margin: 0, color: '#B91C1C', fontSize: 14 }}>
          {err}
        </p>
      )}
      {r && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a
            className="ov-btn ov-btn-outline"
            style={{ flex: '1 1 160px', justifyContent: 'center' }}
            href={receiptPdfUrl(r.id, true)}
          >
            <Download size={16} aria-hidden="true" /> Baixar PDF
          </a>
          <button
            type="button"
            className="ov-btn ov-btn-primary"
            style={{ flex: '1 1 160px', justifyContent: 'center' }}
            onClick={() => void shareReceipt(r)}
          >
            <MessageCircle size={16} aria-hidden="true" /> Enviar no WhatsApp
          </button>
        </div>
      )}
    </Modal>
  );
}

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const centsToDecimal = (digits: string) => {
  const n = digits.replace(/\D/g, '').replace(/^0+/, '') || '0';
  const padded = n.padStart(3, '0');
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`;
};

function NewReceiptModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (r: Receipt) => void;
}): React.JSX.Element {
  const [data, setData] = useState<{
    customers: Array<{ id: string; name: string }>;
    links: LinkOption[];
  } | null>(null);
  const [customer, setCustomer] = useState('');
  const [digits, setDigits] = useState('');
  const [method, setMethod] = useState('PIX');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    void receiptFormData().then((r) => (r.ok ? setData(r.data) : setErr(r.message)));
  }, []);

  const amount = centsToDecimal(digits);
  const links = (data?.links ?? []).filter((l) => l.customer_id === customer);
  const ok = !!customer && Number(amount) > 0 && !!paidOn;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    const chosen = links.find((l) => `${l.kind}:${l.id}` === link);
    const r = await createReceipt({
      customer_id: customer,
      amount,
      method,
      // noon local time keeps the chosen day in any timezone
      paid_at: new Date(`${paidOn}T12:00:00`).toISOString(),
      description,
      work_order_id: chosen?.kind === 'work_order' ? chosen.id : undefined,
      quote_id: chosen?.kind === 'quote' ? chosen.id : undefined,
    });
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onCreated(r.data);
  };

  return (
    <Modal title="Novo recibo" onClose={onClose}>
      <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>
        Cria um recebimento pago e gera o recibo em PDF. Vincular a uma OS ou orçamento é opcional.
      </p>
      <form
        onSubmit={submit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="ov-label">Cliente *</span>
          <select
            className="ov-input"
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setLink('');
            }}
            required
          >
            <option value="">{data ? 'Escolha o cliente' : 'Carregando…'}</option>
            {(data?.customers ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="ov-label">Valor *</span>
          <input
            className="ov-input"
            inputMode="numeric"
            value={digits ? formatMoney(amount) : ''}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="R$ 0,00"
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="ov-label">Método *</span>
          <select className="ov-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {RECEIPT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="ov-label">Pago em *</span>
          <input
            className="ov-input"
            type="date"
            value={paidOn}
            max={todayIso()}
            onChange={(e) => setPaidOn(e.target.value)}
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
          <span className="ov-label">Descrição</span>
          <input
            className="ov-input"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Troca de 2 tomadas"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
          <span className="ov-label">Vincular a OS ou orçamento</span>
          <select
            className="ov-input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={!customer}
          >
            <option value="">
              {customer
                ? links.length
                  ? 'Nenhum (opcional)'
                  : 'Este cliente não tem OS ou orçamento'
                : 'Escolha o cliente primeiro'}
            </option>
            {links.map((l) => (
              <option key={`${l.kind}:${l.id}`} value={`${l.kind}:${l.id}`}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13, color: '#64748B' }}>
          O valor também entra no Financeiro como recebido.
        </p>
        {err && (
          <p
            role="alert"
            style={{ gridColumn: '1 / -1', margin: 0, color: '#B91C1C', fontSize: 14 }}
          >
            {err}
          </p>
        )}
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" className="ov-btn ov-btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="ov-btn ov-btn-primary"
            disabled={!ok || busy}
            aria-busy={busy || undefined}
          >
            {busy ? 'Gerando…' : 'Gerar recibo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
