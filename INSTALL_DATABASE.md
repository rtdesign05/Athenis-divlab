# Guide d'installation — Base de données Athenis
# PostgreSQL 16 via Docker

## Fichier de base de données fourni
- `athenis_db_dump.sql` — dump complet (schéma + données de démo)
- Version PostgreSQL : 16.13
- Taille : ~149 KB

---

## ÉTAPE 1 — Installer Docker Desktop

1. Télécharger Docker Desktop : https://www.docker.com/products/docker-desktop/
2. Installer et lancer Docker Desktop
3. Vérifier l'installation :
   ```
   docker --version
   ```

---

## ÉTAPE 2 — Lancer le container PostgreSQL

Ouvrir un terminal (PowerShell ou CMD) et exécuter :

```powershell
docker run -d `
  --name athenis-db `
  -e POSTGRES_USER=athenis `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=athenis_db `
  -p 5432:5432 `
  postgres:16-alpine
```

Vérifier que le container tourne :
```powershell
docker ps
```
Vous devez voir `athenis-db` avec le statut `Up`.

---

## ÉTAPE 3 — Importer la base de données

Copier le fichier `athenis_db_dump.sql` dans le container et l'importer :

```powershell
# Copier le fichier SQL dans le container
docker cp athenis_db_dump.sql athenis-db:/tmp/dump.sql

# Importer la base de données
docker exec -i athenis-db psql -U athenis -d athenis_db -f /tmp/dump.sql
```

Vérifier l'import :
```powershell
docker exec athenis-db psql -U athenis -d athenis_db -c "\dt"
```
Vous devez voir une liste de ~60 tables.

---

## ÉTAPE 4 — Configurer le fichier .env

Dans le dossier racine du projet Athenis, créer/modifier le fichier `.env` :

```env
DATABASE_URL=postgresql://athenis:password@127.0.0.1:5432/athenis_db
```

---

## ÉTAPE 5 — Vérifier la connexion

```powershell
docker exec athenis-db psql -U athenis -d athenis_db -c "SELECT COUNT(*) FROM users;"
```

---

## Compte de test inclus dans les données

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@demo-sa.demo` | `Demo1234!` | ADMIN COMPANY |

---

## Commandes utiles

```powershell
# Démarrer le container (après un redémarrage PC)
docker start athenis-db

# Arrêter le container
docker stop athenis-db

# Voir les logs PostgreSQL
docker logs athenis-db

# Ouvrir un terminal PostgreSQL interactif
docker exec -it athenis-db psql -U athenis -d athenis_db

# Supprimer complètement le container (et ses données)
docker rm -f athenis-db
```

---

## Résolution de problèmes

### Port 5432 déjà utilisé
Si le port 5432 est déjà pris (autre PostgreSQL installé), utiliser le port 5433 :
```powershell
docker run -d --name athenis-db -e POSTGRES_USER=athenis -e POSTGRES_PASSWORD=password -e POSTGRES_DB=athenis_db -p 5433:5432 postgres:16-alpine
```
Et dans `.env` : `DATABASE_URL=postgresql://athenis:password@127.0.0.1:5433/athenis_db`

### Container arrêté après redémarrage PC
Docker Desktop ne lance pas automatiquement les containers. Exécuter :
```powershell
docker start athenis-db
```
Ou dans les paramètres Docker Desktop, activer "Start Docker Desktop when you log in".

### Erreur "role does not exist"
```powershell
docker exec athenis-db createuser -U postgres athenis --superuser
```

---

## Alternative sans Docker — Installation PostgreSQL directe (Windows)

1. Télécharger PostgreSQL 16 : https://www.postgresql.org/download/windows/
2. Installer avec le mot de passe `password` pour l'utilisateur `postgres`
3. Ouvrir pgAdmin ou psql et créer l'utilisateur + la base :
   ```sql
   CREATE USER athenis WITH PASSWORD 'password';
   CREATE DATABASE athenis_db OWNER athenis;
   GRANT ALL PRIVILEGES ON DATABASE athenis_db TO athenis;
   ```
4. Importer le dump :
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U athenis -d athenis_db -f athenis_db_dump.sql
   ```
