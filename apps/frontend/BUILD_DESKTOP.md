# Générer l'installateur Athenis Desktop

## Prérequis

- [Rust](https://rustup.rs/) (stable)
- Node.js 18+
- **Windows** : Visual Studio C++ Build Tools (inclus avec VS 2022)
- **macOS** : Xcode Command Line Tools (`xcode-select --install`)

## Lancer en développement

```bash
cd apps/frontend
npm run tauri:dev
```

Ouvre une fenêtre native avec rechargement à chaud.

## Générer l'installateur

```bash
cd apps/frontend
npm run tauri:build
```

Les fichiers générés se trouvent dans `src-tauri/target/release/bundle/` :

| Plateforme | Fichier |
|---|---|
| Windows | `nsis/Athenis_1.0.0_x64-setup.exe` |
| Windows (MSI) | `msi/Athenis_1.0.0_x64_en-US.msi` |
| macOS | `dmg/Athenis_1.0.0_x64.dmg` |
| macOS (app) | `macos/Athenis.app` |
| Linux | `deb/athenis_1.0.0_amd64.deb` |

## Configuration de l'URL serveur

L'app Tauri ne peut pas utiliser une URL relative `/api` (pas de Nginx local).
Elle doit pointer vers le serveur Athenis déployé. Deux modes possibles :

### Mode 1 — URL figée au build (entreprise unique)

Renseigne `VITE_API_URL` dans `apps/frontend/.env.production` **avant** de
builder. L'app utilisera toujours cette URL.

```env
VITE_API_URL=https://athenis.mon-entreprise.com/api
```

### Mode 2 — URL configurée au premier lancement (recommandé pour distribution)

Laisse `VITE_API_URL=` **vide** dans `.env.production`. Au premier démarrage,
l'app affiche un écran demandant à l'utilisateur l'URL de son serveur. La
valeur est testée via `GET /api/health` puis stockée dans `localStorage`
(clé `athenis:api-url`).

Cet écran réapparaît tant que la configuration n'est pas réussie.

## Notes

- En dev, l'app Tauri se connecte au backend via `http://localhost:3001` par défaut
- La signature de code (code signing) est optionnelle mais recommandée pour la distribution publique
