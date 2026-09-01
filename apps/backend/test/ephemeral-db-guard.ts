// Fail-fast guard for integration tests: abort before the first write/truncate
// unless the target DB is an approved ephemeral Orcivo database.
// Regex mirrors prisma/scripts/assert-ephemeral-db.mjs — keep both in sync.
// ponytail: one shared helper, imported by globalSetup + setup.

const EPHEMERAL_DB = /\/orcivo_(test|verify|uat)[a-z0-9_-]*(\?|$)/i;
const LOCAL_HOST = /@(localhost|127\.0\.0\.1|postgres-test|host\.docker\.internal)[:/]/i;

export function assertEphemeralDatabase(
  url = process.env['DATABASE_URL_TEST'] ?? process.env['DATABASE_URL'] ?? '',
): void {
  if (!url || !EPHEMERAL_DB.test(url) || !LOCAL_HOST.test(url)) {
    const redacted = url.replace(/\/\/[^@]*@/, '//***:***@');
    throw new Error(
      `[ephemeral-db-guard] REFUSING: not an approved ephemeral Orcivo DB. ` +
        `Need host localhost/127.0.0.1/postgres-test and db /orcivo_(test|verify|uat).../ — got: ${redacted || '(empty)'}`,
    );
  }
}
