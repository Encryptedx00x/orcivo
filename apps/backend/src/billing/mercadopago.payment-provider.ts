import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  PaymentProvider,
  PaymentProviderCustomer,
  PaymentProviderCustomerInput,
  PaymentProviderSubscription,
  PaymentProviderSubscriptionInput,
  ProviderSubscriptionStatus,
} from '@orcivo/shared-types';

const DEFAULT_API_URL = 'https://api.mercadopago.com';

/** Mercado Pago Pix `date_of_expiration` must be between 30 minutes and 30 days from creation. */
const PIX_MIN_EXPIRATION_MS = 35 * 60 * 1000;
const PIX_MAX_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000 - 5 * 60 * 1000;
/** Brasília has no DST since 2019; Mercado Pago expects an explicit offset. */
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

interface MercadoPagoCustomerResponse {
  id: string;
}

interface MercadoPagoCustomerSearchResponse {
  results?: MercadoPagoCustomerResponse[];
}

interface MercadoPagoPreapprovalResponse {
  id: string;
  status: string;
  payer_id?: number | string;
  init_point?: string;
  next_payment_date?: string | null;
  external_reference?: string | null;
  auto_recurring?: { transaction_amount?: number };
}

interface MercadoPagoPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  date_of_expiration?: string | null;
  date_approved?: string | null;
  external_reference?: string | null;
  payer?: { id?: string | number | null };
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

/** Authoritative state of a Mercado Pago resource, as fetched for a webhook notification. */
export type MercadoPagoResourceKind = 'payment' | 'preapproval';

export interface MercadoPagoResourceSnapshot {
  kind: MercadoPagoResourceKind;
  id: string;
  status: ProviderSubscriptionStatus;
  externalReference: string | null;
  amount: string | null;
  dueDate: string | null;
  paidAt: string | null;
}

export class MercadoPagoApiError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly body: string,
  ) {
    super(`Mercado Pago error ${httpStatus}: ${body}`);
  }
}

/** Preapproval: pending (aguardando autorização) | authorized | paused | cancelled. */
export function mapPreapprovalStatus(status: string): ProviderSubscriptionStatus {
  switch (status) {
    case 'authorized':
      return 'ACTIVE';
    case 'paused':
      return 'PAST_DUE';
    case 'cancelled':
      return 'CANCELED';
    case 'pending':
    default:
      return 'PENDING';
  }
}

/**
 * Cobrança avulsa (PIX). Chargeback é o único bloqueio imposto pelo provider; o
 * PAST_DUE → BLOCKED por carência continua sendo regra de domínio (cron).
 */
export function mapPaymentStatus(
  status: string,
  statusDetail?: string,
): ProviderSubscriptionStatus {
  switch (status) {
    case 'approved':
      return 'ACTIVE';
    case 'rejected':
      return 'PAST_DUE';
    case 'cancelled':
      return statusDetail === 'expired' ? 'PAST_DUE' : 'CANCELED';
    case 'refunded':
      return 'CANCELED';
    case 'charged_back':
      return 'BLOCKED';
    case 'pending':
    case 'in_process':
    case 'in_mediation':
    case 'authorized':
    default:
      return 'PENDING';
  }
}

/**
 * Mercado Pago transport adapter.
 *
 * - CREDIT_CARD → Preapproval (assinatura recorrente nativa do MP).
 * - PIX → pagamento avulso (`/v1/payments`) por ciclo, com QR/copia-e-cola e
 *   expiração; o MP não tem recorrência PIX, então a renovação é uma nova
 *   cobrança emitida pelo domínio a cada ciclo.
 *
 * Supports sandbox and production credentials.
 */
@Injectable()
export class MercadoPagoPaymentProvider implements PaymentProvider {
  readonly provider = 'MERCADOPAGO';
  readonly publicKey: string;

  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly backUrl: string;
  private readonly logger = new Logger(MercadoPagoPaymentProvider.name);

