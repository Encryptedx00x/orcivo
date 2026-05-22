#!/bin/bash
# backup-volumes.sh — Backup automático dos volumes Docker
# Executar via cron na VPS: 0 2 * * * /opt/orcivo/infra/scripts/backup-volumes.sh
# Requer: restic instalado (apt install restic) ou rclone configurado
# Destino: /mnt/backups/ (local) — configurar backup remoto na Fase 1+

set -euo pipefail

BACKUP_DIR="/mnt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/orcivo-backup.log"
COMPOSE_DIR="/opt/orcivo/infra"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Iniciando backup $TIMESTAMP ==="

# Criar diretório de backup
mkdir -p "$BACKUP_DIR/$TIMESTAMP"

# Parar serviços para backup consistente (opcional — pode fazer hot backup do postgres)
log "Executando pg_dump para backup consistente do PostgreSQL..."
cd "$COMPOSE_DIR"
docker compose exec -T postgres pg_dumpall -U "${POSTGRES_USER:-orcivo}" \
    > "$BACKUP_DIR/$TIMESTAMP/postgres_dump.sql"
log "pg_dump concluído: $BACKUP_DIR/$TIMESTAMP/postgres_dump.sql"

# Backup dos volumes MinIO (arquivos)
log "Copiando dados MinIO..."
cp -r /mnt/data/minio "$BACKUP_DIR/$TIMESTAMP/minio_data" 2>/dev/null || \
    log "AVISO: MinIO data vazio ou inacessível"

# Compactar backup do dia
log "Compactando backup..."
tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$BACKUP_DIR/$TIMESTAMP"

# Manter apenas os últimos 7 backups locais
log "Removendo backups antigos (mantendo 7 dias)..."
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +8 | xargs -r rm -f

BACKUP_SIZE=$(du -sh "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" | cut -f1)
log "Backup concluído: backup_$TIMESTAMP.tar.gz ($BACKUP_SIZE)"
log "=== Backup finalizado ==="
