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

export interface PaymentProviderSubscriptionInput {
  customerId: string;
  paymentMethod: PaymentMethod;
  amount: string;
  nextDueDate: string;
  billingCycle: BillingCycle;
  description?: string;
}

export interface PaymentProviderSubscription {
  id: string;
  status: string;
  customerId: string;
  amount: string;
  nextDueDate: string;
}

/**
 * Contract implemented by each billing integration. Adding a provider only
 * requires an adapter and an explicit composition-root binding; this contract
 * does not activate, configure, or select any future provider.
 */
export interface PaymentProvider {
  readonly provider: string;

  createCustomer(input: PaymentProviderCustomerInput): Promise<PaymentProviderCustomer>;
  createSubscription(
    input: PaymentProviderSubscriptionInput,
  ): Promise<PaymentProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  getSubscription(providerSubscriptionId: string): Promise<PaymentProviderSubscription>;
}
