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

## Notes

- L'app Tauri se connecte au backend via `http://localhost:3001` par défaut en dev
- En production, configurer `VITE_API_URL` pour pointer vers le serveur déployé
- La signature de code (code signing) est optionnelle mais recommandée pour la distribution publique
