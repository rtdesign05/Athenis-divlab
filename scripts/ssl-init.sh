#!/usr/bin/env bash
# =============================================================================
# Athenis — Initialisation des certificats SSL Let's Encrypt
# Usage : ./scripts/ssl-init.sh <domaine> <email>
# Exemple : ./scripts/ssl-init.sh app.athenis.io admin@athenis.io
#
# Prérequis :
#   - Le domaine doit pointer sur ce serveur (DNS configuré)
#   - Les ports 80 et 443 doivent être ouverts
#   - Docker et docker compose doivent être installés
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$ROOT_DIR/infra"
CERTS_DIR="$INFRA_DIR/nginx/certs"

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage : $0 <domaine> <email>"
  echo "Exemple : $0 app.athenis.io admin@athenis.io"
  exit 1
fi

echo "============================================================"
echo "  SSL Init — $DOMAIN"
echo "============================================================"

# ── Étape 1 : Créer un certificat auto-signé temporaire ───────────────────────
# (permet à nginx de démarrer avant d'obtenir le vrai certificat)
echo ""
echo ">>> [1/4] Génération d'un certificat auto-signé temporaire..."
mkdir -p "$CERTS_DIR"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "$CERTS_DIR/privkey.pem" \
  -out    "$CERTS_DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN" 2>/dev/null
echo "    Certificat temporaire créé."

# ── Étape 2 : Démarrer nginx avec le certificat temporaire ────────────────────
echo ""
echo ">>> [2/4] Démarrage de nginx (mode bootstrap)..."
cd "$INFRA_DIR"
docker compose up -d nginx
sleep 3
echo "    Nginx démarré."

# ── Étape 3 : Obtenir le certificat Let's Encrypt via Certbot ────────────────
echo ""
echo ">>> [3/4] Obtention du certificat Let's Encrypt pour $DOMAIN..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# ── Étape 4 : Copier les certificats et recharger nginx ──────────────────────
echo ""
echo ">>> [4/4] Copie des certificats et rechargement de nginx..."
# Copie depuis le volume certbot vers nginx/certs
docker compose run --rm --entrypoint sh certbot -c "
  cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /certs/fullchain.pem
  cp /etc/letsencrypt/live/$DOMAIN/privkey.pem   /certs/privkey.pem
  echo 'Certificats copiés.'
" 2>/dev/null || {
  # Fallback : copie directe depuis le volume Docker
  CERT_VOLUME=$(docker compose run --rm certbot cat /etc/letsencrypt/live/$DOMAIN/fullchain.pem)
  KEY_VOLUME=$(docker compose run --rm certbot cat /etc/letsencrypt/live/$DOMAIN/privkey.pem)
  echo "$CERT_VOLUME" > "$CERTS_DIR/fullchain.pem"
  echo "$KEY_VOLUME"  > "$CERTS_DIR/privkey.pem"
}

# Recharger nginx avec les vrais certs
docker compose exec nginx nginx -s reload
echo "    Nginx rechargé avec le certificat Let's Encrypt."

# ── Configuration du renouvellement automatique ───────────────────────────────
echo ""
echo ">>> Configuration du renouvellement automatique..."
CRON_CMD="0 3 * * * cd $INFRA_DIR && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -
echo "    Cron configuré : renouvellement à 3h00 chaque nuit."

echo ""
echo "============================================================"
echo "  SSL configuré avec succès ✓"
echo "  Domaine    : https://$DOMAIN"
echo "  Expiration : $(openssl x509 -in $CERTS_DIR/fullchain.pem -noout -enddate 2>/dev/null)"
echo "============================================================"
