'use client';
import { useState } from 'react';
import { FileText } from 'lucide-react';

const TABS = [
  { id: 'orc', label: 'Orçamentos' },
  { id: 'os', label: 'Ordens de Serviço' },
  { id: 'rec', label: 'Recibos' },
  { id: 'rel', label: 'Relatórios' },
];

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
              <th>Cliente</th>
              <th>Gerado em</th>
              <th>Tamanho</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#64748B', padding: '32px 16px' }}>
                Nenhum documento encontrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
