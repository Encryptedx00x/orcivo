'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import {
  WORK_ORDER_FIELDS,
  type WorkOrderDetails,
  type WorkOrderField,
} from '@orcivo/shared-types';
import { OsDetailsFields, cleanDetails } from '../../../../components/OsDetailsFields';
import { saveWorkOrderDetails } from '../actions';

/** Segment fields of the OS: shows what was filled; editable while the OS is open. */
export function OsDetailsCard({
  id,
  fields,
  initial,
  editable,
}: {
  id: string;
  fields: WorkOrderField[];
  initial: WorkOrderDetails;
  editable: boolean;
}): React.JSX.Element | null {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<WorkOrderDetails>(initial);
  const [value, setValue] = useState<WorkOrderDetails>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Active fields plus any filled one that was later turned off.
  const shown = (Object.keys(WORK_ORDER_FIELDS) as WorkOrderField[]).filter(
    (k) => fields.includes(k) || saved[k],
  );
  if (!shown.length) return null;

  async function save() {
    setBusy(true);
    setError('');
    const clean = cleanDetails(value);
    const r = await saveWorkOrderDetails(id, clean as Record<string, string>);
    setBusy(false);
    if (r.error) return setError(r.error);
    setSaved(clean);
    setEditing(false);
  }

  return (
    <div className="ov-card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div
          style={{
            flex: 1,
            fontSize: 11,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}
        >
          Dados do equipamento
        </div>
        {editable && !editing && (
          <button
            type="button"
            className="ov-btn ov-btn-secondary"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={() => setEditing(true)}
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <OsDetailsFields fields={shown} value={value} onChange={setValue} />
          {error && (
            <p role="alert" style={{ color: '#B91C1C', fontSize: 13, margin: 0 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="ov-btn ov-btn-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              className="ov-btn ov-btn-secondary"
              onClick={() => {
                setValue(saved);
                setEditing(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))',
            gap: '10px 16px',
            margin: 0,
          }}
        >
          {shown.map((k) => (
            <div key={k}>
              <dt style={{ fontSize: 12, color: '#64748B' }}>{WORK_ORDER_FIELDS[k].label}</dt>
              <dd style={{ margin: '2px 0 0', fontSize: 14, color: '#0A0A0F' }}>
                {saved[k]?.trim() || '—'}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
