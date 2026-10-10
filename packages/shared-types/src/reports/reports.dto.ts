import { z } from 'zod';

export const ReportPeriodQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const DataExportEntitySchema = z.enum([
  'customers',
  'quotes',
  'work_orders',
  'payments',
  'expenses',
]);

export const DataExportQuerySchema = z.object({
  entity: DataExportEntitySchema,
});

export type ReportPeriodQueryDto = z.infer<typeof ReportPeriodQuerySchema>;
export type DataExportEntity = z.infer<typeof DataExportEntitySchema>;
export type DataExportQueryDto = z.infer<typeof DataExportQuerySchema>;

export const HomeShortcutSchema = z.enum([
  'CUSTOMER',
  'QUOTE',
  'WORK_ORDER',
  'APPOINTMENT',
  'PAYMENT',
  'CATALOG_ITEM',
]);

export const HomeShortcutsSchema = z.object({
  shortcuts: z.array(HomeShortcutSchema).min(1).max(6),
});

export type HomeShortcut = z.infer<typeof HomeShortcutSchema>;
export type HomeShortcutsDto = z.infer<typeof HomeShortcutsSchema>;

export const DEFAULT_HOME_SHORTCUTS: HomeShortcut[] = [
  'CUSTOMER',
  'QUOTE',
  'WORK_ORDER',
  'APPOINTMENT',
  'PAYMENT',
  'CATALOG_ITEM',
];

export const CUSTOMER_ORIGIN_LABELS: Record<string, string> = {
  INDICATION: 'Indicação',
  INSTAGRAM: 'Instagram',
  GOOGLE: 'Google',
  FACEBOOK: 'Facebook',
  OTHER: 'Outro',
  UNKNOWN: 'Não informado',
};
