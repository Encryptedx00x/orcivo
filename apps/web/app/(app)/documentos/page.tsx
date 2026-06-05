'use client';
import { useState } from 'react';
import { FileText, Download } from 'lucide-react';

const TABS = [
  { id: 'orc', label: 'Orçamentos', count: 32 },
  { id: 'os',  label: 'Ordens de Serviço', count: 42 },
  { id: 'rec', label: 'Recibos', count: 28 },
  { id: 'rel', label: 'Relatórios', count: 14 },
];

const ROWS: Record<string, [string, string, string, string, string][]> = {
  orc: [
    ['ORÇ #248', 'Construtora Vila Nova', '14/05/2026', '148 KB', 'Enviado'],
    ['ORÇ #247', 'Ana Souza',            '12/05/2026', '132 KB', 'Aprovado'],
    ['ORÇ #244', 'Ana Souza',            '28/04/2026', '140 KB', 'Rejeitado'],
    ['ORÇ #243', 'Luiz Henrique',        '25/04/2026', '135 KB', 'Aprovado'],
  ],
  os: [
    ['OS #1024', 'Mercado São João',     '14/05/2026', '210 KB', 'Em execução'],
    ['OS #1021', 'Padaria Quatro Cantos','13/05/2026', '195 KB', 'Finalizado'],
    ['OS #1019', 'Construtora Vila Nova','10/05/2026', '220 KB', 'Finalizado'],
    ['OS #1018', 'Mercado São João',     '09/05/2026', '180 KB', 'Finalizado'],
  ],
  rec: [
    ['REC #88', 'Ana Souza',            '10/05/2026', '95 KB',  'Emitido'],
    ['REC #87', 'Padaria Quatro Cantos','03/05/2026', '92 KB',  'Emitido'],
    ['REC #86', 'Luiz Henrique',        '30/04/2026', '88 KB',  'Emitido'],
  ],
  rel: [
    ['REL-mai', 'Mensal Maio 2026',     '01/06/2026', '320 KB', 'Gerado'],
    ['REL-abr', 'Mensal Abril 2026',    '01/05/2026', '290 KB', 'Gerado'],
  ],
};

export default function DocumentosPage(): JSX.Element {
  const [tab, setTab] = useState('orc');

  return (
    <div>
      <div className="ov-page-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0F', margin: 0 }}>Documentos</h1>
          <div style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>PDFs gerados</div>
        </div>
        <button className="ov-btn ov-btn-outline"><FileText size={16} />Exportar lote</button>
      </div>

      {/* Tabs */}
      <div className="ov-tabs">
        {TABS.map(t => (
          <div key={t.id} className={`ov-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>{t.count}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="ov-card" style={{ overflow: 'hidden' }}>
        <table className="ov-table">
          <thead>
            <tr>
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
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B', padding: '40px 16px', fontSize: 14 }}>
                  Nenhum documento encontrado.
                </td>
              </tr>
            ) : (
              (ROWS[tab] ?? []).map(([num, client, date, size, status], i, a) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#6D28D9', fontSize: 13, borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                    {num}
                  </td>
                  <td style={{ fontWeight: 500, borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                    {client}
                  </td>
                  <td className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                    {date}
                  </td>
                  <td className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                    {size}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B', borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                    {status}
                  </td>
                  <td style={{ textAlign: 'right', borderBottom: i < a.length - 1 ? '1px solid #F1F5F9' : 0 }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'inline-flex', padding: 4 }}>
                      <Download size={15} />
                    </button>
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
