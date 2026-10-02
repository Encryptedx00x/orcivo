import { createHmac, timingSafeEqual } from 'crypto';

export interface MercadoPagoSignatureInput {
  /** Raw `x-signature` header: `ts=<epoch>,v1=<hex hmac>`. */
  signature: string | undefined;
  /** `x-request-id` header. */
  requestId: string | undefined;
  /** `data.id` query parameter of the notification URL. */
  dataId: string | undefined;
  /** Webhook secret configured in the MP dashboard. */
  secret: string;
}

/**
 * Validates the Mercado Pago webhook signature (official scheme):
 * HMAC-SHA256 (hex) over `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * keyed with the webhook secret. `data.id` is lower-cased when alphanumeric.
 * Fails closed: any missing piece (including the secret) is an invalid signature.
 */
export function isValidMercadoPagoSignature(input: MercadoPagoSignatureInput): boolean {
  const { signature, requestId, dataId, secret } = input;
  if (!secret || !signature || !requestId || !dataId) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of signature.split(',')) {
    const [key, ...rest] = part.split('=');
    const value = rest.join('=').trim();
    if (key.trim() === 'ts') ts = value;
    else if (key.trim() === 'v1') v1 = value;
  }
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const received = Buffer.from(v1, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return received.length === wanted.length && timingSafeEqual(received, wanted);
}
