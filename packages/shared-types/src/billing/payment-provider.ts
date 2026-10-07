/**
 * Provider-neutral boundary for recurring Orcivo subscriptions.
 *
 * Providers own the translation between these terms and their HTTP API/SDK.
 * Amounts intentionally remain decimal strings so the domain never performs
 * money calculations with floating-point values.
 */
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export type PaymentMethod = 'BOLETO' | 'CREDIT_CARD' | 'PIX';

export interface PaymentProviderCustomerInput {
  name: string;
  email?: string;
  document?: string;
}

export interface PaymentProviderCustomer {
  id: string;
}

/**
 * Provider-neutral lifecycle of a gateway-side subscription/charge.
 * Providers normalize their native statuses into this set; the domain maps
 * it onto its persisted SubscriptionStatus.
 */
export const PROVIDER_SUBSCRIPTION_STATUSES = [
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'BLOCKED',
  'CANCELED',
] as const;
export type ProviderSubscriptionStatus = (typeof PROVIDER_SUBSCRIPTION_STATUSES)[number];

export interface PaymentProviderSubscriptionInput {
  customerId: string;
  paymentMethod: PaymentMethod;
  amount: string;
  nextDueDate: string;
  billingCycle: BillingCycle;
  description?: string;
  /** Payer e-mail (required for recurring card subscriptions). */
  payerEmail?: string;
  /** Card token generated client-side (transparent checkout). */
  cardTokenId?: string;
  /** Internal reference echoed back by the provider (e.g. company id). */
  externalReference?: string;
}

/** One-off PIX charge data (QR code + copy-and-paste) for a single cycle. */
export interface PaymentProviderPixCharge {
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  /** ISO 8601 instant after which the PIX can no longer be paid. */
  expiresAt?: string;
}

export interface PaymentProviderSubscription {
  id: string;
  /** Provider-normalized status (see ProviderSubscriptionStatus) when the provider supports it. */
  status: string;
  customerId: string;
  amount: string;
  nextDueDate: string;
  /** RECURRING = provider-side recurring subscription; ONE_OFF = single-cycle charge. */
  kind?: 'RECURRING' | 'ONE_OFF';
  /** Present when the subscription must be authorized in a hosted checkout. */
  checkoutUrl?: string;
  /** Present on PIX charges. */
  pix?: PaymentProviderPixCharge;
}

/**
 * Contract implemented by each billing integration. Adding a provider only
 * requires an adapter and an explicit composition-root binding; this contract
 * does not activate, configure, or select any future provider.
 */
export interface PaymentProvider {
  readonly provider: string;

  createCustomer(input: PaymentProviderCustomerInput): Promise<PaymentProviderCustomer>;
  createSubscription(input: PaymentProviderSubscriptionInput): Promise<PaymentProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  getSubscription(providerSubscriptionId: string): Promise<PaymentProviderSubscription>;
}
