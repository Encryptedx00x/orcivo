#!/usr/bin/env bash
# Local test for backup-db.sh against a disposable Postgres container.
# Never touches orcivo-db or any real database. Requires docker.
# Run: bash infra/vps/test-backup-db.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
name="orcivo-backup-test-$$"
dir="$(mktemp -d)"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$dir"; }
trap cleanup EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

docker run -d --name "$name" -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=orcivo_test postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "$name" pg_isready -U test -d orcivo_test >/dev/null 2>&1 && break
  sleep 1
done
# pg_isready can pass during the init-phase temporary server; wait for a real query.
for _ in $(seq 1 30); do
  docker exec "$name" psql -U test -d orcivo_test -c 'select 1' >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$name" psql -U test -d orcivo_test -v ON_ERROR_STOP=1 \
  -c "create table t(id int primary key, v text); insert into t values (1,'alpha'),(2,'beta');" >/dev/null

run_backup() { env BACKUP_DIR="$dir" DB_CONTAINER="${1-$name}" RETENTION_DAYS=3 bash "$here/backup-db.sh"; }

# Pre-existing backups: two old (must be pruned), one recent (must stay).
touch -d '10 days ago' "$dir/orcivo-orcivo_test-20000101T000000Z.sql.gz"
touch -d '4 days ago' "$dir/orcivo-orcivo_test-20000102T000000Z.sql.gz"
touch -d '1 day ago' "$dir/orcivo-orcivo_test-20000103T000000Z.sql.gz"
touch -d '10 days ago' "$dir/unrelated-file.sql.gz"

run_backup

[ ! -e "$dir/orcivo-orcivo_test-20000101T000000Z.sql.gz" ] || fail "10-day-old backup not pruned"
[ ! -e "$dir/orcivo-orcivo_test-20000102T000000Z.sql.gz" ] || fail "4-day-old backup not pruned"
[ -e "$dir/orcivo-orcivo_test-20000103T000000Z.sql.gz" ] || fail "recent backup wrongly pruned"
[ -e "$dir/unrelated-file.sql.gz" ] || fail "unrelated file wrongly pruned"
[ -z "$(ls "$dir"/*.partial 2>/dev/null)" ] || fail "partial file left behind"

newbackup="$(ls "$dir"/orcivo-orcivo_test-2*T*Z.sql.gz | grep -v '2000010' | head -n1)"
[ -n "$newbackup" ] || fail "new backup not found"

# Restore into a scratch database and compare data.
docker exec "$name" psql -U test -d orcivo_test -c 'create database restored' >/dev/null
gzip -dc "$newbackup" | docker exec -i "$name" psql -U test -d restored -v ON_ERROR_STOP=1 -q >/dev/null
got="$(docker exec "$name" psql -U test -d restored -Atc "select string_agg(v, ',' order by id) from t")"
[ "$got" = "alpha,beta" ] || fail "restored data mismatch: '$got'"

# A failing dump must not prune anything.
before="$(ls "$dir" | wc -l)"
if run_backup does-not-exist >/dev/null 2>&1; then
  fail "backup against a missing container should fail"
fi
[ "$(ls "$dir" | wc -l)" = "$before" ] || fail "failed run changed the backup directory"

echo "PASS: backup, validation, rotation and restore OK"
