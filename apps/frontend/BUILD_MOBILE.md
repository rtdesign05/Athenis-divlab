# Générer l'app Athenis Mobile (Android / iOS)

Athenis utilise **Tauri 2 Mobile** pour générer des apps natives Android (APK)
et iOS (IPA) à partir du même code frontend que la version Desktop.

> 🪟 Sur Windows, seul Android est buildable (iOS nécessite macOS + Xcode).

---

## Android — Prérequis (Windows)

L'environnement Android n'est **pas trivial à installer** : compte ~30 min de
setup la première fois. À installer dans cet ordre :

### 1. JDK 17

Télécharge **Eclipse Temurin 17 LTS** (gratuit) :  
https://adoptium.net/temurin/releases/?version=17

Installe-le puis vérifie :
```powershell
java -version
```
Doit afficher `openjdk version "17.x.x"`.

### 2. Android Studio

Télécharge depuis https://developer.android.com/studio (~1 Go).  
Au premier lancement, l'assistant installe :
- **Android SDK** (API 34 minimum)
- **Android SDK Build-Tools**
- **Android SDK Platform-Tools** (contient `adb`)
- **Android Emulator** (optionnel)

### 3. NDK (Native Development Kit)

Dans Android Studio :  
**Settings → Languages & Frameworks → Android SDK → SDK Tools** →
coche **NDK (Side by side)** et **CMake** → Apply.

### 4. Variables d'environnement

Ajoute dans les variables système Windows (ou via PowerShell admin) :

```powershell
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')
[System.Environment]::SetEnvironmentVariable('NDK_HOME', "$env:LOCALAPPDATA\Android\Sdk\ndk\<version>", 'User')
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot', 'User')
```

Redémarre le terminal puis vérifie :
```powershell
echo $env:ANDROID_HOME
echo $env:NDK_HOME
adb --version
```

### 5. Cibles Rust pour Android

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

---

## Initialiser le projet Android

Une seule fois, depuis `apps/frontend` :

```powershell
npm run tauri android init
```

Cela crée le dossier `src-tauri/gen/android/` avec le projet Gradle.

---

## Builder l'APK de production

```powershell
npm run tauri android build --apk
```

L'APK signé (debug) se trouve à :
```
src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

> ⚠ Cet APK est signé avec une clé de debug. Pour le **Play Store**, il faut
> générer une clé de release et builder un **AAB** (Android App Bundle) :
> ```powershell
> npm run tauri android build --aab
> ```

---

## iOS — Prérequis (macOS uniquement)

- macOS 13+
- Xcode 15+ (depuis l'App Store)
- Compte Apple Developer (99 $/an pour publier sur l'App Store)
- Cibles Rust : `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`

```bash
npm run tauri ios init
npm run tauri ios build
```

---

## Notes

- L'app mobile utilise le **même écran de premier lancement** que la version
  Desktop pour configurer l'URL du serveur Athenis (voir `BUILD_DESKTOP.md`).
- Sur Android, la première fois, autoriser "Installer apps inconnues" pour
  installer l'APK directement (hors Play Store).
- Les permissions natives (caméra, fichiers, etc.) se configurent dans
  `src-tauri/capabilities/`.
