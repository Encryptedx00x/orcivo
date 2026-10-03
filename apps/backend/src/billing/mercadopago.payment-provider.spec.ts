import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentProvider, PaymentProviderSubscriptionInput } from '@orcivo/shared-types';
import {
  MercadoPagoApiError,
  MercadoPagoPaymentProvider,
  mapPaymentStatus,
  mapPreapprovalStatus,
} from './mercadopago.payment-provider';

const NOW = new Date('2026-10-01T15:00:00.000Z');

function buildProvider(env: Record<string, string | undefined> = {}): MercadoPagoPaymentProvider {
  const values: Record<string, string | undefined> = {
    MP_ENV: 'sandbox',
    MP_ACCESS_TOKEN: 'TEST-fake-access-token',
    MP_PUBLIC_KEY: 'TEST-fake-public-key',
    MP_WEBHOOK_SECRET: 'TEST-fake-webhook-secret',
    ...env,
  };
  const config = {
    get: (key: string, fallback?: string) => values[key] ?? fallback,
  } as unknown as ConfigService;
  return new MercadoPagoPaymentProvider(config);
}

function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
  const fn = jest.fn();
  for (const r of responses) {
    const status = r.status ?? 200;
    fn.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => r.body,
      text: async () => (typeof r.body === 'string' ? r.body : JSON.stringify(r.body)),
    });
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function call(fn: jest.Mock, index = 0) {
  const [url, init] = fn.mock.calls[index];
  return {
    url: url as string,
    method: init.method as string,
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
}

const baseInput: PaymentProviderSubscriptionInput = {
  customerId: '123',
  paymentMethod: 'CREDIT_CARD',
  amount: '79.90',
  nextDueDate: '2026-10-02',
  billingCycle: 'MONTHLY',
  description: 'Orcivo MAIS — Mensal',
  payerEmail: 'test_user@testuser.com',
  externalReference: 'company-1',
};

describe('MercadoPagoPaymentProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('implements the PaymentProvider contract', () => {
    const provider: PaymentProvider = buildProvider();
    expect(provider.provider).toBe('MERCADOPAGO');
    for (const method of [
      'createCustomer',
      'createSubscription',
      'cancelSubscription',
      'getSubscription',
    ] as const) {
      expect(typeof provider[method]).toBe('function');
    }
  });

  it('initializes in sandbox mode', () => {
    expect(() => buildProvider()).not.toThrow();
  });

  it('initializes in production mode when all required credentials are configured', () => {
    expect(() => buildProvider({ MP_ENV: 'production' })).not.toThrow();
  });

  it.each(['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY', 'MP_WEBHOOK_SECRET'])(
    'fails clearly when %s is missing in production',
    (missingVariable) => {
      expect(() => buildProvider({ MP_ENV: 'production', [missingVariable]: undefined })).toThrow(
        new RegExp(missingVariable),
      );
    },
  );

  it('refuses an invalid Mercado Pago environment', () => {
    expect(() => buildProvider({ MP_ENV: 'staging' })).toThrow(/MP_ENV.*sandbox.*production/);
  });

  it('logs the active mode without credential values', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const accessToken = 'private-access-token';
    const publicKey = 'public-key';
    const webhookSecret = 'webhook-secret';

    buildProvider({
      MP_ENV: 'production',
      MP_ACCESS_TOKEN: accessToken,
      MP_PUBLIC_KEY: publicKey,
      MP_WEBHOOK_SECRET: webhookSecret,
    });

    const messages = log.mock.calls.map(([message]) => String(message)).join('\n');
    expect(messages).toContain('production');
    expect(messages).not.toContain(accessToken);
    expect(messages).not.toContain(publicKey);
    expect(messages).not.toContain(webhookSecret);
    log.mockRestore();
  });

  it('uses the app subscription page as the default return URL', async () => {
    const fetchMock = mockFetch([{ body: { id: 'pre2', status: 'pending' } }]);
    await buildProvider().createSubscription(baseInput);
    expect(call(fetchMock).body.back_url).toBe('https://app.orcivo.com.br/plano');
  });

  it('fails clearly when the access token is missing', async () => {
    const provider = buildProvider({ MP_ACCESS_TOKEN: '' });
    const fetchMock = mockFetch([]);
    await expect(provider.getSubscription('abc')).rejects.toThrow(/MP_ACCESS_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('createCustomer', () => {
    it('creates a customer with CPF identification', async () => {
      const fetchMock = mockFetch([{ body: { id: '555' } }]);
      const customer = await buildProvider().createCustomer({
        name: 'Oficina Teste',
        email: 'a@b.com',
        document: '123.456.789-09',
      });

      expect(customer).toEqual({ id: '555' });
      const req = call(fetchMock);
      expect(req.url).toBe('https://api.mercadopago.com/v1/customers');
      expect(req.headers.Authorization).toBe('Bearer TEST-fake-access-token');
      expect(req.body).toEqual({
        email: 'a@b.com',
        first_name: 'Oficina Teste',
        identification: { type: 'CPF', number: '12345678909' },
      });
    });

    it('reuses an existing customer (error 101)', async () => {
      const fetchMock = mockFetch([
        {
          status: 400,
          body: {
            message: 'customer already exists',
            error: 'bad_request',
            cause: [{ code: '101' }],
          },
        },
        { body: { results: [{ id: '777' }] } },
      ]);
      const customer = await buildProvider().createCustomer({ name: 'X', email: 'a@b.com' });
      expect(customer).toEqual({ id: '777' });
      expect(call(fetchMock, 1).url).toContain('/v1/customers/search?email=a%40b.com');
    });

    it('requires an e-mail', async () => {
      await expect(buildProvider().createCustomer({ name: 'X' })).rejects.toThrow(/e-mail/);
    });
  });

  describe('createSubscription — cartão (Preapproval)', () => {
    it('creates an authorized preapproval when a card token is provided', async () => {
      const fetchMock = mockFetch([
        {
          body: {
            id: 'pre123',
            status: 'authorized',
            payer_id: 123,
            next_payment_date: '2026-10-02T10:00:00.000-03:00',
            auto_recurring: { transaction_amount: 79.9 },
          },
        },
      ]);
      const result = await buildProvider().createSubscription({
        ...baseInput,
        cardTokenId: 'card_tok_1',
      });

      const req = call(fetchMock);
      expect(req.url).toBe('https://api.mercadopago.com/preapproval');
      expect(req.method).toBe('POST');
      expect(req.headers['X-Idempotency-Key']).toBeTruthy();
      expect(req.body).toMatchObject({
        reason: 'Orcivo MAIS — Mensal',
        external_reference: 'company-1',
        payer_email: 'test_user@testuser.com',
        card_token_id: 'card_tok_1',
        status: 'authorized',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 79.9,
          currency_id: 'BRL',
          start_date: '2026-10-02T00:00:00.000-03:00',
        },
      });
      expect(result).toEqual({
        id: 'pre123',
        status: 'ACTIVE',
        customerId: '123',
        amount: '79.9',
        nextDueDate: '2026-10-02',
        kind: 'RECURRING',
      });
    });

    it('uses a 12-month frequency for the yearly cycle and omits past start_date', async () => {
      const fetchMock = mockFetch([{ body: { id: 'pre1', status: 'authorized' } }]);
      await buildProvider().createSubscription({
        ...baseInput,
        cardTokenId: 't',
        billingCycle: 'YEARLY',
        nextDueDate: '2026-09-01',
      });
      const recurring = call(fetchMock).body.auto_recurring;
      expect(recurring.frequency).toBe(12);
      expect(recurring.start_date).toBeUndefined();
    });

    it('creates a pending preapproval with init_point when there is no card token', async () => {
      const fetchMock = mockFetch([
        { body: { id: 'pre2', status: 'pending', init_point: 'https://mp.test/checkout/pre2' } },
      ]);
      const result = await buildProvider().createSubscription(baseInput);

      const body = call(fetchMock).body;
      expect(body.status).toBe('pending');
      expect(body.card_token_id).toBeUndefined();
      expect(result.status).toBe('PENDING');
      expect(result.checkoutUrl).toBe('https://mp.test/checkout/pre2');
    });

    it('requires payerEmail', async () => {
      await expect(
        buildProvider().createSubscription({ ...baseInput, payerEmail: undefined }),
      ).rejects.toThrow(/payerEmail/);
    });

    it('throws MercadoPagoApiError on API failure', async () => {
      mockFetch([{ status: 400, body: { message: 'invalid card token' } }]);
      await expect(
        buildProvider().createSubscription({ ...baseInput, cardTokenId: 'bad' }),
      ).rejects.toBeInstanceOf(MercadoPagoApiError);
    });
  });

  describe('createSubscription — PIX (cobrança avulsa por ciclo)', () => {
    const pixResponse = {
      id: 987654321,
      status: 'pending',
      status_detail: 'pending_waiting_transfer',
      transaction_amount: 790,
      date_of_expiration: '2026-10-02T23:59:59.000-03:00',
      point_of_interaction: {
        transaction_data: {
          qr_code: '00020126pixcopiaecola',
          qr_code_base64: 'iVBORw0KGgo=',
          ticket_url: 'https://mp.test/ticket/987654321',
        },
      },
    };

    it('creates a one-off PIX payment (not a preapproval) with QR and expiration', async () => {
      const fetchMock = mockFetch([{ body: pixResponse }]);
      const result = await buildProvider().createSubscription({
        ...baseInput,
        paymentMethod: 'PIX',
        billingCycle: 'YEARLY',
        amount: '790.00',
      });

      const req = call(fetchMock);
      expect(req.url).toBe('https://api.mercadopago.com/v1/payments');
      expect(req.url).not.toContain('preapproval');
      expect(req.headers['X-Idempotency-Key']).toBeTruthy();
      expect(req.body).toMatchObject({
        transaction_amount: 790,
        payment_method_id: 'pix',
        external_reference: 'company-1',
        date_of_expiration: '2026-10-02T23:59:59.000-03:00',
        payer: { email: 'test_user@testuser.com' },
      });
      expect(result).toEqual({
        id: '987654321',
        status: 'PENDING',
        customerId: '123',
        amount: '790',
        nextDueDate: '2026-10-02',
        kind: 'ONE_OFF',
        pix: {
          qrCode: '00020126pixcopiaecola',
          qrCodeBase64: 'iVBORw0KGgo=',
          ticketUrl: 'https://mp.test/ticket/987654321',
          expiresAt: '2026-10-02T23:59:59.000-03:00',
        },
      });
    });

    it('clamps expiration to the 30-day maximum accepted by Mercado Pago', async () => {
      const fetchMock = mockFetch([{ body: pixResponse }]);
      await buildProvider().createSubscription({
        ...baseInput,
        paymentMethod: 'PIX',
        nextDueDate: '2027-10-01',
      });
      const expiration = new Date(call(fetchMock).body.date_of_expiration).getTime();
      expect(expiration - NOW.getTime()).toBeLessThan(30 * 24 * 60 * 60 * 1000);
      expect(expiration - NOW.getTime()).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    });

    it('clamps expiration to the 30-minute minimum for a due date already past', async () => {
      const fetchMock = mockFetch([{ body: pixResponse }]);
      await buildProvider().createSubscription({
        ...baseInput,
        paymentMethod: 'PIX',
        nextDueDate: '2026-09-01',
      });
      const expiration = new Date(call(fetchMock).body.date_of_expiration).getTime();
      expect(expiration - NOW.getTime()).toBeGreaterThanOrEqual(30 * 60 * 1000);
    });

    it('requires payerEmail', async () => {
      await expect(
        buildProvider().createSubscription({
          ...baseInput,
          paymentMethod: 'PIX',
          payerEmail: undefined,
        }),
      ).rejects.toThrow(/payerEmail/);
    });
  });

  it('rejects unsupported payment methods', async () => {
    await expect(
      buildProvider().createSubscription({ ...baseInput, paymentMethod: 'BOLETO' }),
    ).rejects.toThrow(/BOLETO/);
  });

  describe('getSubscription / cancelSubscription', () => {
    it('reads a preapproval by alphanumeric id', async () => {
      const fetchMock = mockFetch([
        {
          body: {
            id: 'abc123def',
            status: 'paused',
            payer_id: 42,
            next_payment_date: '2026-11-02T10:00:00.000-03:00',
            auto_recurring: { transaction_amount: 29.9 },
          },
        },
      ]);
      const result = await buildProvider().getSubscription('abc123def');
      expect(call(fetchMock).url).toBe('https://api.mercadopago.com/preapproval/abc123def');
      expect(result).toMatchObject({
        id: 'abc123def',
        status: 'PAST_DUE',
        customerId: '42',
        amount: '29.9',
        nextDueDate: '2026-11-02',
      });
    });

    it('reads a PIX payment by numeric id', async () => {
      const fetchMock = mockFetch([
        {
          body: {
            id: 111,
            status: 'approved',
            transaction_amount: 79.9,
            date_of_expiration: '2026-10-02T23:59:59.000-03:00',
            payer: { id: 9 },
          },
        },
      ]);
      const result = await buildProvider().getSubscription('111');
      expect(call(fetchMock).url).toBe('https://api.mercadopago.com/v1/payments/111');
      expect(result).toMatchObject({
        id: '111',
        status: 'ACTIVE',
        customerId: '9',
        kind: 'ONE_OFF',
      });
    });

    it('cancels a preapproval', async () => {
      const fetchMock = mockFetch([{ body: { id: 'abc123def', status: 'cancelled' } }]);
      await buildProvider().cancelSubscription('abc123def');
      const req = call(fetchMock);
      expect(req.method).toBe('PUT');
      expect(req.url).toBe('https://api.mercadopago.com/preapproval/abc123def');
      expect(req.body).toEqual({ status: 'cancelled' });
    });

    it('cancels a pending PIX payment', async () => {
      const fetchMock = mockFetch([{ body: { id: 111, status: 'cancelled' } }]);
      await buildProvider().cancelSubscription('111');
      const req = call(fetchMock);
      expect(req.method).toBe('PUT');
      expect(req.url).toBe('https://api.mercadopago.com/v1/payments/111');
      expect(req.body).toEqual({ status: 'cancelled' });
    });
  });

  describe('status mapping', () => {
    it.each([
      ['pending', 'PENDING'],
      ['authorized', 'ACTIVE'],
      ['paused', 'PAST_DUE'],
      ['cancelled', 'CANCELED'],
      ['something_new', 'PENDING'],
    ])('preapproval %s → %s', (mp, expected) => {
      expect(mapPreapprovalStatus(mp)).toBe(expected);
    });

    it.each([
      ['pending', undefined, 'PENDING'],
      ['in_process', undefined, 'PENDING'],
      ['in_mediation', undefined, 'PENDING'],
      ['authorized', undefined, 'PENDING'],
      ['approved', 'accredited', 'ACTIVE'],
      ['rejected', 'cc_rejected_other_reason', 'PAST_DUE'],
      ['cancelled', 'expired', 'PAST_DUE'],
      ['cancelled', 'by_collector', 'CANCELED'],
      ['refunded', undefined, 'CANCELED'],
      ['charged_back', undefined, 'BLOCKED'],
    ])('payment %s/%s → %s', (status, detail, expected) => {
      expect(mapPaymentStatus(status, detail)).toBe(expected);
    });

    it('covers all five normalized statuses', () => {
      const all = new Set([
        mapPreapprovalStatus('pending'),
        mapPreapprovalStatus('authorized'),
        mapPreapprovalStatus('paused'),
        mapPreapprovalStatus('cancelled'),
        mapPaymentStatus('charged_back'),
      ]);
      expect([...all].sort()).toEqual(['ACTIVE', 'BLOCKED', 'CANCELED', 'PAST_DUE', 'PENDING']);
    });
  });
});
