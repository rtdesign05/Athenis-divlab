# Athenis

SaaS de gestion d'entreprise multi-tenant pour PME — comptabilité **SYSCOHADA** (Afrique francophone) et **PCG France**. Modules : gestion commerciale, RH/paie, comptabilité, juridique, ESG, fiscalité.

## Stack

| Couche | Tech |
|---|---|
| Backend | Node 20 · Express 4 · Prisma 5 · PostgreSQL 16 · Zod · JWT |
| Frontend Web | React 18 · Vite 5 · TypeScript · React Query · Tailwind |
| Desktop / Mobile | Tauri 2 (Rust + WebView2/WKWebView) |
| Monorepo | npm workspaces — `apps/backend`, `apps/frontend`, `packages/shared-types` |

## Démarrage rapide (dev)

```bash
# 1. Installer les dépendances
npm ci

# 2. Configurer .env à la racine (modèle .env.example)
cp .env.example .env

# 3. Générer le client Prisma + appliquer les migrations
npm run prisma:generate
npm run prisma:migrate

# 4. (Optionnel) Charger des données de démo
npm run seed -w apps/backend

# 5. Démarrer
npm run dev  # backend :3001 + frontend :5173 + types --watch
```

Compte de test :
- `admin@demo-sa.demo` / `Demo1234!` — ADMIN COMPANY

## Architecture

```
apps/
  backend/                       Express + Prisma + PostgreSQL (:3001)
    src/modules/<domain>/
      <domain>.routes.ts         Express router (auth + checkModule + DTO)
      <domain>.service.ts        Logique métier + Prisma
      <domain>.dto.ts            Schémas Zod (input/output)
    prisma/
      schema.prisma              Source de vérité du modèle DB
      migrations/                Migrations versionnées (linéaires)

  frontend/                      React + Vite (:5173) — proxie /api → :3001
    src/
      pages/app/<module>/        Pages métier (lazy-loaded)
      features/                  Composants riches (auth, ai, desktop…)
      services/                  Clients API (axios, typed via shared-types)
      lib/                       Utilitaires partagés (api, queryClient…)

packages/
  shared-types/                  Types TypeScript partagés front/back
                                 (compilé en dist/, consommé via @athenis/shared-types)
```

## Conventions de code

### Modules backend

Tout nouveau module suit ce pattern strict (cf. 24+ modules existants) :
1. **`<module>.dto.ts`** — schémas Zod pour valider tous les inputs API
2. **`<module>.service.ts`** — logique pure, prend `companyId` en premier argument, ne touche pas à `req`/`res`
3. **`<module>.routes.ts`** — `Router()` Express, `authenticate` + `checkModule` + `validateRequest(Dto)` → délègue au service

### Isolation multi-tenant

**Règle d'or** : toute requête Prisma backend DOIT filtrer par `companyId`. Pour les utilisateurs `isRestricted=true`, ajouter `getAgenceFilter(user)` qui restreint par `agenceId`.

Pour les mutations qui prennent une FK depuis le body (`clientId`, `articleId`, `fiscalYearId`, etc.), **toujours vérifier l'ownership** avant le `create`/`update` :

```ts
const client = await prisma.client.findFirst({
  where: { id: data.clientId, companyId },
  select: { id: true },
})
if (!client) throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND')
```

### Constantes fiscales

Les taux et seuils légaux sont centralisés :
- Backend : `apps/backend/src/lib/taxConstants.ts`
- Frontend : `apps/frontend/src/lib/taxConstants.ts`

À chaque loi de finances, modifier UNIQUEMENT ces fichiers.

### Internationalisation (i18n)

`react-i18next` est bootstrappé dans `apps/frontend/src/lib/i18n.ts`.
**Tout nouveau libellé utilisateur** doit passer par `t('cle')` plutôt qu'être
hardcodé en français :

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <button>{t('common.save')}</button>
}
```

Les libellés sont dans `apps/frontend/src/locales/fr/common.json`. Convention
de clés : `common.*` pour le générique, `<module>.<page>.<elt>` pour le
spécifique. Pour activer une langue cible (EN/AR), dupliquer le JSON et
ajouter à `supportedLngs` dans `i18n.ts`.

### Migrations Prisma

```bash
# Après modification de schema.prisma
npm run prisma:migrate -- --name <nom_descriptif>
```

Les migrations sont **linéaires** (pas de squash/rewrite). Tout commit qui modifie `schema.prisma` DOIT être accompagné de sa migration.

## Tests

```bash
npm test -w apps/backend            # vitest, fonctions pures + DTOs
npm run test:watch -w apps/backend  # mode watch
npm run test:coverage -w apps/backend  # rapport HTML dans coverage/

npm run typecheck    # tsc --noEmit sur back + front
npm run lint -w apps/frontend
```

Coverage actuelle : tests sur les fonctions critiques pures (`accountCodes`,
`taxConstants`) + les schémas Zod stricts (`invoices.dto`, `purchases.dto`).
À étendre progressivement aux services DB-bound via supertest + une base de
test (cf. `vitest.config.ts`).

## Déploiement

5 cibles supportées :

| Plateforme | Comment |
|---|---|
| Web | Docker Compose → `infra/docker-compose.yml` |
| PWA | Auto-activée sur le frontend web (manifest + service worker) |
| Desktop Windows | `apps/frontend/BUILD_DESKTOP.md` |
| Desktop macOS/Linux | Idem — exécuter sur l'OS cible |
| Mobile Android/iOS | `apps/frontend/BUILD_MOBILE.md` |

Guide pas-à-pas complet pour profane : `GUIDE_DEPLOIEMENT_ATHENIS.pdf` (en racine du repo).

## Liens utiles

- [CLAUDE.md](./CLAUDE.md) — Guide pour assistant IA travaillant sur ce repo
- [DEPLOY.md](./DEPLOY.md) — Procédure de déploiement détaillée
- [INSTALL_DATABASE.md](./INSTALL_DATABASE.md) — Setup PostgreSQL local
- Issues : utiliser les templates GitHub (`.github/`)

## Licence

Propriétaire — © Athenis 2026.
# Test auto-deploy : 2026-05-20 23:42:12
