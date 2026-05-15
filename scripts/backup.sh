#!/usr/bin/env bash
# =============================================================================
# Athenis — Sauvegarde PostgreSQL
# Usage : ./scripts/backup.sh [--dir /path/to/backup] [--keep 7]
# =============================================================================
set -euo pipefail

# ── Valeurs par défaut ────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/athenis}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOGFILE="$BACKUP_DIR/backup.log"

# ── Lecture des arguments ─────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)   BACKUP_DIR="$2"; shift 2 ;;
    --keep)  RETENTION_DAYS="$2"; shift 2 ;;
    *)       echo "Option inconnue : $1" >&2; exit 1 ;;
  esac
done

# ── Chargement .env si disponible ────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERREUR : DATABASE_URL non défini. Configurez .env ou exportez la variable." >&2
  exit 1
fi

# ── Création du répertoire de sauvegarde ──────────────────────────────────────
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/athenis_${TIMESTAMP}.sql.gz"

# ── Sauvegarde ────────────────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Démarrage de la sauvegarde → $BACKUP_FILE" | tee -a "$LOGFILE"

pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-password \
  --verbose 2>>"$LOGFILE" \
  | gzip -9 > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sauvegarde créée : $BACKUP_FILE ($SIZE)" | tee -a "$LOGFILE"

# ── Rotation : suppression des sauvegardes trop anciennes ────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Suppression des sauvegardes de plus de $RETENTION_DAYS jours..." | tee -a "$LOGFILE"
find "$BACKUP_DIR" -name "athenis_*.sql.gz" -mtime "+$RETENTION_DAYS" -print -delete 2>>"$LOGFILE" | tee -a "$LOGFILE"

# ── Résumé ────────────────────────────────────────────────────────────────────
COUNT=$(find "$BACKUP_DIR" -name "athenis_*.sql.gz" | wc -l)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sauvegardes conservées : $COUNT" | tee -a "$LOGFILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sauvegarde terminée avec succès." | tee -a "$LOGFILE"
