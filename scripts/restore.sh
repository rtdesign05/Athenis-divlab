#!/usr/bin/env bash
# =============================================================================
# Athenis — Restauration PostgreSQL
# Usage : ./scripts/restore.sh <fichier_backup.sql.gz>
#         ./scripts/restore.sh --list     # lister les sauvegardes disponibles
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/athenis}"

# ── Chargement .env ───────────────────────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERREUR : DATABASE_URL non défini." >&2
  exit 1
fi

# ── Lister les sauvegardes ────────────────────────────────────────────────────
if [[ "${1:-}" == "--list" ]]; then
  echo "Sauvegardes disponibles dans $BACKUP_DIR :"
  find "$BACKUP_DIR" -name "athenis_*.sql.gz" -printf "%T+ %p\n" 2>/dev/null \
    | sort -r \
    | head -20 \
    || echo "Aucune sauvegarde trouvée."
  exit 0
fi

# ── Vérification du fichier ───────────────────────────────────────────────────
BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage : $0 <fichier_backup.sql.gz>"
  echo "        $0 --list"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERREUR : Fichier introuvable : $BACKUP_FILE" >&2
  exit 1
fi

# ── Confirmation ──────────────────────────────────────────────────────────────
echo "⚠️  ATTENTION : La restauration va ÉCRASER la base de données actuelle."
echo "   Fichier source : $BACKUP_FILE"
echo "   Base cible     : $DATABASE_URL"
echo ""
read -r -p "Continuer ? (tapez 'oui' pour confirmer) : " CONFIRM
if [[ "$CONFIRM" != "oui" ]]; then
  echo "Restauration annulée."
  exit 0
fi

# ── Restauration ─────────────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauration depuis $BACKUP_FILE..."

# Extraire le nom de la DB depuis DATABASE_URL
DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/||' | cut -d'?' -f1)

# Terminer les connexions actives
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Restaurer
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" --quiet

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauration terminée avec succès."
