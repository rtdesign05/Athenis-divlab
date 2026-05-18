# Guide de migration — dépendances majeures Athenis

Ce document liste les **breaking changes** à attendre des prochaines migrations de dépendances majeures. À consulter quand Dependabot ouvre une PR.

## Prisma 5 → 6 → 7

**Stack actuelle** : `@prisma/client@5.15.0` + `prisma@5.15.0` (build CI affiche 5.22)

### Breaking changes 5 → 6
- **ESM par défaut** : `prisma.config.ts` au lieu de `prisma` dans `package.json` (pas critique tant qu'on n'utilise pas la nouvelle config)
- **`Prisma.Decimal` typing** : strict null-checking renforcé sur les colonnes Decimal — vérifier que tous les `Number(invoice.amountHT)` ne reçoivent pas `null`
- **`findMany` strict null** : les relations optionnelles renvoient `T | null` au lieu de `T | undefined` — adapter les `?? defaultValue`
- **Generator output** : `node_modules/.prisma/client/index.d.ts` change de structure interne — vérifier que le `grep AccountingZone` du CI passe

### Breaking changes 6 → 7 (Q3 2026 estimé)
- Refonte du moteur (Rust → Go) — perf attendue, breaking côté binaires natifs
- Suppression de plusieurs API legacy (`prisma db push --force-reset` notamment)

### Plan de test
1. Vérifier que `npm test -w apps/backend` passe (80 tests)
2. Vérifier que `npm run build -w apps/backend` produit un dist valide
3. Tester manuellement : créer une invoice + post + unpost (smoke test posting.service)
4. Vérifier l'admin `/comptes` (route qui avait régressé sur VN2)

### Rollback
```bash
git revert <PR-merge-commit>
npm ci
npm run prisma:generate -w apps/backend
```

---

## React 18 → 19

**Stack actuelle** : `react@18.3.1` + `react-router-dom@6.23.1`

### Breaking changes 18 → 19
- **`ref` comme prop** : `forwardRef` devient optionnel (rétrocompatible)
- **`use()` hook** : nouveau, permet d'unwrap des Promises dans le render
- **Concurrent rendering par défaut** : peut révéler des effets de bord cachés
- **`react-router-dom` 6 → 7** : breaking sur `loaders`/`actions`, RSC server components

### Plan de test
1. Smoke test : login → dashboard → ajouter une facture
2. Vérifier la PWA install + Tauri desktop
3. Vérifier que les `useTranslation()` (i18n) continuent de fonctionner

---

## Express 4 → 5

**Stack actuelle** : `express@4.19.2`

### Breaking changes
- **Async error handling auto** : les `try/catch` deviennent moins critiques dans les handlers
- **`req.body` parser** intégré (plus besoin de `body-parser` séparé)
- **Path-to-regexp v8** : la syntaxe `:param(regex)` n'est plus supportée — adapter les routes
- **`res.redirect`** : signature change

### Risque
**Élevé** — beaucoup de code dépend du comportement Express 4. À reporter après Q4 2026.

---

## Tauri 2 → 3

**Stack actuelle** : `@tauri-apps/api@2.10.1` + `@tauri-apps/cli@2.10.1`

### Breaking changes anticipés
- Permissions refondues (déjà v2 → v3 a changé en avant-première)
- Bundler `tauri.conf.json` schema modifié

### Plan
- Attendre que Tauri 3 soit stable + au moins 3 mois d'usage public
- Refaire les builds MSI/NSIS/portable après migration et tester

---

## ESLint 8 → 9 (flat config)

**Stack actuelle** : `eslint@8.57.0` (en EOL)

### Breaking changes
- **Flat config** : `.eslintrc.json` → `eslint.config.js`
- Plugins doivent être MAJ pour la flat config

### Plan de test
1. Convertir `apps/frontend/.eslintrc.json` en `apps/frontend/eslint.config.js`
2. Vérifier que `npm run lint -w apps/frontend` passe
3. Le job CI `Lint Frontend` est en `continue-on-error: true` — pas de risque

---

## Zod 3 → 4

**Stack actuelle** : `zod@^3.23.8` (note : v4 partiellement installé en `node_modules/zod/src/v4`)

### Breaking changes
- **`z.coerce.date()`** : behavior changes sur les strings invalides
- **`.partial()`** : `optional` vs `nullable` distinction
- **superRefine** : nouvelle signature `addIssue`

### Impact codé
- Les DTOs `CreateInvoiceDto`, `UpdatePurchaseOrderDto` utilisent `superRefine` — à tester en priorité (47 tests sur DTOs + 5 sur posting.helpers couvrent ces cas)

---

## bcryptjs 2 → 3

### Breaking changes
- Nouveau encoding interne
- Hashes existants restent compatibles (vérifié)
- API quasi-identique

### Risque
Faible. La migration peut se faire en passant.

---

## Stratégie globale

1. **Ne JAMAIS merger 2 PRs Dependabot majeures en parallèle** — risque d'attribution d'erreur impossible
2. **Toujours lancer les 80 tests avant + après** une migration majeure
3. **Smoke test manuel** sur le compte de démo (`admin@demo-sa.demo` / `Demo1234!`) :
   - Créer une facture
   - La passer en SENT (déclenche posting)
   - Annuler (déclenche unpost + reverse stock)
   - Vérifier que la balance est équilibrée
4. **Tag git** avant chaque migration majeure : `git tag pre-prisma-6` puis push

## Ordre conseillé

1. ESLint 8 → 9 (faible risque, prépare le terrain pour les autres)
2. Zod 3 → 4 (tests existants couvrent les DTOs critiques)
3. **Prisma 5 → 6** (le plus risqué pour la compta — sprint dédié)
4. React 18 → 19 (après Prisma stabilisé)
5. Tauri 2 → 3 (attendre maturité)
6. Express 4 → 5 (en dernier, refactor lourd)
