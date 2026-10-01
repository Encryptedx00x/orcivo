import { z } from 'zod';

/** Query shared by web and API for cursor-based in-app activity feed pages. */
export const NotificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
});
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

/** A user-facing projection of an audit event; audit metadata is never exposed wholesale. */
export const InAppNotificationSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  human_text: z.string(),
  created_at: z.string().datetime(),
  read_at: z.string().datetime().nullable(),
});
export type InAppNotification = z.infer<typeof InAppNotificationSchema>;

export const InAppNotificationPageSchema = z.object({
  data: z.array(InAppNotificationSchema),
  next_cursor: z.string().uuid().nullable(),
  unread_count: z.number().int().nonnegative(),
});
export type InAppNotificationPage = z.infer<typeof InAppNotificationPageSchema>;
