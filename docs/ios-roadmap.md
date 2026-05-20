# Roadmap iOS Athenis

Document de référence pour planifier la version iPhone/iPad d'Athenis quand le moment sera venu.

## TL;DR

- **Tauri 2 est déjà en place** (utilisé pour la version Windows). Supporte iOS nativement.
- Même base de code React → un seul codebase pour Web + Windows + iOS + Android.
- **Bloqueurs côté Apple** :
  - Mac requis pour builder (impossible depuis Windows/Linux)
  - Apple Developer Program ($99/an obligatoire)
  - Process de review App Store (1-7 jours, peut être rejeté)
  - Commission 30% (an 1) / 15% (subscriptions, an 2+) sur paiements in-app

## 4 niveaux d'implementation par ordre croissant d'effort

### Niveau 0 — PWA (gratuit, déjà fonctionnel)

Athenis est déjà une PWA. Les users iPhone peuvent :
1. Ouvrir Safari sur https://athenis360.com
2. Bouton "Partager" → "Sur l'écran d'accueil"
3. L'app apparaît comme icône, plein écran, sans la barre Safari

**Pour améliorer cette expérience sans investir dans App Store** :
- Vérifier les meta tags iOS Safari (`apple-mobile-web-app-capable`, etc.)
- Designer des splash screens iOS (différentes tailles d'iPhone/iPad)
- Optimiser les touch targets (minimum 44x44px)
- Tester sur vrais iPhone Safari (pas seulement Chrome desktop responsive)

### Niveau 1 — Tauri iOS local (besoin Mac)

```bash
# Sur un Mac avec Xcode installé :
cd apps/frontend
npm run tauri ios init
npm run tauri ios dev    # lance dans simulateur iPhone
npm run tauri ios build  # produit un .ipa
```

Configuration déjà partiellement prête dans `apps/frontend/src-tauri/`.
Le `tauri.conf.json` actuel produit Windows + Linux + macOS desktop.
Ajouter target iOS = `npm run tauri ios init` une seule fois.

**À builder, il faut** :
- Un Mac (achat $1000+ ou location ~$30/mois sur MacInCloud)
- Xcode (50+ GB, gratuit sur Mac App Store)
- Compte Apple Developer Program ($99/an)

### Niveau 2 — GitHub Actions iOS build (cloud)

Pour ne pas avoir besoin d'un Mac local, on configure un workflow GitHub Actions qui :
1. Tourne sur `runs-on: macos-latest`
2. Installe Xcode + dépendances
3. Build le `.ipa`
4. Upload comme artifact GitHub OU directement vers TestFlight via Apple API

**Coût GitHub Actions** :
- Public repo : gratuit (illimité)
- Private repo : minutes macOS coûtent 10x les minutes Linux. 2000 min Linux/mois = 200 min macOS/mois en free tier
- Un build iOS Tauri prend ~10-15 min de macOS → ~15 builds/mois en free tier

**Avantage** : pas besoin d'un Mac perso, build automatique à chaque push.

### Niveau 3 — App Store publié

Le bouquet final :
1. Apple Developer Program ($99/an)
2. Créer la fiche App Store Connect (nom, screenshots, description, mots-clés)
3. Builder + uploader le .ipa
4. **Review Apple** : 1-7 jours
5. Si accepté → en ligne sur l'App Store, découverte organique
6. Si rejeté → tu corriges, tu re-soumets

**Risques de rejet pour Athenis** :
- App "trop simple" / "ne fait que rebrand un site web" → on évite en exposant les capabilités natives (camera, biométrie, push)
- Paiements in-app non-Apple → on doit utiliser Stripe via SafariViewController ou Apple In-App Purchase obligatoire pour les abonnements digitaux. À étudier au cas par cas (PME B2B = souvent autorisé en webview)

## Plugins Tauri iOS utiles pour Athenis

À considérer une fois en iOS :

| Plugin | Use case Athenis |
|---|---|
| `@tauri-apps/plugin-camera` | Scanner une facture/justificatif avec OCR |
| `@tauri-apps/plugin-biometric` | Face ID / Touch ID au lieu de saisir le password à chaque login |
| `@tauri-apps/plugin-notification` | Push : "Une facture arrive à échéance dans 7 jours" |
| `@tauri-apps/plugin-deep-link` | Magic links email qui ouvrent direct dans l'app |
| `@tauri-apps/plugin-fs` | Sauvegarder un PDF de facture localement |
| `@tauri-apps/plugin-share` | Partager une facture via WhatsApp / Mail iOS |

## Pré-requis avant de lancer la voie iOS

Mon avis pour ton stade actuel (phase de test fermée, 1 user) :

1. **Atteindre 10-20 vrais users actifs** payants via le web → ça valide le product-market fit
2. **Surveys** : demander aux users s'ils veulent une app iPhone. Si la majorité accède au web depuis mobile, peut-être que la PWA "Add to Home Screen" leur suffit
3. **Acheter Apple Developer Program** ($99) + accès à un Mac
4. **Niveau 0** d'abord (optimiser la PWA iOS), puis **Niveau 2** (GitHub Actions build), puis **Niveau 3** (App Store)

L'erreur classique : investir 200h dans une app iOS avant d'avoir validé le produit sur web. Évite ça.

## Coûts récurrents estimés

| Item | Coût |
|---|---|
| Apple Developer Program | $99/an |
| Mac (achat) | $1000-2500 une fois |
| OU MacInCloud (location) | ~$30/mois |
| GitHub Actions macOS minutes (si private repo) | variable, ~$0-50/mois selon fréquence des builds |
| **Total minimum/an** | ~$99 + matériel |

## Ressources utiles

- Tauri Mobile docs : https://v2.tauri.app/start/prerequisites/#ios
- Apple Developer : https://developer.apple.com/
- App Store Review Guidelines : https://developer.apple.com/app-store/review/guidelines/
- MacInCloud : https://www.macincloud.com/
