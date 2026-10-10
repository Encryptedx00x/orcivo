import { z } from 'zod';

export const AppointmentTypeSchema = z.enum([
  'VISITA',
  'INSTALACAO',
  'ORCAMENTO',
  'MANUTENCAO',
  'REUNIAO',
  'OUTRO',
]);
export const AppointmentStatusSchema = z.enum(['UNCONFIRMED', 'SCHEDULED', 'COMPLETED']);
export const AppointmentPeriodSchema = z.enum([
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'BUSINESS_HOURS',
]);
export const AppointmentRecurrenceSchema = z.enum(['WEEKLY', 'MONTHLY', 'CUSTOM_MONTHS']);
export const AppointmentReminderMinutesSchema = z.union([
  z.literal(5),
  z.literal(15),
  z.literal(30),
  z.literal(60),
  z.literal(1440),
]);

const MONEY = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Use um valor decimal, como "180.00"');

export const AppointmentCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    type: AppointmentTypeSchema.optional(),
    status: AppointmentStatusSchema.optional(),
    customer_id: z.string().uuid().optional(),
    work_order_id: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().optional(),
    schedule_period: AppointmentPeriodSchema.optional(),
    reminder_minutes: AppointmentReminderMinutesSchema.optional(),
    recurrence_type: AppointmentRecurrenceSchema.optional(),
    recurrence_interval: z.number().int().min(2).max(24).optional(),
    recurrence_amount: MONEY.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.ends_at && new Date(value.ends_at) < new Date(value.starts_at)) {
      ctx.addIssue({ code: 'custom', path: ['ends_at'], message: 'Fim deve ser após o início' });
    }
    if (value.recurrence_type && (!value.customer_id || !value.recurrence_amount)) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrence_type'],
        message: 'Recorrência exige cliente e valor da cobrança',
      });
    }
    if (value.recurrence_type === 'CUSTOM_MONTHS' && !value.recurrence_interval) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrence_interval'],
        message: 'Informe o intervalo em meses',
      });
    }
  });

export const AppointmentUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    type: AppointmentTypeSchema.optional(),
    status: AppointmentStatusSchema.optional(),
    customer_id: z.string().uuid().nullable().optional(),
    work_order_id: z.string().uuid().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    starts_at: z.string().datetime().optional(),
    ends_at: z.string().datetime().nullable().optional(),
    schedule_period: AppointmentPeriodSchema.nullable().optional(),
    reminder_minutes: AppointmentReminderMinutesSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Informe pelo menos um campo para atualizar',
  });

export const AppointmentListQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AppointmentCreateDto = z.infer<typeof AppointmentCreateSchema>;
export type AppointmentUpdateDto = z.infer<typeof AppointmentUpdateSchema>;
export type AppointmentListQueryDto = z.infer<typeof AppointmentListQuerySchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type AppointmentPeriod = z.infer<typeof AppointmentPeriodSchema>;
export type AppointmentRecurrence = z.infer<typeof AppointmentRecurrenceSchema>;
