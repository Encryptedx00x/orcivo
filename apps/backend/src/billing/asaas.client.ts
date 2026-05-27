import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  customer: string;
  value: number;
  nextDueDate: string;
}

@Injectable()
export class AsaasClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(AsaasClient.name);

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
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Asaas ${method} ${path} → ${res.status}: ${err}`);
      throw new Error(`Asaas error ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  }

  async createCustomer(data: {
    name: string;
    email?: string;
    cpfCnpj?: string;
  }): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>('POST', '/customers', data);
  }

  async createSubscription(data: {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'YEARLY';
    description?: string;
  }): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('POST', '/subscriptions', data);
  }

  async cancelSubscription(asaasSubId: string): Promise<void> {
    await this.request<void>('DELETE', `/subscriptions/${asaasSubId}`);
  }

  async getSubscription(asaasSubId: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>('GET', `/subscriptions/${asaasSubId}`);
  }
}
