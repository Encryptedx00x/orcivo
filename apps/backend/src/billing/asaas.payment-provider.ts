import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PaymentProvider,
  PaymentProviderCustomer,
  PaymentProviderCustomerInput,
  PaymentProviderSubscription,
  PaymentProviderSubscriptionInput,
} from '@orcivo/shared-types';

interface AsaasCustomerResponse {
  id: string;
}

interface AsaasSubscriptionResponse {
  id: string;
  status: string;
  customer: string;
  value: number;
  nextDueDate: string;
}

/**
 * Asaas-specific transport adapter. The billing domain only depends on the
 * PaymentProvider contract and has no knowledge of this provider's API shape.
 */
@Injectable()
export class AsaasPaymentProvider implements PaymentProvider {
  readonly provider = 'ASAAS';

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(AsaasPaymentProvider.name);

  constructor(configService: ConfigService) {
    const env = configService.get<string>('ASAAS_ENV', 'sandbox');
    this.baseUrl =
      env === 'production'
        ? 'https://api.asaas.com/v3'
        : 'https://api-homologacao.asaas.com/v3';
    this.apiKey = configService.get<string>('ASAAS_API_KEY', '');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.apiKey) {
      this.logger.warn(`ASAAS_API_KEY não configurada — chamada ${method} ${path} ignorada`);
      return {} as T;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Asaas ${method} ${path} → ${response.status}: ${error}`);
      throw new Error(`Asaas error ${response.status}: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async createCustomer(input: PaymentProviderCustomerInput): Promise<PaymentProviderCustomer> {
    const customer = await this.request<AsaasCustomerResponse>('POST', '/customers', {
      name: input.name,
      email: input.email,
      cpfCnpj: input.document,
    });

    return { id: customer.id };
  }

  async createSubscription(
    input: PaymentProviderSubscriptionInput,
  ): Promise<PaymentProviderSubscription> {
    const subscription = await this.request<AsaasSubscriptionResponse>('POST', '/subscriptions', {
      customer: input.customerId,
      billingType: input.paymentMethod,
      value: Number(input.amount),
      nextDueDate: input.nextDueDate,
      cycle: input.billingCycle,
      description: input.description,
    });

    return this.toPaymentProviderSubscription(subscription);
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.request<void>('DELETE', `/subscriptions/${providerSubscriptionId}`);
  }

  async getSubscription(providerSubscriptionId: string): Promise<PaymentProviderSubscription> {
    const subscription = await this.request<AsaasSubscriptionResponse>(
      'GET',
      `/subscriptions/${providerSubscriptionId}`,
    );

    return this.toPaymentProviderSubscription(subscription);
  }

  private toPaymentProviderSubscription(
    subscription: AsaasSubscriptionResponse,
  ): PaymentProviderSubscription {
    return {
      id: subscription.id,
      status: subscription.status,
      customerId: subscription.customer,
      amount: String(subscription.value),
      nextDueDate: subscription.nextDueDate,
    };
  }
}
