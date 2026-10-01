import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { BillingModule } from './billing.module';
import { MercadoPagoPaymentProvider } from './mercadopago.payment-provider';
import { PAYMENT_PROVIDER } from './payment-provider.token';
import { SubscriptionService } from './subscription.service';

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class PrismaStubModule {}

describe('BillingModule composition root', () => {
  it('binds PAYMENT_PROVIDER to MercadoPagoPaymentProvider and never registers Asaas', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ MP_ENV: 'sandbox', MP_ACCESS_TOKEN: 'TEST-fake' })],
        }),
        PrismaStubModule,
        BillingModule,
      ],
    }).compile();

    expect(moduleRef.get(PAYMENT_PROVIDER)).toBeInstanceOf(MercadoPagoPaymentProvider);
    expect(moduleRef.get(SubscriptionService)).toBeDefined();

    const providers = (Reflect.getMetadata('providers', BillingModule) as unknown[]).map((p) =>
      typeof p === 'function' ? p.name : String((p as { provide: unknown }).provide),
    );
    expect(providers.join(',')).not.toMatch(/asaas/i);
    await moduleRef.close();
  });
});
