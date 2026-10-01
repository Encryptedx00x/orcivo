import { z } from 'zod';

// ADR-015 §4: an entity is required; callers cannot browse the whole tenant.
export const AuditQuerySchema = z.object({
  entity_type: z.enum(['customer', 'work_order', 'quote', 'payment']),
  entity_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;
