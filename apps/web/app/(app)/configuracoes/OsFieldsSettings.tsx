'use client';

import { useState } from 'react';
import {
  WORK_ORDER_FIELD_PRESETS,
  WORK_ORDER_FIELDS,
  type WorkOrderField,
} from '@orcivo/shared-types';
import { updateWorkOrderFields } from './actions';

const KEYS = Object.keys(WORK_ORDER_FIELDS) as WorkOrderField[];

/** Configurações → Ordem de serviço: which segment fields show up on every OS. */
export function OsFieldsSettings({ initial }: { initial: WorkOrderField[] }): React.JSX.Element {
  const [fields, setFields] = useState<WorkOrderField[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const toggle = (k: WorkOrderField) =>
    setFields((f) =>
      f.includes(k) ? f.filter((x) => x !== k) : KEYS.filter((x) => x === k || f.includes(x)),
    );

  async function save() {
    setBusy(true);
    setMsg('');
    setError('');
    const r = await updateWorkOrderFields(fields);
    setBusy(false);
    if (r.ok) setMsg('Campos salvos.');
    else setError(r.message);
  }

  return (
    <div className="ov-card ov-card-body" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Campos da OS</h3>
      <div style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
        Escolha o que aparece para preencher em toda ordem de serviço. Comece por um modelo do seu
        ramo e ajuste.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {Object.entries(WORK_ORDER_FIELD_PRESETS).map(([id, p]) => (
          <button
            key={id}
            type="button"
            className="ov-btn ov-btn-secondary"
            onClick={() => setFields(KEYS.filter((k) => p.fields.includes(k)))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {KEYS.map((k) => (
          <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={fields.includes(k)}
              onChange={() => toggle(k)}
              style={{ width: 18, height: 18, accentColor: '#6D28D9' }}
            />
            {WORK_ORDER_FIELDS[k].label}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" style={{ color: '#B91C1C', fontSize: 14, margin: '0 0 8px' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          className="ov-btn ov-btn-primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Salvando…' : 'Salvar campos'}
        </button>
        {msg && (
          <span role="status" style={{ color: '#15803D', fontSize: 14 }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
