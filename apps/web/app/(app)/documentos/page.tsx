'use client';
import { useState } from 'react';
import { FileText, MessageCircle, MoreHorizontal } from 'lucide-react';

const TABS = [
  { id: 'orc', label: 'Orçamentos',        count: 32 },
  { id: 'os',  label: 'Ordens de Serviço', count: 42 },
  { id: 'rec', label: 'Recibos',           count: 28 },
  { id: 'rel', label: 'Relatórios',        count: 14 },
  { id: 'con', label: 'Contratos',         count: 8  },
];

type StatusKey = 'sent' | 'viewed' | 'approved' | 'rejected' | 'draft' | 'issued' | 'generated' | 'active';
const STATUS_PILLS: Record<StatusKey, { label: string; bg: string; color: string }> = {
  sent:      { label: 'Enviado',     bg: '#E0F2FE', color: '#075985' },
  viewed:    { label: 'Visualizado', bg: '#DCFCE7', color: '#166534' },
  approved:  { label: 'Aprovado',    bg: '#DCFCE7', color: '#166534' },
  rejected:  { label: 'Rejeitado',   bg: '#FEE2E2', color: '#991B1B' },
  draft:     { label: 'Rascunho',    bg: '#F1F5F9', color: '#334155' },
  issued:    { label: 'Emitido',     bg: '#DCFCE7', color: '#166534' },
  generated: { label: 'Gerado',      bg: '#F1F5F9', color: '#334155' },
  active:    { label: 'Ativo',       bg: '#DCFCE7', color: '#166534' },
};

function Pill({ k }: { k: StatusKey }) {
  const s = STATUS_PILLS[k] ?? STATUS_PILLS.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 9999, background: s.bg, color: s.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

type Row = [string, string, string, string, StatusKey];

const ROWS: Record<string, Row[]> = {
  orc: [
    ['ORÇ #248', 'Construtora Vila Nova', '14/05/2026', '148 KB', 'sent'],
    ['ORÇ #247', 'Ana Souza',            '12/05/2026', '132 KB', 'approved'],
    ['ORÇ #244', 'Ana Souza',            '28/04/2026', '140 KB', 'rejected'],
    ['ORÇ #243', 'Luiz Henrique',        '25/04/2026', '135 KB', 'approved'],
  ],
  os: [
    ['OS #1024', 'Mercado São João',      '14/05/2026', '210 KB', 'draft'],
    ['OS #1021', 'Padaria Quatro Cantos', '13/05/2026', '195 KB', 'sent'],
    ['OS #1019', 'Construtora Vila Nova', '10/05/2026', '220 KB', 'sent'],
    ['OS #1018', 'Mercado São João',      '09/05/2026', '180 KB', 'viewed'],
  ],
  rec: [
    ['REC #88', 'Ana Souza',            '10/05/2026', '95 KB',  'issued'],
    ['REC #87', 'Padaria Quatro Cantos','03/05/2026', '92 KB',  'issued'],
    ['REC #86', 'Luiz Henrique',        '30/04/2026', '88 KB',  'issued'],
  ],
  rel: [
    ['REL-mai', 'Mensal Maio 2026',  '01/06/2026', '320 KB', 'generated'],
    ['REL-abr', 'Mensal Abril 2026', '01/05/2026', '290 KB', 'generated'],
  ],
  con: [
    ['CON #12', 'Mercado São João',      '10/05/2026', '145 KB', 'active'],
    ['CON #11', 'Construtora Vila Nova', '02/04/2026', '138 KB', 'active'],
    ['CON #10', 'Ana Souza',             '14/03/2026', '120 KB', 'active'],
  ],
};

function PdfThumb() {
  return (
    <div style={{ width: 30, height: 36, borderRadius: 5, background: 'linear-gradient(180deg, #FEE2E2, #FECACA)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
      PDF
    </div>
  );
}

export default function DocumentosPage(): JSX.Element {
  const [tab, setTab] = useState('orc');

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Documentos</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>124 documentos gerados</div>
        </div>
        <button className="ov-btn ov-btn-outline"><FileText size={16} />Exportar lote</button>
      </div>

      {/* Tabs */}
      <div className="ov-tabs">
        {TABS.map(t => (
          <div key={t.id} className={`ov-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9, background: tab === t.id ? '#EDE9FE' : '#F1F5F9', color: tab === t.id ? '#4C1D95' : '#334155' }}>
              {t.count}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <table className="ov-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Número</th>
              <th>Cliente / Descrição</th>
              <th>Gerado em</th>
              <th>Tamanho</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(ROWS[tab] ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#64748B', padding: '40px 16px', fontSize: 14 }}>
                  Nenhum documento encontrado.
                </td>
              </tr>
            ) : (
              (ROWS[tab] ?? []).map(([num, client, date, size, status], i) => (
                <tr key={i}>
                  <td style={{ paddingRight: 0 }}><PdfThumb /></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#6D28D9', fontSize: 13 }}>{num}</td>
                  <td style={{ fontWeight: 500 }}>{client}</td>
                  <td className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{date}</td>
                  <td className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{size}</td>
                  <td><Pill k={status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button style={iconBtn} title="Download PDF">
                        <FileText size={14} />
                      </button>
                      <button style={iconBtn} title="Enviar via WhatsApp">
                        <MessageCircle size={14} />
                      </button>
                      <button style={iconBtn} title="Mais opções">
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, padding: 0, fontFamily: 'inherit' };
