# Releasing the Android app

How to version, sign, build and upload Pinyin Chart to Google Play. The setup is in [ANDROID.md](ANDROID.md); the store side is in [PLAY_STORE.md](PLAY_STORE.md).

**Google Play needs an Android App Bundle (`.aab`).** New apps must be published as app bundles (required since August 2021, [app bundles](https://developer.android.com/guide/app-bundle)). APKs from `npm run android:apk` or `android:debug` are only for installing on your own test devices.

## Versions

`package.json` `"version"` is the only place a version is written.

- **versionName** = the package version, e.g. `1.2.3`. The About page shows the same number on the web and on Android.
- **versionCode** = `MAJOR × 10000 + MINOR × 100 + PATCH`, e.g. 1.0.0 → 10000, 1.2.3 → 10203, 2.0.0 → 20000. It always grows when the version grows, as long as **MINOR and PATCH stay between 0 and 99**; the build fails otherwise. Pre-release suffixes (`1.0.0-beta`) are rejected.
- **Override**: set `ANDROID_VERSION_CODE` (environment, or `-PandroidVersionCode` for Gradle) to use another code, e.g. to re-upload the same version after Play rejected a build. It must still be higher than every code already uploaded, and at most 2,100,000,000. The release workflow has a `version_code` input for this.

The rule lives in `android/app/build.gradle` and, for tests and scripts, `scripts/lib/android-version.ts`; `tests/android-version.test.ts` checks that both agree.

To release a new version: change `"version"` in `package.json` (e.g. `npm version minor --no-git-tag-version`), commit, build.

## The upload key (do this once)

Play App Signing: Google keeps the key that signs what users install; you sign uploads with your own **upload key**. If the upload key is lost or leaked, the Play Console can reset it ("request an upload key reset"), but that takes time and support contact, so treat it as irreplaceable.

Generate it yourself. Nothing in this repository creates, stores or commits a key or a password. Run this outside the repository, for example in `~/keys/`:

```sh
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore pinyin-chart-upload.jks \
  -alias upload \
  -keyalg RSA -keysize 4096 \
  -validity 10000
```

`keytool` comes with the JDK. It asks for a store password and your name/organisation; with a PKCS12 store the key password is the same as the store password. 10,000 days is about 27 years: Android's signing guide recommends at least 25.

> **Back up the keystore and password now, in two separate safe places** (for example a password manager entry with the `.jks` attached, plus an encrypted offline copy). Never e-mail it, never put it in a cloud folder unencrypted, never commit it. Without it you cannot publish updates until Google resets your upload key.

When Play Console asks for the upload certificate (or for a reset), export it:

```sh
keytool -export -rfc -keystore pinyin-chart-upload.jks -alias upload -file upload_certificate.pem
```

### Point the build at the key

Either create `android/keystore.properties`, which is gitignored and never committed:

```properties
storeFile=/home/you/keys/pinyin-chart-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

(`storeFile` may be absolute or relative to `android/`.)

Or set environment variables, which take effect when the file is absent or leaves a value out:

```sh
export ANDROID_KEYSTORE_PATH=/home/you/keys/pinyin-chart-upload.jks
export ANDROID_KEYSTORE_PASSWORD=…
export ANDROID_KEY_ALIAS=upload
export ANDROID_KEY_PASSWORD=…
```

Without either, `npm run android:debug` and `npm run android:bundle` still build (the bundle is unsigned and cannot be uploaded), and `npm run android:apk` stops with directions.

## Build a release

```sh
npm ci
npm test && npm run typecheck
npm run android:bundle
```

`android:bundle` builds the native web app, syncs it into `android/`, runs `check:native`, and writes `android/app/build/outputs/bundle/release/app-release.aab`. It prints the version and versionCode first. Check the signature:

```sh
jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab   # "jar verified."
```

To try the exact release on your phone first: `npm run android:apk`, then `adb install -r android/app/build/outputs/apk/release/app-release.apk`.

## Upload

1. Play Console → your app → Test and release → (a testing track, or Production) → Create new release.
2. The first time, accept Play App Signing (Google generates and keeps the app signing key) and register your upload certificate if asked.
3. Upload `app-release.aab`, add release notes, review, roll out.

New personal developer accounts must run a closed test (12+ testers for 14 days) before production; see [PLAY_STORE.md](PLAY_STORE.md).

## Release from GitHub Actions (optional)

`.github/workflows/release-android.yml` builds a signed AAB on demand. It is off until you set it up:

1. Base64-encode the keystore: `base64 -w0 pinyin-chart-upload.jks > keystore.b64` (macOS: `base64 -i pinyin-chart-upload.jks -o keystore.b64`). Delete `keystore.b64` after the next step.
2. Repository Settings → Secrets and variables → Actions → **Secrets**: add `ANDROID_KEYSTORE_BASE64` (contents of `keystore.b64`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
3. Same page → **Variables**: add `ANDROID_RELEASE_ENABLED` = `true`.
4. Optional but recommended: Settings → Environments → `android-release` → required reviewers, so a release needs your approval.
5. Actions → "Android release bundle" → Run workflow (optionally with a `version_code`). Download `pinyin-chart-release-aab` from the run's artifacts and upload it to Play.

The workflow decodes the keystore into the runner's temporary folder, deletes it afterwards, and verifies the signature.

## Checklist per release

- [ ] `package.json` version bumped; README/THIRD_PARTY_NOTICES current (`npm run data:notices` after dependency changes).
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npm run build:native` pass.
- [ ] `npm run android:bundle` signed; `check:native` passed.
- [ ] Device QA from [DEVICE_QA.md](DEVICE_QA.md) on at least one real phone.
- [ ] Data safety form and privacy policy still accurate (no new permissions or data).
