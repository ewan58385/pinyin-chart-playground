# Android app

Pinyin Chart ships to Android as a [Capacitor](https://capacitorjs.com) app: the same web code, built in a native mode and packaged in a WebView. The web codebase is the single source of truth; `android/` holds only the native shell and a short list of customisations, so upgrades stay mechanical (see [UPGRADING.md](UPGRADING.md)).

Related: [RELEASING.md](RELEASING.md) (versions, signing, Play upload), [DEVICE_QA.md](DEVICE_QA.md) (test checklist and the last results), [PLAY_STORE.md](PLAY_STORE.md), [PRIVACY.md](PRIVACY.md).

> **The app id is a placeholder.** `app.config.json` says `com.example.pinyinchart`. Google Play rejects `com.example.*`, and the id can never change after the first upload. Choose the final id (reverse domain you control, e.g. `com.yourname.pinyinchart`) before the first upload, change it in `app.config.json`, and see "Changing the app id" below.

## Toolchain and versions

Chosen on 2026-11-13 from the pages listed under "Pages checked". Nothing here is from memory.

| What | Version | Where it is set | Why |
| --- | --- | --- | --- |
| Capacitor (`@capacitor/core`, `cli`, `android`) | 8.6.2, exact | `package.json` | Current stable major on npm. 9.0.0-rc.0 exists but is a release candidate. |
| Node.js | 22 (22.23.5 used) | `.nvmrc`, `engines` | Capacitor 8 requires Node 22+. |
| JDK | 21 (Temurin 21.0.13+9 used) | CI `setup-java`; locally `JAVA_HOME` | Capacitor 8's generated `capacitor.build.gradle` compiles with Java 21 source/target. AGP 8.13 itself needs JDK 17+. |
| Android Gradle Plugin | 8.13.0 | `android/build.gradle` | Capacitor 8's template and update guide. AGP 8.13 supports up to API 36.1. |
| Gradle | 8.14.3 (wrapper) | `android/gradle/wrapper/gradle-wrapper.properties` | Capacitor 8 template; AGP 8.13 needs Gradle 8.13+. |
| compileSdk / targetSdk | 36 / 36 | `android/variables.gradle` | Google Play: from 31 Aug 2026 new apps and updates must target API 36. |
| minSdk | 24 (Android 7.0) | `android/variables.gradle` | Capacitor 8's minimum. Raising it would only cut devices: the app's needs (ES2022, `dvh` units, MediaRecorder) are WebView features, and Android 7–9 phones get the WebView from Chrome updates. A phone whose WebView is too old sees a startup notice telling the user to update it. |
| Build tools | 35.0.0 (AGP default) and 36.1.0 | Android SDK | AGP 8.13's default; 36.1.0 for `apksigner`/`zipalign` checks. |
| Android Studio (optional) | Otter 2025.2.1 or newer | – | Capacitor 8's stated minimum. Not needed for command-line builds. |
| `@capacitor/assets` | 4.0.0, exact, dev only | `package.json` | Official icon and splash generator. |

Pages checked (all on 2026-11-13):

- Capacitor: [environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), [updating to 8.0](https://capacitorjs.com/docs/updating/8-0), [Android](https://capacitorjs.com/docs/android), [Android configuration](https://capacitorjs.com/docs/android/configuration), [config reference](https://capacitorjs.com/docs/config), [System Bars](https://capacitorjs.com/docs/apis/system-bars), [live reload](https://capacitorjs.com/docs/guides/live-reload), [support policy](https://capacitorjs.com/docs/main/reference/support-policy).
- Android: [Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [AGP releases](https://developer.android.com/build/releases/gradle-plugin), [AGP 8.13.0 notes](https://developer.android.com/build/releases/past-releases/agp-8-13-0-release-notes), [16 KB page sizes](https://developer.android.com/guide/practices/page-sizes), [edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge), [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16), [Auto Backup](https://developer.android.com/guide/topics/data/autobackup), [app signing](https://developer.android.com/studio/publish/app-signing), [app bundles](https://developer.android.com/guide/app-bundle).
- npm registry (`npm view`) for every package version; GitHub releases API for the Actions versions in `.github/workflows/`.

What those pages mean for this app:

- **16 KB page sizes** apply to native code (`.so` files). The app has none (checked: no `lib/` in the AAB), so nothing to do; recheck if a plugin with native libraries is ever added.
- **Edge-to-edge** is enforced from target 35 and cannot be opted out of at target 36 on Android 16. The app draws edge to edge on every version (see "Insets").
- **Predictive back** (Android 16 at target 36): `onBackPressed` and `KEYCODE_BACK` are no longer delivered to apps. `@capacitor/app` 8 uses `OnBackPressedDispatcher`, which is the supported path.

## Install the toolchain

Android Studio installs everything; the command line alone is enough:

1. Node 22 (`nvm use` reads `.nvmrc`) and JDK 21 (e.g. Eclipse Temurin). Set `JAVA_HOME`.
2. Android command-line tools from <https://developer.android.com/studio#command-tools>, unpacked to `$ANDROID_HOME/cmdline-tools/latest`. Set `ANDROID_HOME` (e.g. `~/Android/Sdk`) and add `$ANDROID_HOME/platform-tools` and `$ANDROID_HOME/emulator` to `PATH`.
3. `sdkmanager --licenses`, then `sdkmanager "platform-tools" "platforms;android-36" "build-tools;35.0.0" "emulator" "system-images;android-36;google_apis;x86_64"`.
4. An emulator: `avdmanager create avd -n pixel_api36 -k "system-images;android-36;google_apis;x86_64" -d pixel_7`, start with `emulator -avd pixel_api36`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Web development as before (browser, hot reload). |
| `npm run build:native` | Type-check, then the native web build into `dist/` (`vite build --mode native`). |
| `npm run android:sync` | `build:native`, then `cap sync android` (copies `dist/` and plugin config into `android/`). |
| `npm run android:debug` | Sync and build a debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`. No keystore needed. |
| `npm run android:bundle` | Sync, run `check:native`, build the release **AAB** (`android/app/build/outputs/bundle/release/app-release.aab`). Signed when an upload key is configured, unsigned otherwise. |
| `npm run android:apk` | Signed release APK, for testing on a device only. Stops early without an upload key. |
| `npm run android:open` | Open `android/` in Android Studio. |
| `npm run android:livereload [-- --target <id>]` | Live reload on an emulator or USB phone (below). |
| `npm run android:assets` | Regenerate the launcher icon and splash (below). |
| `npm run check:native` | Release safety checks (no `server.url`, https only, permissions, backup, debuggable, no tracked signing files). |

Install a build: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. Google Play needs the AAB; APKs are for testing only.

## Development workflow

- **Most work stays in the browser**: `npm run dev`. The platform layer's web implementation is what runs there.
- **Emulator or phone, current code**: `npm run android:debug`, then `adb install -r …/app-debug.apk` (or `npx cap run android`, which picks a device).
- **Live reload on a device**: start an emulator or connect a phone with USB debugging, then `npm run android:livereload`. It runs Vite in native mode on port 5173, forwards the device's `localhost:5173` to it with `adb reverse` (so the page is a secure context and the microphone works), and runs `cap run android --live-reload`. Capacitor writes the dev-server address only into the generated `android/app/src/main/assets/capacitor.config.json` (gitignored). Every release command re-syncs first and `check:native` fails if an address is still there, and CI rejects a `server.url` in `capacitor.config.ts`. Live reload needs the debug build (it adds INTERNET and cleartext only for debug, see below).
- **Inspecting the WebView**: debug builds allow Chrome DevTools: open `chrome://inspect` on the computer with the device connected.

## Architecture

### One codebase, a platform layer

```
src/platform/
  types.ts    the Platform interface
  web.ts      browser implementation (downloads, new tabs, navigator.storage)
  native.ts   Capacitor implementation (Filesystem + Share, App, SystemBars, SplashScreen, local MicrophonePermission plugin)
  index.ts    picks one with Capacitor.isNativePlatform() / getPlatform()
```

Nothing outside `src/platform/` imports Capacitor (`tests/boundaries.test.ts` enforces this). The only other place that mentions it is the plain inline script in `index.html`, which reads `window.Capacitor` to word the slow-start notice. iOS later needs an iOS branch in `index.ts` (or `native.ts` already works if the iOS behaviours match) and `npx cap add ios`; no app code changes.

The interface (`src/platform/types.ts`):

| Member | Web | Android |
| --- | --- | --- |
| `kind`, `isNative` | `'web'`, false | `'android'`, true |
| `bundledAudio` | false: clips are fetched and cached (Cache Storage `native-audio-v2`) | true: clips are inside the app; nothing cached, no download controls |
| `externalLinkTarget` | "in a new tab" | "in your browser" (used in link labels) |
| `deliverFile(bytes, name, type)` | `<a download>`; resolves `'downloaded'` | writes `cache/exports/<name>` with Filesystem in 3 MB chunks (old exports removed first), opens the share sheet; `'shared'`, or `'cancelled'` if the sheet is closed; rejects with a readable message on write or share failure |
| `openExternal(url)` | `window.open` | navigation to another origin, which Capacitor hands to the system browser. Taps on `<a>` to other sites are routed here too. |
| `onBackButton(handler)` | no-op | `App.addListener('backButton')` (`OnBackPressedDispatcher`, predictive-back safe) |
| `exitApp()` | no-op | `App.exitApp()` |
| `setSystemBarsTheme('light'|'dark')` | no-op | `SystemBars.setStyle` (dark theme → light icons) |
| `appReady()` | no-op | `SplashScreen.hide()` |
| `microphoneRefusal()` | null (browsers do not say) | `'denied'` or `'denied-permanently'` from the local plugin |
| `openAppSettings()` | false | opens the app's page in system Settings |
| `appVersion()` | `{ version }` from package.json | `{ version, build }` (build = versionCode, from `App.getInfo`) |
| `storageStatus()` / `requestPersistentStorage()` | `navigator.storage` persist/estimate | `{ kind: 'app' }`: the data is in the app's own storage |

### What changes in the app on Android

- **No service worker.** The native build turns vite-plugin-pwa off, and `main.tsx` registers it only on the web. The app updates through Google Play.
- **Native build mode** (`vite build --mode native`): base `/` (the app is served from `https://localhost/`), no manifest, no install icons or Apple tags (`dropPwaFiles` in `vite.config.ts`). Audio and fonts are in `dist/` and so inside the app.
- **Audio**: read from the app; no caching, no "Download all for offline", no offline banner.
- **My data**: "Native recordings" says all 1,302 recordings are included. The storage section says "Your data is stored on this device. Back up regularly…" Backup and restore are unchanged. Exports go to the share sheet; the restore picker accepts zip files however the source labels them.
- **Back button** (`src/lib/back.ts`, `src/lib/systemBack.ts`): closes the newest open layer (⋯ menu, search results, filters panel, reset or restore confirmation), then the syllable sheet, then steps back through pages, then leaves the app from the chart. Layers register with `useBackLayer`. Closing the sheet now steps back over the history entry opening it added, which also fixes a no-op browser Back on the web.
- **Microphone**: the WebView asks for the permission when recording starts. After a refusal the app says either "tap Record again and choose Allow" or, if Android will not ask again, "open Settings, then Permissions, then Microphone" with an **Open settings** button.
- **Keyboard**: the WebView is resized above the keyboard by Capacitor's SystemBars handling; `src/lib/viewport.ts` scrolls a focused field back into view after the resize, so notes and recording names are never hidden.
- **Startup checks**: `src/lib/features.ts` checks IndexedDB, MediaRecorder/getUserMedia and Web Audio; a notice names what will not work (storage has its own banner). If the app script cannot run at all, the inline notice in `index.html` suggests updating Android System WebView.
- **About** shows "Version 1.0.0 (build 10000)" on Android and "Version 1.0.0" on the web, both from `package.json` (`__APP_VERSION__`), and a privacy policy link once `PRIVACY_POLICY_URL` (`src/config.ts`) is set.

### Insets (edge-to-edge)

`MainActivity` calls `EdgeToEdge.enable(this)` and `capacitor.config.ts` sets SystemBars `insetsHandling: 'native'` with `initialViewportFitValueHint: 'cover'`, as Capacitor's System Bars page recommends. `index.html` already has `viewport-fit=cover` and the CSS uses only `var(--safe-*)` tokens built on `env(safe-area-inset-*)`. Behaviour depends on the WebView:

- **WebView 140 or newer**: the page is edge to edge and `env(safe-area-inset-*)` carries the bar and cutout sizes.
- **Older WebViews** (the test emulator has 133): Capacitor pads the WebView itself and the `env()` values are 0, which the CSS also handles.

No offsets are hard-coded anywhere.

### Plugins (all official, versions exact)

| Package | Version | Why |
| --- | --- | --- |
| `@capacitor/core` | 8.6.2 | Runtime, platform detection, SystemBars (bundled in core). |
| `@capacitor/android` | 8.6.2 | Android runtime. |
| `@capacitor/app` | 8.1.2 | Back button, exit, app version/build. |
| `@capacitor/filesystem` | 8.1.5 | Write exports to the cache for sharing (chunked, large files). |
| `@capacitor/share` | 8.0.3 | System share sheet for backups and Anki exports (FileProvider). |
| `@capacitor/splash-screen` | 8.0.2 | Keep the launch screen up until the first render (no white flash). |
| `@capacitor/cli` (dev) | 8.6.2 | `cap sync`, `cap run`, `cap open`. |
| `@capacitor/assets` (dev) | 4.0.0 | Icon and splash generation. |

Considered and not added: `@capacitor/keyboard` (SystemBars already resizes for the keyboard), `@capacitor/browser` (external links already open in the system browser), `@capacitor/status-bar` (superseded by SystemBars).

### Native customisations

Everything in `android/` that differs from what `npx cap add android` generates. Keep this list current; [UPGRADING.md](UPGRADING.md) re-applies it.

1. `app/src/main/java/com/example/pinyinchart/MainActivity.java`: `EdgeToEdge.enable(this)`; registers the local plugin.
2. `app/src/main/java/com/example/pinyinchart/MicrophonePermissionPlugin.java`: local plugin, `status()` (granted / can ask again) and `openSettings()`. Needed because the WebView cannot tell "refused" from "refused for good".
3. `app/src/main/AndroidManifest.xml`: `allowBackup="false"`, `usesCleartextTraffic="false"`, `windowSoftInputMode="adjustResize"`, permissions RECORD_AUDIO and MODIFY_AUDIO_SETTINGS only, and no INTERNET.
4. `app/src/debug/AndroidManifest.xml` (new): INTERNET and cleartext for debug builds only, for live reload.
5. `app/build.gradle`: app id and name from `app.config.json`; versionName/versionCode from `package.json` (see [RELEASING.md](RELEASING.md)); upload-key signing from `keystore.properties` or env vars; release `debuggable false`.
6. `app/src/main/res/xml/file_paths.xml`: the FileProvider shares only `cache/exports/` (the template shared all external storage).
7. `app/src/main/res/values/styles.xml`, `values/launch_colors.xml`, `values-night/launch_colors.xml`: launch and window background in paper and dark paper; `postSplashScreenTheme`.
8. `app/src/main/res/values/strings.xml`: emptied; the name comes from `app.config.json` via `resValue`.
9. Launcher icon and splash images (`mipmap-*`, `drawable*/splash.png`) from `npm run android:assets`, plus `drawable/ic_launcher_monochrome.xml` and the `<monochrome>` line in `mipmap-anydpi-v26/ic_launcher*.xml` (themed icons, which `@capacitor/assets` does not make). The template's default icon drawables were removed.
10. `.gitignore`: keystores and `keystore.properties` are ignored.

### Permissions and security

| Permission | Why |
| --- | --- |
| `RECORD_AUDIO` | Your own recordings. Asked at the first recording. |
| `MODIFY_AUDIO_SETTINGS` | The WebView needs it with RECORD_AUDIO for microphone capture (Capacitor's `BridgeWebChromeClient` requests both). Normal permission, no prompt. |
| `<app id>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | Added by AndroidX to the merged manifest; signature-level, internal to the app, no prompt. |

**INTERNET is removed**: everything ships in the app, the WebView serves it from `https://localhost` without the network, and Forvo links open in the user's browser, which has its own permission. Verified with a release build on the emulator. If a future feature needs the network, add it back and update the privacy policy and Data safety form.

- **Backup**: `allowBackup="false"`. User data is WebView storage (IndexedDB, with recordings), which can exceed Auto Backup's 25 MB quota and would then be backed up partly or not at all; a partial restore could break it. The in-app backup file is the supported route, and My data says so. On Android 12+ some manufacturers still allow device-to-device transfer with `allowBackup="false"` (Android's Auto Backup page), which is harmless.
- **Release builds**: not debuggable; WebView remote debugging follows Capacitor's default (on only in debuggable builds; release APK inspected); no mixed content; cleartext off; https scheme.
- **`check:native`** fails the build on a `server.url`, cleartext, mixed content, forced WebView debugging, unexpected permissions, backup on, a debuggable release, or a tracked keystore/`keystore.properties`/`local.properties`.

### Launcher icon and splash

Sources are drawn from the 拼 seal (`scripts/build-icons.py --android`) into `assets/`:

- `icon-only.png` (legacy icon)
- `icon-foreground.png` (the glyph in paper colour, inside the adaptive safe zone)
- `icon-background.png` (vermilion)
- `splash.png` (paper) and `splash-dark.png` (dark paper)

The same step writes the monochrome vector. Regenerate everything with:

```sh
npm run android:assets   # needs python3, Pillow, fontTools and .cache/fonts (npm run data:fonts)
```

This runs `@capacitor/assets generate --android` with the vermilion icon background and both splash colours, then re-adds the `<monochrome>` layer. On Android 12+ the system launch screen shows the icon on `launch_background` (paper or dark paper, following the system theme); earlier versions show `drawable[-night]/splash.png`. The app hides the launch screen once it has drawn its first screen, so there is no white flash. A 4-second automatic hide is a safety net only.

### Changing the app id

1. Edit `appId` in `app.config.json`. Gradle (`applicationId`) and Capacitor read it from there, and the FileProvider authority follows `applicationId`.
2. Optional, for tidiness: move `android/app/src/main/java/com/example/pinyinchart/` to the new package path and update `namespace` in `android/app/build.gradle` and the `package` lines. The namespace does not have to match the app id.
3. `npm run android:sync`, uninstall the old build from test devices, and rebuild.

Do this **before the first upload to Play**: an uploaded app id is permanent.

## CI

- `.github/workflows/ci.yml`, on every push and pull request, with no secrets: typecheck, tests, web build, native build, `check:native`, debug APK (downloadable from the run's artifacts).
- `.github/workflows/release-android.yml`: manual signed AAB. Disabled until set up ([RELEASING.md](RELEASING.md)).
- `.github/workflows/deploy.yml`: the web site on GitHub Pages, now **manual only** (Actions → Deploy to GitHub Pages → Run workflow). Pushing to `main` no longer publishes it.
- `.github/dependabot.yml`: weekly npm, Gradle and Actions updates; Capacitor packages grouped.

`npm audit` reports moderate advisories in development-only tools (`@capacitor/cli` → rimraf/glob/minimatch, `@capacitor/assets` → uuid, `workbox-build` → deepmerge). None of that code ships in the app; recheck when those tools update.
