'use client';

import {
  WORK_ORDER_FIELDS,
  type WorkOrderDetails,
  type WorkOrderField,
} from '@orcivo/shared-types';

/** Inputs for the company's active OS fields (Configurações → Ordem de serviço). */
export function OsDetailsFields({
  fields,
  value,
  onChange,
}: {
  fields: WorkOrderField[];
  value: WorkOrderDetails;
  onChange: (v: WorkOrderDetails) => void;
}): React.JSX.Element | null {
  if (!fields.length) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
        gap: 12,
      }}
    >
      {fields.map((k) => (
        <div key={k}>
          <label className="ov-label" htmlFor={`os-${k}`}>
            {WORK_ORDER_FIELDS[k].label}
          </label>
          <input
            id={`os-${k}`}
            className="ov-input"
            maxLength={300}
            placeholder={WORK_ORDER_FIELDS[k].placeholder}
            value={value[k] ?? ''}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

/** Drops empty values so the API stores only what was filled. */
export function cleanDetails(v: WorkOrderDetails): WorkOrderDetails {
  return Object.fromEntries(
    Object.entries(v).filter(([, s]) => typeof s === 'string' && s.trim()),
  ) as WorkOrderDetails;
}
