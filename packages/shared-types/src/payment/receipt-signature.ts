import { z } from 'zod';

/** Choice shown when attaching a signature to a generated receipt. */
export const ReceiptSignatureModeEnum = z.enum(['NONE', 'SAVED', 'ONCE']);
export type ReceiptSignatureMode = z.infer<typeof ReceiptSignatureModeEnum>;

/**
 * JSON endpoint accepts the current explicit mode and the legacy boolean so
 * installed clients can upgrade without losing the receipt flow.
 * ONCE is intentionally multipart and has its own endpoint.
 */
export const ReceiptSignatureUpdateSchema = z.union([
  z.object({ mode: z.enum(['NONE', 'SAVED']) }),
  z.object({ apply: z.boolean() }),
]);
export type ReceiptSignatureUpdate = z.infer<typeof ReceiptSignatureUpdateSchema>;

export function receiptSignatureShouldApply(input: ReceiptSignatureUpdate): boolean {
  return 'mode' in input ? input.mode === 'SAVED' : input.apply;
}
