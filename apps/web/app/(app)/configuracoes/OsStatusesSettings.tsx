'use client';

import { useState } from 'react';
import { WORK_ORDER_EXTRA_STATUSES, type WorkOrderExtraStatus } from '@orcivo/shared-types';
import { updateWorkOrderStatuses } from './actions';

const EXTRA_KEYS = Object.keys(WORK_ORDER_EXTRA_STATUSES) as WorkOrderExtraStatus[];

/** Descrição de cada extra (copy de UI) — labels vêm do shared-types (regra única). */
const EXTRA_DESCRIPTIONS: Record<WorkOrderExtraStatus, string> = {
  AWAITING_PAYMENT:
    'Depois de concluir, a OS fica como Aguardando pagamento até você registrar o recebimento.',
  WARRANTY: 'Depois de concluir, dá para marcar a OS como Em garantia quando o cliente acionar.',
};

/** Configurações → Ordem de serviço: status extras ligados para a empresa (R5b). */
export function OsStatusesSettings({
  initial,
}: {
  initial: WorkOrderExtraStatus[];
}): React.JSX.Element {
  const [statuses, setStatuses] = useState<WorkOrderExtraStatus[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const toggle = (k: WorkOrderExtraStatus) =>
    setStatuses((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function save() {
    setBusy(true);
    setMsg('');
    setError('');
    const r = await updateWorkOrderStatuses(statuses);
    setBusy(false);
    if (r.ok) setMsg('Status salvos.');
    else setError(r.message);
  }

  return (
    <div className="ov-card ov-card-body" style={{ padding: 24, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>Status extras da OS</h3>
      <div style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
        Ligue os status que sua empresa usa depois de concluir uma ordem de serviço. Desligar não
        mexe nas OS existentes — só esconde a ação daqui pra frente.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680 }}>
        {EXTRA_KEYS.map((k) => {
          const on = statuses.includes(k);
          return (
            <label
              key={k}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 14px',
                border: `1.5px solid ${on ? '#6D28D9' : '#E2E8F0'}`,
                borderRadius: 10,
                cursor: 'pointer',
                backgroundColor: on ? '#F5F3FF' : '#fff',
                transition: 'border-color 0.12s',
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => {
                  setMsg('');
                  toggle(k);
                }}
                style={{ marginTop: 2, accentColor: '#6D28D9', width: 16, height: 16 }}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0A0A0F' }}>
                  {WORK_ORDER_EXTRA_STATUSES[k].label}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                  {EXTRA_DESCRIPTIONS[k]}
                </p>
              </div>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" style={{ color: '#B91C1C', fontSize: 14, margin: '12px 0 0' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
        <button
          type="button"
          className="ov-btn ov-btn-primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Salvando…' : 'Salvar status'}
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
