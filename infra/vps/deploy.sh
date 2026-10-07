#!/usr/bin/env bash
# Production deploy (run on the VPS). From the repo root, locally:
#   git archive --format=tar.gz -o orcivo-src.tar.gz HEAD
#   scp orcivo-src.tar.gz ubuntu@<vps>:/tmp/ && scp infra/vps/deploy.sh ubuntu@<vps>:/tmp/
#   ssh ubuntu@<vps> 'bash /tmp/deploy.sh'
# Backups DB + .env and tags the running images as prev-<ts> before anything changes;
# builds everything before swapping containers; prints HEALTH and DEPLOY_DONE.
# Rollback: retag orcivo-*:prev-<ts> as :latest and `docker compose up -d backend web site`.
set -eu
cd /srv/orcivo
TS=$(date +%Y%m%d-%H%M%S)
echo "=== DEPLOY $TS"

# 1. Backups (rollback ready before touching anything)
mkdir -p backups
sudo docker exec orcivo-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "backups/pre-$TS.sql.gz"
ls -la "backups/pre-$TS.sql.gz"
cp .env "backups/env-$TS"
chmod 600 "backups/env-$TS"
for img in orcivo-backend orcivo-backend-build orcivo-web orcivo-site; do
  sudo docker tag "$img:latest" "$img:prev-$TS"
done
echo "PREV_TAG=prev-$TS"

# 2. Source
rm -rf source.new && mkdir source.new
tar -xzf /tmp/orcivo-src.tar.gz -C source.new
sudo rm -rf source.old && mv source source.old && mv source.new source
tr -d '\r' < source/infra/vps/docker-compose.yml > docker-compose.yml
sudo docker compose config -q && echo COMPOSE_OK

# 3. Build (sequential: 3.7 GB RAM, no swap)
for s in backend migrate web site; do
  echo "=== BUILD $s"
  sudo nice -n 10 docker compose --profile tools build "$s"
done
echo ALL_BUILT

# 4. Migrations + seed (both idempotent)
sudo docker compose --profile tools run --rm migrate 2>&1 | tail -3
sudo docker compose --profile tools run --rm seed 2>&1 | tail -6

# 5. Recreate only app containers
sudo docker compose up -d backend web site
for i in $(seq 1 40); do
  st=$(sudo docker inspect -f '{{.State.Health.Status}}' orcivo-backend orcivo-web orcivo-site | tr '\n' ' ')
  [ "$st" = 'healthy healthy healthy ' ] && break
  sleep 5
done
echo "HEALTH: $st"
if [ "$st" != 'healthy healthy healthy ' ]; then
  echo "DEPLOY_FAILED: application health checks did not pass; source.old and prev-$TS images retained" >&2
  exit 1
fi
sudo rm -rf source.old
# 6. Disk: keep only this deploy's rollback tag (prev-$TS) per image; drop old cache.
for img in orcivo-backend orcivo-backend-build orcivo-web orcivo-site; do
  sudo docker images --format '{{.Repository}}:{{.Tag}}' "$img" | grep ':prev-' | grep -v "prev-$TS" \
    | xargs -r sudo docker rmi >/dev/null 2>&1 || true
done
sudo docker image prune -f >/dev/null 2>&1 || true
sudo docker builder prune -f --filter until=24h >/dev/null 2>&1 || true
df -h / | tail -1
echo DEPLOY_DONE
