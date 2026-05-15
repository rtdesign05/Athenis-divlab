# Guide de déploiement — Athenis

## Sommaire

1. [Prérequis serveur](#1-prérequis-serveur)
2. [Première installation](#2-première-installation)
3. [Configuration des secrets](#3-configuration-des-secrets)
4. [Certificats SSL (Let's Encrypt)](#4-certificats-ssl-lets-encrypt)
5. [Démarrage des services](#5-démarrage-des-services)
6. [CI/CD — GitHub Actions](#6-cicd--github-actions)
7. [Sauvegardes et restauration](#7-sauvegardes-et-restauration)
8. [Mise à jour / re-déploiement](#8-mise-à-jour--re-déploiement)
9. [Revenir à une version antérieure](#9-revenir-à-une-version-antérieure)
10. [SMTP — Configuration email](#10-smtp--configuration-email)
11. [Surveillance et logs](#11-surveillance-et-logs)
12. [Checklist avant mise en production](#12-checklist-avant-mise-en-production)

---

## 1. Prérequis serveur

| Composant | Version minimale | Rôle |
|---|---|---|
| Ubuntu / Debian | 22.04 LTS | OS recommandé |
| Docker | 24+ | Conteneurisation |
| Docker Compose | v2 (plugin) | Orchestration |
| Git | 2.x | Récupération du code |
| Certbot (via Docker) | inclus | Certificats SSL |

**Ports à ouvrir dans le pare-feu :**
```
80/tcp   → HTTP (redirection vers HTTPS + ACME challenge)
443/tcp  → HTTPS
22/tcp   → SSH (accès administrateur)
```

**Installation de Docker sur Ubuntu :**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # puis reconnectez-vous
```

---

## 2. Première installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/ulrichmouafo/athenis.git /opt/athenis
cd /opt/athenis

# 2. Copier et configurer l'environnement
cp .env.production.example .env
nano .env   # Remplir toutes les valeurs CHANGE_ME

# 3. Rendre les scripts exécutables
chmod +x scripts/*.sh

# 4. Créer le répertoire de sauvegardes
sudo mkdir -p /var/backups/athenis
sudo chown $USER:$USER /var/backups/athenis
```

---

## 3. Configuration des secrets

Générez des secrets cryptographiquement sûrs **sur le serveur** :

```bash
# JWT_SECRET (min. 32 chars)
echo "JWT_SECRET=$(openssl rand -hex 32)"

# JWT_REFRESH_SECRET
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"

# ENCRYPTION_KEY (exactement 32 chars — AES-256)
echo "ENCRYPTION_KEY=$(openssl rand -hex 16)"

# Mot de passe PostgreSQL
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/')"
```

Copiez ces valeurs dans votre `.env`. **Ne les commitez jamais.**

---

## 4. Certificats SSL (Let's Encrypt)

### Prérequis
- Le domaine (ex. `app.athenis.io`) doit déjà pointer vers l'IP du serveur
- Les ports 80 et 443 doivent être accessibles

### Initialisation (une seule fois)

```bash
# Remplacez par votre vrai domaine et email
./scripts/ssl-init.sh app.athenis.io admin@athenis.io
```

Ce script :
1. Génère un certificat auto-signé temporaire pour démarrer nginx
2. Démarre nginx en HTTP
3. Lance certbot en mode webroot pour obtenir le certificat Let's Encrypt
4. Copie les certificats dans `infra/nginx/certs/`
5. Recharge nginx avec le vrai certificat
6. Configure un cron pour le renouvellement automatique (tous les 90 jours)

### Renouvellement manuel (si nécessaire)
```bash
cd infra
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### Vérifier l'expiration
```bash
openssl x509 -in infra/nginx/certs/fullchain.pem -noout -enddate
```

---

## 5. Démarrage des services

```bash
cd infra

# Premier démarrage (construit les images)
docker compose build
docker compose up -d

# Vérifier que tout tourne
docker compose ps

# Appliquer les migrations Prisma
docker compose exec backend npx prisma migrate deploy

# (Optionnel) Données de démo
docker compose exec backend npm run seed
```

### Vérification post-démarrage
```bash
# Logs en temps réel
docker compose logs -f

# Test rapide de l'API
curl -s https://votre-domaine.com/api/health | jq
```

---

## 6. CI/CD — GitHub Actions

Le fichier `.github/workflows/ci.yml` s'exécute automatiquement sur chaque push/PR vers `main` :

| Job | Déclencheur | Durée estimée |
|---|---|---|
| `typecheck-backend` | push + PR | ~2 min |
| `typecheck-frontend` | push + PR | ~2 min |
| `build-backend` | après typecheck | ~3 min |
| `build-frontend` | après typecheck | ~3 min |
| `docker-build` | push main uniquement | ~5 min |

**Pour activer le déploiement automatique** (optionnel), ajoutez ces secrets dans GitHub :
`Settings → Secrets → Actions` :

| Secret | Valeur |
|---|---|
| `SSH_HOST` | IP ou domaine du serveur |
| `SSH_USER` | Utilisateur SSH (ex. `ubuntu`) |
| `SSH_KEY` | Clé privée SSH (contenu de `~/.ssh/id_rsa`) |

Puis décommentez le job `deploy` dans `ci.yml` (actuellement en commentaire).

---

## 7. Sauvegardes et restauration

### Lancer une sauvegarde manuelle
```bash
./scripts/backup.sh
# Backup créé dans /var/backups/athenis/athenis_YYYYMMDD_HHMMSS.sql.gz
```

### Configurer les sauvegardes automatiques
```bash
# Sauvegarde quotidienne à 2h du matin, conservation 30 jours
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/athenis/scripts/backup.sh") | crontab -
```

### Lister les sauvegardes disponibles
```bash
./scripts/restore.sh --list
```

### Restaurer depuis une sauvegarde
```bash
./scripts/restore.sh /var/backups/athenis/athenis_20261201_020000.sql.gz
```

> ⚠️ La restauration écrase la base actuelle. Une confirmation est demandée.

### Rétention recommandée
- **Quotidien** : 7 derniers jours (par défaut)
- **Hebdomadaire** : 4 dernières semaines
- **Mensuel** : 12 derniers mois

Pour une rétention longue durée, copiez les sauvegardes vers un stockage externe (S3, Scaleway Object Storage, Backblaze B2) :
```bash
# Exemple avec aws cli
aws s3 cp /var/backups/athenis/ s3://mon-bucket/backups/ --recursive
```

---

## 8. Mise à jour / re-déploiement

```bash
# Déploiement standard (avec sauvegarde préalable + pull + rebuild)
./scripts/deploy.sh

# Sans sauvegarde (déconseillé en prod)
./scripts/deploy.sh --skip-backup

# Sans pull (si le code est déjà à jour)
./scripts/deploy.sh --skip-pull
```

Le script :
1. Sauvegarde la base de données
2. Récupère le dernier code (`git pull`)
3. Reconstruit les images Docker
4. Redémarre les services (`docker compose up -d`)
5. Exécute les migrations Prisma
6. Crée un tag git `deploy-TIMESTAMP`

---

## 9. Revenir à une version antérieure

### Voir les versions disponibles
```bash
git tag --sort=-version:refname | head -20
# ou
git log --oneline -20
```

### Revenir à un tag spécifique
```bash
# Sauvegarder d'abord !
./scripts/backup.sh

# Checkout vers la version cible
git checkout v1.0.0   # ou deploy-20261201_120000

# Re-déployer
./scripts/deploy.sh --skip-pull
```

### Revenir au dernier commit fonctionnel
```bash
git log --oneline
git checkout abc1234   # remplacez par le bon commit hash
./scripts/deploy.sh --skip-pull
```

---

## 10. SMTP — Configuration email

Les emails sont utilisés pour : invitation de collaborateurs, réinitialisation de mot de passe, notifications.

### Option recommandée : Brevo (ex-Sendinblue)
- Gratuit : jusqu'à 300 emails/jour
- Inscription : https://www.brevo.com
- Paramètres → SMTP & API → Générer une clé SMTP

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@domaine.com
SMTP_PASS=votre-cle-smtp-brevo
SMTP_FROM=Athenis <noreply@votre-domaine.com>
```

### Autres options
| Provider | Gratuit | Lien |
|---|---|---|
| Resend | 100/jour | https://resend.com |
| Mailgun | 100/jour | https://mailgun.com |
| Postmark | 100/mois | https://postmarkapp.com |

> Si SMTP n'est pas configuré, les emails sont loggués dans la console (mode dégradé). Le serveur reste fonctionnel.

---

## 11. Surveillance et logs

### Logs en temps réel
```bash
cd infra
docker compose logs -f                  # tous les services
docker compose logs -f backend          # backend seulement
docker compose logs -f nginx            # nginx seulement
```

### Santé des conteneurs
```bash
docker compose ps
docker stats                            # CPU/RAM en temps réel
```

### Logs nginx
```bash
docker compose exec nginx tail -f /var/log/nginx/access.log
docker compose exec nginx tail -f /var/log/nginx/error.log
```

### Monitoring recommandé (optionnel)
- **Sentry** : erreurs applicatives (configurer `SENTRY_DSN` dans `.env`)
- **UptimeRobot** : surveillance de disponibilité (gratuit, https://uptimerobot.com)
- **Grafana + Prometheus** : métriques avancées (pour plus tard)

---

## 12. Checklist avant mise en production

### ❌ Bloquants (obligatoires)
- [ ] Tous les `CHANGE_ME` remplacés dans `.env`
- [ ] `JWT_SECRET` et `JWT_REFRESH_SECRET` générés avec `openssl rand -hex 32`
- [ ] `ENCRYPTION_KEY` généré avec `openssl rand -hex 16`
- [ ] Certificat SSL configuré (`./scripts/ssl-init.sh`)
- [ ] Domaine DNS configuré et pointant vers le serveur
- [ ] Migrations Prisma exécutées (`npx prisma migrate deploy`)
- [ ] Sauvegarde automatique configurée (cron)

### ⚠️ Recommandés
- [ ] SMTP configuré (emails fonctionnels)
- [ ] `NODE_ENV=production` dans `.env`
- [ ] `FRONTEND_URL` pointant vers le vrai domaine
- [ ] Pare-feu : seuls ports 22, 80, 443 ouverts
- [ ] Sentry DSN configuré pour le monitoring des erreurs
- [ ] Test de restauration de sauvegarde effectué
- [ ] Branch protection activée sur `main` (GitHub → Settings → Branches)

### ✅ Vérification finale
```bash
# 1. Services en cours
docker compose ps

# 2. Test HTTPS
curl -I https://votre-domaine.com

# 3. Test API
curl https://votre-domaine.com/api/health

# 4. Test connexion
# Ouvrir https://votre-domaine.com et se connecter avec admin@demo-sa.demo
```
