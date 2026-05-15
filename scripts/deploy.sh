#!/usr/bin/env bash
# =============================================================================
# Athenis — Script de déploiement production
# Usage : ./scripts/deploy.sh [--skip-backup] [--skip-pull]
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$ROOT_DIR/infra"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

SKIP_BACKUP=false
SKIP_PULL=false

# ── Arguments ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-backup) SKIP_BACKUP=true; shift ;;
    --skip-pull)   SKIP_PULL=true;   shift ;;
    *) echo "Option inconnue : $1" >&2; exit 1 ;;
  esac
done

echo "============================================================"
echo "  Athenis — Déploiement  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# ── 1. Sauvegarde préventive ──────────────────────────────────────────────────
if [[ "$SKIP_BACKUP" == "false" ]]; then
  echo ""
  echo ">>> [1/5] Sauvegarde de la base de données..."
  bash "$SCRIPT_DIR/backup.sh" || {
    echo "⚠️  Sauvegarde échouée. Annulation du déploiement."
    echo "   (Utilisez --skip-backup pour ignorer)"
    exit 1
  }
else
  echo ">>> [1/5] Sauvegarde ignorée (--skip-backup)"
fi

# ── 2. Récupération du code ───────────────────────────────────────────────────
if [[ "$SKIP_PULL" == "false" ]]; then
  echo ""
  echo ">>> [2/5] Mise à jour du code source..."
  cd "$ROOT_DIR"
  git fetch origin main
  git diff --stat HEAD origin/main
  git merge --ff-only origin/main
  echo "    Commit actuel : $(git rev-parse --short HEAD)"
else
  echo ">>> [2/5] Pull ignoré (--skip-pull)"
fi

# ── 3. Construction des images Docker ────────────────────────────────────────
echo ""
echo ">>> [3/5] Construction des images Docker..."
cd "$INFRA_DIR"
docker compose build --no-cache backend frontend

# ── 4. Redémarrage des services ───────────────────────────────────────────────
echo ""
echo ">>> [4/5] Redémarrage des services..."
docker compose up -d --remove-orphans

# ── 5. Migrations Prisma ──────────────────────────────────────────────────────
echo ""
echo ">>> [5/5] Exécution des migrations Prisma..."
docker compose exec -T backend npx prisma migrate deploy

echo ""
echo "============================================================"
echo "  Déploiement terminé avec succès ✓"
echo "  Tag de déploiement : deploy-$TIMESTAMP"
echo "============================================================"

# Créer un tag git optionnel
cd "$ROOT_DIR"
git tag "deploy-$TIMESTAMP" 2>/dev/null && echo "  Tag git créé : deploy-$TIMESTAMP" || true

# ── Vérification post-déploiement ─────────────────────────────────────────────
echo ""
echo ">>> Vérification de santé des services..."
sleep 5
docker compose ps
echo ""
echo "Logs récents du backend :"
docker compose logs --tail=10 backend
