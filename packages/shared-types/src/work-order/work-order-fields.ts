import { z } from 'zod';

/**
 * Extra OS fields a company can turn on for its segment (Configurações → Campos da OS).
 * Values are short texts stored in `work_orders.details`; money never goes here.
 */
export const WORK_ORDER_FIELDS = {
  equipment: { label: 'Equipamento', placeholder: 'Ex.: ar-condicionado split' },
  brand: { label: 'Marca', placeholder: 'Ex.: LG' },
  model: { label: 'Modelo', placeholder: 'Ex.: S4-Q12JA3WF' },
  serial_number: { label: 'Nº de série', placeholder: 'Ex.: 412KAXY0B123' },
  capacity: { label: 'Capacidade', placeholder: 'Ex.: 12.000 BTUs' },
  voltage: { label: 'Tensão', placeholder: 'Ex.: 220 V' },
  reported_defect: { label: 'Defeito relatado', placeholder: 'Ex.: não gela e pinga água' },
  location: { label: 'Local / ambiente', placeholder: 'Ex.: quarto do casal' },
  start_time: { label: 'Hora de início', placeholder: 'Ex.: 08:30' },
  end_time: { label: 'Hora de término', placeholder: 'Ex.: 11:00' },
} as const;
export type WorkOrderField = keyof typeof WORK_ORDER_FIELDS;
const FIELD_KEYS = Object.keys(WORK_ORDER_FIELDS) as [WorkOrderField, ...WorkOrderField[]];

/** Ready-made field sets offered in Configurações. */
export const WORK_ORDER_FIELD_PRESETS: Record<string, { label: string; fields: WorkOrderField[] }> =
  {
    AR_CONDICIONADO: {
      label: 'Ar-condicionado',
      fields: [
        'equipment',
        'brand',
        'model',
        'capacity',
        'serial_number',
        'reported_defect',
        'location',
      ],
    },
    ELETRICA: {
      label: 'Elétrica',
      fields: ['voltage', 'reported_defect', 'location', 'start_time', 'end_time'],
    },
    CFTV: {
      label: 'Câmeras e segurança',
      fields: ['equipment', 'brand', 'model', 'location', 'reported_defect'],
    },
    PORTOES: {
      label: 'Portões automáticos',
      fields: ['equipment', 'brand', 'model', 'reported_defect'],
    },
  };

export const WorkOrderFieldListSchema = z.array(z.enum(FIELD_KEYS)).max(FIELD_KEYS.length);
export const WorkOrderDetailsSchema = z
  .record(z.enum(FIELD_KEYS), z.string().trim().max(300))
  .refine((d) => Object.keys(d).length <= FIELD_KEYS.length);
export type WorkOrderDetails = Partial<Record<WorkOrderField, string>>;

/** Filled fields, in catalog order, ready to print. */
export function describeWorkOrderDetails(
  details: WorkOrderDetails | null | undefined,
): Array<{ label: string; value: string }> {
  if (!details) return [];
  return FIELD_KEYS.filter((k) => details[k]?.trim()).map((k) => ({
    label: WORK_ORDER_FIELDS[k].label,
    value: details[k]!.trim(),
  }));
}
