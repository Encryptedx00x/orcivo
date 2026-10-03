#!/usr/bin/env bash
# Daily Postgres backup for Orcivo with rotation.
#
# Dumps the database to $BACKUP_DIR/orcivo-<db>-<UTC timestamp>.sql.gz, validates the
# archive, then prunes backups older than $RETENTION_DAYS days. Old backups are only
# pruned after a new one was written successfully, so a failing dump never empties the
# directory.
#
# Modes:
#   docker (default): runs pg_dump inside $DB_CONTAINER (default: orcivo-db) using the
#                     container's own POSTGRES_USER / POSTGRES_DB. No password needed.
#   host:             set DB_CONTAINER= (empty) and use the standard PG* variables
#                     (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) with a local pg_dump.
#
# Environment (all optional):
#   BACKUP_DIR      destination directory          (default: /srv/orcivo/backups)
#   RETENTION_DAYS  days of backups to keep        (default: 14)
#   DB_CONTAINER    docker container name          (default: orcivo-db)
#   DOCKER          docker command, e.g. "sudo docker" (default: docker)
#
# Cron: see infra/vps/README.md. Restore: see the same README.
set -euo pipefail

: "${BACKUP_DIR:=/srv/orcivo/backups}"
: "${RETENTION_DAYS:=14}"
: "${DB_CONTAINER=orcivo-db}"
: "${DOCKER:=docker}"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) backup-db: $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

case "$RETENTION_DAYS" in
  '' | *[!0-9]*) die "RETENTION_DAYS must be a positive integer (got '$RETENTION_DAYS')" ;;
esac
[ "$RETENTION_DAYS" -ge 1 ] || die "RETENTION_DAYS must be >= 1"

umask 077
mkdir -p "$BACKUP_DIR"

if [ -n "$DB_CONTAINER" ]; then
  # $DOCKER is intentionally unquoted so it may be "sudo docker".
  # shellcheck disable=SC2086
  db_name="$($DOCKER exec "$DB_CONTAINER" sh -c 'printf %s "$POSTGRES_DB"')"
  [ -n "$db_name" ] || die "could not read POSTGRES_DB from container $DB_CONTAINER"
  dump() {
    # shellcheck disable=SC2086
    $DOCKER exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges'
  }
else
  db_name="${PGDATABASE:-}"
  [ -n "$db_name" ] || die "host mode requires PGDATABASE"
  dump() { pg_dump --no-owner --no-privileges; }
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$BACKUP_DIR/orcivo-$db_name-$stamp.sql.gz"
tmp="$final.partial"
trap 'rm -f "$tmp"' EXIT

log "dumping '$db_name' -> $final"
dump | gzip -9 > "$tmp"   # pipefail makes a failed pg_dump fail the script

gzip -t "$tmp" || die "gzip integrity check failed"
# A valid pg_dump always ends with this marker; guards against truncated output.
gzip -dc "$tmp" | grep -q 'PostgreSQL database dump complete' || die "dump looks truncated"

mv "$tmp" "$final"
trap - EXIT
log "ok ($(wc -c < "$final") bytes)"

# Rotation: remove backups of this database older than RETENTION_DAYS days.
find "$BACKUP_DIR" -maxdepth 1 -type f -name "orcivo-$db_name-*.sql.gz" \
  -mtime "+$((RETENTION_DAYS - 1))" -print -delete | while read -r f; do
  log "pruned $f"
done

log "done (retention ${RETENTION_DAYS}d)"
