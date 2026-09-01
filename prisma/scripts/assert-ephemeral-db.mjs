#!/usr/bin/env node
/* eslint-disable no-console -- CLI guard: diagnostics go to stderr by design. */
// Fail-fast guard: refuse to run migrate / truncate / reset unless DATABASE_URL
// points at an approved *ephemeral* Orcivo database. Used by npm scripts before
// any destructive Prisma op. The regex is mirrored in
// apps/backend/test/ephemeral-db-guard.ts — keep both in sync.
// ponytail: two ~5-line copies beat a shared build step for one regex.

const EPHEMERAL_DB = /\/orcivo_(test|verify|uat)[a-z0-9_-]*(\?|$)/i;
const LOCAL_HOST = /@(localhost|127\.0\.0\.1|postgres-test|host\.docker\.internal)[:/]/i;

const url = process.env.DATABASE_URL || '';

if (!url || !EPHEMERAL_DB.test(url) || !LOCAL_HOST.test(url)) {
  const redacted = url.replace(/\/\/[^@]*@/, '//***:***@');
  console.error(
    `[assert-ephemeral-db] REFUSING: DATABASE_URL is not an approved ephemeral Orcivo DB.\n` +
      `  need: host localhost/127.0.0.1/postgres-test, db name /orcivo_(test|verify|uat).../\n` +
      `  got:  ${redacted || '(empty)'}`,
  );
  process.exit(1);
}

console.error('[assert-ephemeral-db] OK — ephemeral DB confirmed.');
