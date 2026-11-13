# Device QA

What to check on Android before a release, and the results of the last run. Run the quick list after any Capacitor, plugin or WebView-related change, and the full list before every store release, on an emulator **and** at least one real phone.

Setup: [ANDROID.md](ANDROID.md#install-the-toolchain). Install a build with `npm run android:debug` and `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`; for release behaviour use `npm run android:apk` (needs the upload key) or a locally signed release APK. Inspect the WebView from `chrome://inspect` (debug builds).

Useful `adb` switches:

| Want | Command |
| --- | --- |
| Dark mode | `adb shell cmd uimode night yes` / `no` |
| Landscape | `adb shell settings put system accelerometer_rotation 0; adb shell settings put system user_rotation 1` (0 to return) |
| Three-button navigation | `adb shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.threebutton` (`…navbar.gestural` to return) |
| Back | `adb shell input keyevent 4` |
| Reset the app (data and permissions) | `adb shell pm clear <app id>` |
| Grant the microphone | `adb shell pm grant <app id> android.permission.RECORD_AUDIO` |

## Quick list

1. App opens to the chart, launch screen in the system theme's paper colour, no white flash.
2. Tap a square: the sheet opens; the native recording plays; Back closes the sheet.
3. Record, play back, rename the recording (keyboard does not cover the field).
4. My data → Export backup → share sheet appears; close it → "The backup was not saved."
5. Back from the chart leaves the app.

## Full list

| Area | Check |
| --- | --- |
| Back button | Closes, in order: ⋯ menu; search results (after the keyboard); filters panel; reset confirmation; restore confirmation; the syllable sheet. Then steps back through pages (group page → Finals → Chart). Leaves the app from the chart. Same with the on-screen Back in three-button navigation. |
| Insets | Portrait and landscape, gesture and three-button navigation: top bar clear of the status bar and cutout, tab bar clear of the navigation bar, nothing under the camera cutout in landscape. On WebView 140+ `env(safe-area-inset-*)` is non-zero (DevTools: `getComputedStyle` of an element padded with `env()`); on older WebViews the WebView itself is inset. |
| Keyboard | Search box, note field, recording name, example editor fields: each stays visible above the keyboard. |
| Theming | System dark mode → dark paper, light status/navigation icons; light mode → dark icons. In-app Appearance overrides the system. Launch screen matches the system theme. |
| Launcher icon | Vermilion seal with 拼; themed (monochrome) icon when the launcher's themed icons are on (Android 13+). |
| Audio | Native recordings play offline (airplane mode); no "Download all", no offline banner. |
| Microphone | First recording asks; "Don't allow" → "tap Record again and choose Allow"; second "Don't allow" → "turned off for this app… open Settings" with **Open settings**, which opens the app's settings page; after allowing, recording works and plays back. |
| Files | Export backup and Anki export open the share sheet (try Save to Drive / Files on a real phone); closing it shows "The backup was not saved."; Restore opens the system picker, accepts the zip, confirm → data back; a restored recording plays with its original type. |
| Links | "Hear it on Forvo" opens the browser; returning shows the same screen. |
| About | "Version X.Y.Z (build N)" matches `package.json`; privacy policy link once configured. |
| Release build | Installs without INTERNET; `aapt2 dump badging` shows only RECORD_AUDIO, MODIFY_AUDIO_SETTINGS (and AndroidX's internal receiver permission); not debuggable (`adb shell run-as <app id>` refuses). |
| Startup notice | (Old WebView only) a device whose WebView cannot run the app shows the startup notice and, after 8 s, the advice to update Android System WebView. |

## Last run: 2026-11-13

Emulator: Android 16 (API 36) Google APIs x86_64, Pixel 7 profile, Android System WebView 133.0.6943.137, debug APK and a release APK (signed locally with the SDK's debug key for installation only). Driven with `adb` plus Chrome DevTools Protocol. Screenshots: [`reports/android-qa/`](../reports/android-qa/).

**Verified** (on the debug build; rows marked † also on the release build, which has no INTERNET permission):

- † Back closes the syllable sheet (opened by address and by tapping a square), the filters panel, the ⋯ menu, the search results (second press, after the keyboard), and the reset confirmation; steps back sheet → group page → Finals → Chart; leaves the app from the chart.
- Three-button navigation: content ends above the buttons; the on-screen Back closes the sheet.
- Gesture navigation, portrait: top bar below the status bar, tab bar above the gesture handle.
- Landscape: no horizontal overflow; the WebView is inset from the camera cutout side.
- † Insets on WebView 133 (< 140): Capacitor insets the WebView; `env(safe-area-inset-*)` reads 0px, which the CSS handles.
- Dark mode follows the system; light status-bar icons on dark paper; dark launch screen.
- Launch screen in paper (light) and dark paper (dark); the app hides it after its first render, about 2 s on first launch; no white flash.
- † About shows "Version 1.0.0 (build 10000)".
- † No service worker, no manifest, no install icons; Cache Storage empty.
- † Native recording loads from inside the app (no network, nothing cached).
- † My data: "kept in the app on this device", the storage note, "All 1302 native recordings are included", no download controls, no "browser" wording.
- † Microphone: first refusal message; permanent refusal message with Open settings; Open settings opens the system settings page for the app; after granting, a recording is saved (`audio/mp4;codecs=mp4a.40.2`) and plays back.
- † Keyboard does not hide the recording name or the note field (the note field was hidden in one run before the fix in `src/lib/viewport.ts`, then passed in four consecutive runs).
- Export backup → share sheet; the file is written to `cache/exports/`; closing the sheet → "The backup was not saved."
- Anki export (6 MB, written in two chunks) → share sheet; only one export is kept in the cache.
- Restore: the system file picker opens and offers the zip; replace → the recording returns with the same id, MIME type and size, and plays. An empty file is refused with "That file is not a Pinyin Chart backup."
- Forvo opens in Chrome; returning shows the same screen.
- Release APK: permissions RECORD_AUDIO, MODIFY_AUDIO_SETTINGS (+ AndroidX's internal `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`); `allowBackup=false`; `usesCleartextTraffic=false`; not debuggable.
- Signing: a bundle built with signing env vars verifies with `jarsigner` ("jar verified"); `ANDROID_VERSION_CODE=10001` sets the code; without a key `android:bundle` builds unsigned and `android:apk` stops with directions.
- Live reload: `npm run android:livereload` installs the debug build pointing at `http://localhost:5173`, a secure context with the microphone available; `check:native` fails while that address is still in the synced config.
- Web build (headless Chrome): service worker registers; sheet close leaves one history entry; browser Back closes the sheet; My data keeps its web wording and download controls; Export downloads the zip; About "Version 1.0.0"; Forvo opens in a new tab; no page errors.

**Failed**: none outstanding.

**Not verified** (needs a real device or something the emulator lacks):

- Real phones (any manufacturer), real microphone audio quality, actual sound output.
- WebView 140+ (`env(safe-area-inset-*)` with real values): the emulator image ships WebView 133 and has no Play Store to update it.
- Android 7–9 and an old WebView, including the startup notice's WebView advice.
- Completing a share to a target (Drive, Files, Gmail): no accounts on the emulator; the share sheet itself was verified.
- Themed (monochrome) launcher icon as rendered by a launcher; the resource is in the build.
- Predictive back animation (system setting) and tablets/foldables.
- WebView remote debugging off in release at runtime: the emulator is a `userdebug` system image, on which every WebView is debuggable. The release build is not debuggable and Capacitor enables WebView debugging only for debuggable builds (code and merged config checked).
- A signed upload with your own upload key, and the GitHub release workflow (needs the secrets).
