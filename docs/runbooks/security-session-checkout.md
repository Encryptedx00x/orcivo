# Session, approval and checkout invariants

Refresh tokens belong to a browser session family. Rotation, logout and password reset serialize on the user row. Reset consumes its Redis token once and revokes all refresh sessions in the same database transaction as the password change. Login rechecks the password hash under the same lock. Existing access tokens retain their normal short expiration. A database failure after consuming a reset link requires a new link.

Quote approval validates the company method and expiration before preparing private signature/PDF objects. Each attempt owns unique object keys. The conditional quote transition, approval, work order and audit entries commit together. Deterministic rejections remove that attempt's artifacts; an ambiguous database commit retains private artifacts for reconciliation. Sequence gaps after rollback are expected.

A checkout does not grant paid access. Existing subscription status and plan remain authoritative until a verified provider event matches the recorded pending checkout. Terminal work orders can only be edited through the administrative correction action.

## Deployment

Apply `20261004190000_security_session_checkout` before replacing backend/web containers. It adds nullable checkout fields and backfills session families without deleting tokens. The database default on `session_id` allows the previous image to issue tokens during rollout. Preserve a database backup and previous images. Application rollback does not require reversing this additive migration.

## Verification

Run the backend suite with PostgreSQL, Redis and MinIO on an explicitly disposable database, plus `node --test apps/web/app/api/auth/logout/route.test.cjs`. The approval integration suite verifies rollback, concurrent approval, token replacement/expiry, refresh rotation, reset and browser-specific logout. Build and lint both applications before deployment. Verify health, login page and unauthenticated API rejection afterward; do not exercise billing or modify customer data as a production smoke test.
