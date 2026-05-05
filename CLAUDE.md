# Athenis — Guide Claude Code

## ⚠️ Version active — lire en premier

Ce dossier **est** la version de production en cours de développement.  
Branche : `claude/naughty-noyce-e77d1b` — 90+ pages, tous les modules actifs.

Il existe un autre dossier `C:\Users\admin\Documents\Athenis` (branche `dev`) qui est une **ancienne version** avec ~10 pages seulement.  
**Ne jamais démarrer les serveurs depuis ce dossier-là.**

---

## Démarrer les serveurs

Toujours depuis **ce worktree** (`C:\Users\admin\Documents\Athenis\.claude\worktrees\naughty-noyce-e77d1b`) :

```powershell
# Backend (port 3001) — charge automatiquement ../../.env
cd apps/backend && npm run dev

# Frontend (port 5173)
cd apps/frontend && npm run dev
```

> Le script `npm run dev` du backend utilise `--env-file=../../.env`.  
> Ne pas lancer `npx tsx watch src/index.ts` directement : les variables d'environnement ne seraient pas chargées.

---

## Base de données

Une seule base PostgreSQL partagée :
```
postgresql://athenis:password@127.0.0.1:5432/athenis_db
```
Définie dans `../../.env` (racine du worktree).

## Compte de test

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@demo-sa.demo` | `Demo1234!` | ADMIN COMPANY |

---

## Architecture

```
apps/
  backend/   → Express + Prisma + PostgreSQL (port 3001)
  frontend/  → React + Vite (port 5173) — proxie /api → :3001
packages/
  shared-types/  → Types partagés frontend/backend
```

## Modules actifs

`gestion` · `rh` · `comptabilite` · `juridique` · `esg`

## Prisma

```bash
# Depuis apps/backend
npm run prisma:generate   # après modification schema.prisma
npm run seed              # peupler la DB avec des données de démo
```