  constructor(configService: ConfigService) {
    const env = configService.get<string>('MP_ENV', 'sandbox');
    if (env !== 'sandbox' && env !== 'production') {
      throw new Error('MP_ENV must be "sandbox" or "production"');
    }

    this.baseUrl = configService.get<string>('MP_API_URL', DEFAULT_API_URL);
    this.accessToken = configService.get<string>('MP_ACCESS_TOKEN', '');
    this.publicKey = configService.get<string>('MP_PUBLIC_KEY', '');
    this.backUrl = configService.get<string>('MP_BACK_URL', 'https://app.orcivo.com.br/plano');

    if (env === 'production') {
      for (const [name, value] of [
        ['MP_ACCESS_TOKEN', this.accessToken],
        ['MP_PUBLIC_KEY', this.publicKey],
        ['MP_WEBHOOK_SECRET', configService.get<string>('MP_WEBHOOK_SECRET', '')],
      ] as const) {
        if (!value.trim()) {
          throw new Error(`${name} must be configured when MP_ENV is "production"`);
        }
      }
    }

    this.logger.log(`Mercado Pago initialized in ${env} mode`);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotent = false,
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error(`MP_ACCESS_TOKEN não configurado — chamada ${method} ${path} abortada`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    };
    if (idempotent) headers['X-Idempotency-Key'] = randomUUID();

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Mercado Pago ${method} ${path} → ${response.status}: ${error}`);
      throw new MercadoPagoApiError(response.status, error);
    }

    return response.json() as Promise<T>;
  }

  async createCustomer(input: PaymentProviderCustomerInput): Promise<PaymentProviderCustomer> {
    if (!input.email) {
      throw new Error('Mercado Pago customer requires an e-mail');
    }

    const digits = input.document?.replace(/\D/g, '');
    try {
      const customer = await this.request<MercadoPagoCustomerResponse>('POST', '/v1/customers', {
        email: input.email,
        first_name: input.name,
        ...(digits
          ? { identification: { type: digits.length > 11 ? 'CNPJ' : 'CPF', number: digits } }
          : {}),
      });
      return { id: String(customer.id) };
    } catch (err) {
      // Código 101: customer já existe para este e-mail → reaproveita.
      if (err instanceof MercadoPagoApiError && /"code"\s*:\s*"?101"?/.test(err.body)) {
        const found = await this.request<MercadoPagoCustomerSearchResponse>(
          'GET',
          `/v1/customers/search?email=${encodeURIComponent(input.email)}`,
        );
        const existing = found.results?.[0];
        if (existing) return { id: String(existing.id) };
      }
      throw err;
    }
  }

  async createSubscription(
    input: PaymentProviderSubscriptionInput,
  ): Promise<PaymentProviderSubscription> {
    switch (input.paymentMethod) {
      case 'CREDIT_CARD':
        return this.createCardSubscription(input);
      case 'PIX':
        return this.createPixCharge(input);
      default:
        throw new Error(`Mercado Pago provider does not support ${input.paymentMethod}`);
    }
  }

  private async createCardSubscription(
    input: PaymentProviderSubscriptionInput,
  ): Promise<PaymentProviderSubscription> {
    if (!input.payerEmail) {
      throw new Error('Mercado Pago preapproval requires payerEmail');
    }

    const startDate = this.startDateFor(input.nextDueDate);
    const preapproval = await this.request<MercadoPagoPreapprovalResponse>(
      'POST',
      '/preapproval',
      {
        reason: input.description ?? 'Orcivo',
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: this.backUrl,
        auto_recurring: {
          frequency: input.billingCycle === 'YEARLY' ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: Number(input.amount),
          currency_id: 'BRL',
          ...(startDate ? { start_date: startDate } : {}),
        },
        // Com card_token_id a assinatura nasce autorizada; sem ele fica pending
        // e o pagador conclui em init_point (checkout hospedado do MP).
        ...(input.cardTokenId
          ? { card_token_id: input.cardTokenId, status: 'authorized' }
          : { status: 'pending' }),
      },
      true,
    );

    return this.fromPreapproval(preapproval, input.customerId, input);
  }

  private async createPixCharge(
    input: PaymentProviderSubscriptionInput,
  ): Promise<PaymentProviderSubscription> {
    if (!input.payerEmail) {
      throw new Error('Mercado Pago PIX payment requires payerEmail');
    }

    const payment = await this.request<MercadoPagoPaymentResponse>(
      'POST',
      '/v1/payments',
      {
        transaction_amount: Number(input.amount),
        description: input.description ?? 'Orcivo',
        payment_method_id: 'pix',
        external_reference: input.externalReference,
        date_of_expiration: this.pixExpirationFor(input.nextDueDate),
        payer: { email: input.payerEmail },
      },
      true,
    );

    return this.fromPayment(payment, input.customerId, input.nextDueDate);
  }

  /**
   * Ids de pagamento PIX do MP são numéricos; ids de preapproval são
   * alfanuméricos — isso decide qual recurso cancelar/consultar.
   */
  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const id = encodeURIComponent(providerSubscriptionId);
    if (this.isPaymentId(providerSubscriptionId)) {
      await this.request('PUT', `/v1/payments/${id}`, { status: 'cancelled' });
      return;
    }
    await this.request('PUT', `/preapproval/${id}`, { status: 'cancelled' });
  }

  async getSubscription(providerSubscriptionId: string): Promise<PaymentProviderSubscription> {
    const id = encodeURIComponent(providerSubscriptionId);
    if (this.isPaymentId(providerSubscriptionId)) {
      const payment = await this.request<MercadoPagoPaymentResponse>('GET', `/v1/payments/${id}`);
      return this.fromPayment(payment, String(payment.payer?.id ?? ''));
    }
    const preapproval = await this.request<MercadoPagoPreapprovalResponse>(
      'GET',
      `/preapproval/${id}`,
    );
    return this.fromPreapproval(preapproval, String(preapproval.payer_id ?? ''));
  }

  /**
   * Consulta o recurso real na API do MP. Webhooks são só um aviso: o estado
   * persistido deve vir sempre desta resposta, nunca do corpo da notificação.
   */
  async fetchResource(
    kind: MercadoPagoResourceKind,
    resourceId: string,
  ): Promise<MercadoPagoResourceSnapshot> {
    const id = encodeURIComponent(resourceId);
    if (kind === 'payment') {
      const payment = await this.request<MercadoPagoPaymentResponse>('GET', `/v1/payments/${id}`);
      return {
        kind,
        id: String(payment.id),
        status: mapPaymentStatus(payment.status, payment.status_detail),
        externalReference: payment.external_reference || null,
        amount:
          payment.transaction_amount !== undefined ? String(payment.transaction_amount) : null,
        dueDate: payment.date_of_expiration?.slice(0, 10) ?? null,
        paidAt: payment.date_approved ?? null,
      };
    }
    const preapproval = await this.request<MercadoPagoPreapprovalResponse>(
      'GET',
      `/preapproval/${id}`,
    );
    const amount = preapproval.auto_recurring?.transaction_amount;
    return {
      kind,
      id: String(preapproval.id),
      status: mapPreapprovalStatus(preapproval.status),
      externalReference: preapproval.external_reference || null,
      amount: amount !== undefined ? String(amount) : null,
      dueDate: preapproval.next_payment_date?.slice(0, 10) ?? null,
      paidAt: null,
    };
  }

  private isPaymentId(id: string): boolean {
    return /^\d+$/.test(id);
  }

  private fromPreapproval(
    preapproval: MercadoPagoPreapprovalResponse,
    customerId: string,
    input?: PaymentProviderSubscriptionInput,
  ): PaymentProviderSubscription {
    const amount = preapproval.auto_recurring?.transaction_amount;
    return {
      id: String(preapproval.id),
      status: mapPreapprovalStatus(preapproval.status),
      customerId,
      amount: amount !== undefined ? String(amount) : (input?.amount ?? ''),
      nextDueDate: preapproval.next_payment_date?.slice(0, 10) ?? input?.nextDueDate ?? '',
      kind: 'RECURRING',
      ...(preapproval.init_point ? { checkoutUrl: preapproval.init_point } : {}),
    };
  }

  private fromPayment(
    payment: MercadoPagoPaymentResponse,
    customerId: string,
    fallbackDueDate = '',
  ): PaymentProviderSubscription {
    const data = payment.point_of_interaction?.transaction_data;
    return {
      id: String(payment.id),
      status: mapPaymentStatus(payment.status, payment.status_detail),
      customerId,
      amount: payment.transaction_amount !== undefined ? String(payment.transaction_amount) : '',
      nextDueDate: payment.date_of_expiration?.slice(0, 10) ?? fallbackDueDate,
      kind: 'ONE_OFF',
      ...(data?.qr_code
        ? {
            pix: {
              qrCode: data.qr_code,
              qrCodeBase64: data.qr_code_base64,
              ticketUrl: data.ticket_url,
              expiresAt: payment.date_of_expiration ?? undefined,
            },
          }
        : {}),
    };
  }

  /** `start_date` do Preapproval não pode estar no passado; omite quando já venceu. */
  private startDateFor(nextDueDate: string): string | undefined {
    const start = new Date(`${nextDueDate}T00:00:00-03:00`);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) return undefined;
    return this.formatBrt(start.getTime());
  }

  /** Fim do dia (BRT) do vencimento, limitado à janela aceita pelo MP (30min–30d). */
  private pixExpirationFor(nextDueDate: string): string {
    const now = Date.now();
    const due = new Date(`${nextDueDate}T23:59:59-03:00`).getTime();
    const target = Number.isNaN(due) ? now + PIX_MAX_EXPIRATION_MS : due;
    const clamped = Math.min(
      Math.max(target, now + PIX_MIN_EXPIRATION_MS),
      now + PIX_MAX_EXPIRATION_MS,
    );
    return this.formatBrt(clamped);
  }

  private formatBrt(epochMs: number): string {
    return new Date(epochMs + BRT_OFFSET_MS).toISOString().replace('Z', '-03:00');
  }
}
