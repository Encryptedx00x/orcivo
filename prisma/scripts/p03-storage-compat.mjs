// P03-T09 — storage reference compatibility report (DRY RUN, read-only, idempotent).
//
// After P03, quote.pdf_url / quote_approvals.signature_image_url /
// work_order_photos.file_url store an OBJECT KEY instead of a full public URL.
// StorageService.extractKey() reads both forms, so no data rewrite is required.
// This script only reports how many rows are still in the legacy full-URL form,
// so an operator can decide whether a one-off normalization is worth doing.
//
//   node prisma/scripts/p03-storage-compat.mjs
//
// It never writes. It never deletes. Running it twice prints the same thing.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isLegacyUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);
const classify = (rows, field) => {
  let key = 0;
  let legacy = 0;
  let empty = 0;
  for (const r of rows) {
    const v = r[field];
    if (!v) empty++;
    else if (isLegacyUrl(v)) legacy++;
    else key++;
  }
  return { total: rows.length, key, legacy, empty };
};

async function main() {
  const [quotes, approvals, photos] = await Promise.all([
    prisma.quote.findMany({ select: { id: true, pdf_url: true } }),
    prisma.quoteApproval.findMany({ select: { id: true, signature_image_url: true } }),
    prisma.workOrderPhoto.findMany({ select: { id: true, file_url: true } }),
  ]);

  const report = {
    'quote.pdf_url': classify(quotes, 'pdf_url'),
    'quote_approvals.signature_image_url': classify(approvals, 'signature_image_url'),
    'work_order_photos.file_url': classify(photos, 'file_url'),
  };

  console.log('P03 storage reference compatibility (dry run — no writes)\n');
  for (const [col, c] of Object.entries(report)) {
    console.log(
      `  ${col.padEnd(38)} total=${c.total}  object-key=${c.key}  legacy-url=${c.legacy}  empty=${c.empty}`,
    );
  }
  const legacyTotal = Object.values(report).reduce((a, c) => a + c.legacy, 0);
  console.log(
    legacyTotal === 0
      ? '\n  All references are object keys (or empty). Nothing to normalize.'
      : `\n  ${legacyTotal} legacy full-URL reference(s). extractKey() resolves them transparently; ` +
          'normalization is optional and out of scope for P03 (would be a T10 controlled change).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
