// Wave 0 stub — implementação real em P02/P04. Ver VALIDATION.md Per-Task Verification Map.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env['DATABASE_URL_TEST'] } },
});

// IMPLEMENTAR EM: P04 — bootstrap do app NestJS de teste com supertest
export async function getTestApp(): Promise<never> {
  throw new Error('getTestApp not implemented yet — implement in P04');
}

export async function cleanupDatabase(): Promise<void> {
  await prisma.customer.deleteMany();
  await prisma.companyMember.deleteMany();
  await prisma.company.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}
