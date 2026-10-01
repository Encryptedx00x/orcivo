import { PrismaClient, PlanCode } from '@prisma/client';
import { PLAN_LIMITS } from '@orcivo/shared-types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PlanLimits...');

  const planLimits = (Object.keys(PLAN_LIMITS) as PlanCode[]).map((plan_code) => ({
    plan_code,
    ...PLAN_LIMITS[plan_code],
  }));

  for (const limit of planLimits) {
    await prisma.planLimit.upsert({
      where: { plan_code: limit.plan_code },
      create: limit,
      update: {},
    });
    console.log(`  ✓ PlanLimit ${limit.plan_code}`);
  }

  console.log('✅ Seed concluído');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
