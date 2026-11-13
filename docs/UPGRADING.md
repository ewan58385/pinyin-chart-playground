# Upgrading the Android toolchain

The aim is that upgrades stay mechanical: the web code does not change, Capacitor's own update guide is followed, and the short list of native customisations in [ANDROID.md](ANDROID.md#native-customisations) is re-applied and re-tested.

**Always check the official pages first; do not rely on this file for version numbers.** It records the procedure, not the current requirements.

## Before any upgrade

1. Read the current requirements:
   - Capacitor updating guide for the target major: <https://capacitorjs.com/docs/updating/> (e.g. `/updating/9-0`) and the support policy <https://capacitorjs.com/docs/main/reference/support-policy>.
   - Play target API level: <https://developer.android.com/google/play/requirements/target-sdk>.
   - AGP compatibility (Gradle, JDK, max API): <https://developer.android.com/build/releases/gradle-plugin>.
2. Start from a clean tree on a branch. Run `npm test`, `npm run typecheck`, `npm run android:debug` so you know the starting point is green.

## Minor and patch updates (Dependabot PRs)

- Capacitor packages come grouped. Keep `@capacitor/core`, `@capacitor/android` and `@capacitor/cli` on the same version, plugins on the same major. After merging: `npm ci && npm run android:sync`, then `npm run android:debug` and the quick QA list in [DEVICE_QA.md](DEVICE_QA.md).
- Gradle-ecosystem PRs that bump AndroidX versions in `android/variables.gradle` or AGP in `android/build.gradle`: prefer the values from Capacitor's update guide for the current major. Accept others only if the debug build and QA pass.
- Actions PRs: safe to merge when CI is green.
- Update `docs/ANDROID.md` (versions table) and run `npm run data:notices` when a shipped package changes (the Credits page and THIRD_PARTY_NOTICES.md list versions).

## A new Capacitor major (e.g. 8 → 9)

Capacitor 9.0.0-rc.0 was published on npm by 2026-11-13; wait for the stable release and its "Updating to 9.0" page.

1. Read the guide end to end; note Node, JDK, Android Studio, AGP, Gradle, `variables.gradle` values and plugin breaking changes.
2. Update the npm packages together (exact versions):
   `npm install --save-exact @capacitor/core@9.x.y @capacitor/android@9.x.y @capacitor/app@… @capacitor/filesystem@… @capacitor/share@… @capacitor/splash-screen@…` and `npm install --save-exact -D @capacitor/cli@9.x.y @capacitor/assets@…`.
3. Run Capacitor's migration helper if the guide offers one (`npx cap migrate`) **or** apply the listed changes by hand. Then review the diff in `android/`:
   - It may overwrite `variables.gradle`, `build.gradle`, wrapper files: accept those.
   - Re-check every item in [ANDROID.md → Native customisations](ANDROID.md#native-customisations) is still present, especially `app/build.gradle` (version + signing + identity), `AndroidManifest.xml` (permissions, backup, cleartext), `src/debug/AndroidManifest.xml`, `file_paths.xml`, `styles.xml` and the launch colours, `MainActivity.java`, and the local plugin.
   - Capacitor 8's System Bars page says that from Capacitor 9 `insetsHandling` defaults to `native` and `EdgeToEdge.enable` is called for you: remove the explicit call from `MainActivity` if the guide confirms it.
4. Update `.nvmrc`, `engines`, `actions/setup-java` `java-version` and the versions table in ANDROID.md if the requirements moved.
5. `npm run android:assets` if the asset tool changed; `npm run data:notices`.
6. `npm test`, `npm run typecheck`, `npm run build`, `npm run android:bundle`, then the full [DEVICE_QA.md](DEVICE_QA.md) list on an emulator with the new target API and on a real phone.

### If the generated project needs replacing

Sometimes it is simpler to regenerate `android/`:

1. Move `android/` aside (`mv android android.old`).
2. `npm run build:native && npx cap add android`.
3. Re-apply the customisations by copying the listed files from `android.old` and diffing `app/build.gradle` and the manifest by hand.
4. `npm run android:assets` (icons, splash, monochrome layer).
5. Build and run the QA list, then delete `android.old`.

## Raising targetSdk

Each August Google Play raises the required target. When it does:

1. Check the AGP version supports the new API level (AGP compatibility table) and that Capacitor's current major targets it; usually this arrives with a Capacitor major.
2. Set `compileSdkVersion` and `targetSdkVersion` in `android/variables.gradle`; install the platform (`sdkmanager "platforms;android-NN"`) and an emulator image.
3. Read that Android version's behaviour changes for apps targeting it (as with 16: predictive back, edge-to-edge enforced) and run the full QA list.

## Node, JDK, Gradle, AGP alone

- **Node**: change `.nvmrc` and `engines`; CI reads `.nvmrc`.
- **JDK**: Capacitor's generated `capacitor.build.gradle` sets the Java language level (21 for Capacitor 8); the JDK must be at least that and supported by the AGP version. Update `java-version` in both workflows.
- **Gradle wrapper**: `cd android && ./gradlew wrapper --gradle-version X.Y.Z --distribution-type all`, then build twice (the second run uses the new wrapper). `gradle/actions/setup-gradle` validates the wrapper checksum in CI.
- **AGP**: change `classpath 'com.android.tools.build:gradle:X'` in `android/build.gradle` only to a version Capacitor's guide names; AGP 9 is a major change and should wait for Capacitor's guidance.

## Rolling back

Everything is in git: revert the upgrade commit, `npm ci`, `npm run android:sync`, rebuild. Play only accepts a versionCode higher than the last upload, so a rollback release still needs a version bump (or `ANDROID_VERSION_CODE`).
