import { z } from 'zod';

export const AppointmentTypeEnum = z.enum([
  'VISITA',
  'INSTALACAO',
  'ORCAMENTO',
  'MANUTENCAO',
  'REUNIAO',
  'OUTRO',
]);

export const AppointmentCreateSchema = z
  .object({
    title: z.string().min(1).max(160),
    type: AppointmentTypeEnum.optional(),
    customer_id: z.string().uuid().optional(),
    work_order_id: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().optional(),
  })
  .refine((v) => !v.ends_at || new Date(v.ends_at) >= new Date(v.starts_at), {
    message: 'ends_at deve ser maior ou igual a starts_at',
    path: ['ends_at'],
  });
export type AppointmentCreateDto = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentListQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AppointmentListQueryDto = z.infer<typeof AppointmentListQuerySchema>;
