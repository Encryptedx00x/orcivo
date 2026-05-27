import { PrismaClient, PlanCode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PlanLimits...');

  const planLimits = [
    {
      plan_code: 'LIVRE' as PlanCode,
      customers_max: 5,
      quotes_per_month: 10,
      work_orders_per_month: 5,
      members_max: 1,
      has_logo: false,
      pdf_watermark: true,
      has_reports: false,
      has_contracts: false,
    },
    {
      plan_code: 'SOLO' as PlanCode,
      customers_max: 50,
      quotes_per_month: 50,
      work_orders_per_month: 30,
      members_max: 1,
      has_logo: true,
      pdf_watermark: false,
      has_reports: false,
      has_contracts: false,
    },
    {
      plan_code: 'MAIS' as PlanCode,
      customers_max: 200,
      quotes_per_month: null,
      work_orders_per_month: null,
      members_max: 3,
      has_logo: true,
      pdf_watermark: false,
      has_reports: true,
      has_contracts: false,
    },
    {
      plan_code: 'EQUIPE' as PlanCode,
      customers_max: null,
      quotes_per_month: null,
      work_orders_per_month: null,
      members_max: 10,
      has_logo: true,
      pdf_watermark: false,
      has_reports: true,
      has_contracts: true,
    },
  ];

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
