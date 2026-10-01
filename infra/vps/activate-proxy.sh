#!/bin/sh
# Waits until the Orcivo hostnames resolve to this VPS, then publishes them on the
# shared Caddy (/srv/stack) and points presigned storage URLs at s3.<domain>.
# Idempotent; rolls the Caddyfile back if validation/reload fails.
# Run: nohup sh /srv/orcivo/source/infra/vps/activate-proxy.sh >> /srv/orcivo/activate.log 2>&1 &
set -u
IP=54.38.241.158
HOSTS="orcivo.com.br app.orcivo.com.br api.orcivo.com.br s3.orcivo.com.br"
CADDYFILE=/srv/stack/Caddyfile
SNIPPET=/srv/orcivo/source/infra/vps/Caddyfile.orcivo
log() { echo "$(date -Is) $*"; }

resolves() {
  for h in $HOSTS; do
    getent ahostsv4 "$h" | awk '{print $1}' | grep -qx "$IP" || return 1
  done
}

until resolves; do sleep 60; done
log "DNS OK for: $HOSTS"

if ! sudo grep -q "# --- Orcivo" "$CADDYFILE"; then
  TS=$(date +%Y%m%d-%H%M%S)
  sudo cp "$CADDYFILE" "$CADDYFILE.before-orcivo-proxy-$TS"
  cat "$SNIPPET" | sudo tee -a "$CADDYFILE" >/dev/null
  if sudo docker exec stack-caddy-1 caddy validate --config /etc/caddy/Caddyfile \
    && sudo docker exec stack-caddy-1 caddy reload --config /etc/caddy/Caddyfile; then
    log "Caddy reloaded with Orcivo sites"
  else
    sudo cp "$CADDYFILE.before-orcivo-proxy-$TS" "$CADDYFILE"
    sudo docker exec stack-caddy-1 caddy reload --config /etc/caddy/Caddyfile
    log "ROLLBACK: Caddy config invalid, restored $TS"; exit 1
  fi
fi

# Wait for the s3 certificate before switching the backend to the public endpoint.
for i in $(seq 1 60); do
  curl -fsS -o /dev/null https://s3.orcivo.com.br/minio/health/live && break
  sleep 10
done

cd /srv/orcivo
if grep -q '^MINIO_ENDPOINT=orcivo-minio' .env; then
  cp .env .env.before-s3
  sed -i 's/^MINIO_ENDPOINT=.*/MINIO_ENDPOINT=s3.orcivo.com.br/; s/^MINIO_PORT=.*/MINIO_PORT=443/; s/^MINIO_USE_SSL=.*/MINIO_USE_SSL=true/' .env
  sudo docker compose up -d backend
  st=starting
  for i in $(seq 1 24); do
    sleep 5
    st=$(sudo docker inspect -f '{{.State.Health.Status}}' orcivo-backend)
    [ "$st" = healthy ] && break
  done
  if [ "$st" = healthy ]; then
    log "Backend now signs URLs for https://s3.orcivo.com.br"
  else
    cp .env.before-s3 .env && sudo docker compose up -d backend
    log "ROLLBACK: backend unhealthy with public MinIO endpoint, reverted"
  fi
fi
log "ACTIVATION_DONE"
