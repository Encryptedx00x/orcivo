import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { assertEphemeralDatabase } from './ephemeral-db-guard';

assertEphemeralDatabase();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env['DATABASE_URL_TEST'] } },
});

export async function getTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  return app;
}

export async function cleanupDatabase(): Promise<void> {
  assertEphemeralDatabase();
  // FK-safe order: children -> parents. Does not touch plan_limits (seed data).
  await prisma.quoteApproval.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.workOrderPhoto.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.catalogItem.deleteMany();
  await prisma.companyInvite.deleteMany();
  await prisma.subscriptionPayment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.companyMember.deleteMany();
  await prisma.company.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}
