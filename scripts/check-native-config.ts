/**
 * Release safety checks for the Android app, run by CI and before `npm run android:bundle`.
 * Fails (exit 1) if:
 *  - capacitor.config.ts sets server.url or server.cleartext, uses a scheme other than https,
 *    or turns on mixed content or WebView debugging;
 *  - the synced copy in the Android project (android/app/src/main/assets/capacitor.config.json)
 *    has a server URL, which `npm run android:livereload` writes while it runs;
 *  - the main AndroidManifest asks for permissions other than the documented ones, allows
 *    backup or cleartext traffic;
 *  - the release build type is debuggable;
 *  - a keystore or signing file is tracked by git.
 * Usage: npx tsx scripts/check-native-config.ts
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import config from '../capacitor.config';

const root = join(import.meta.dirname, '..');
const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

/** The permissions documented in docs/ANDROID.md. */
export const EXPECTED_PERMISSIONS = ['android.permission.MODIFY_AUDIO_SETTINGS', 'android.permission.RECORD_AUDIO'];

// capacitor.config.ts
if (config.server?.url) fail(`capacitor.config.ts sets server.url (${config.server.url}). Remove it; use npm run android:livereload instead.`);
if (config.server?.cleartext) fail('capacitor.config.ts sets server.cleartext.');
if ((config.server?.androidScheme ?? 'https') !== 'https') fail('capacitor.config.ts: server.androidScheme must be https.');
if (config.android?.allowMixedContent) fail('capacitor.config.ts allows mixed content.');
if (config.android?.webContentsDebuggingEnabled) fail('capacitor.config.ts turns on WebView debugging for every build.');

// The synced copy in the Android project.
const synced = join(root, 'android/app/src/main/assets/capacitor.config.json');
if (existsSync(synced)) {
  const s = JSON.parse(readFileSync(synced, 'utf8')) as { server?: { url?: string; cleartext?: boolean } };
  if (s.server?.url) fail(`The Android project still has a live-reload server URL (${s.server.url}). Run npm run android:sync before building a release.`);
}

// AndroidManifest.xml (main source set; debug adds INTERNET and cleartext for live reload).
const manifest = readFileSync(join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
const perms = [...manifest.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]).sort();
if (JSON.stringify(perms) !== JSON.stringify(EXPECTED_PERMISSIONS)) fail(`AndroidManifest.xml permissions are ${perms.join(', ') || 'none'}; expected ${EXPECTED_PERMISSIONS.join(', ')}.`);
if (!/android:allowBackup="false"/.test(manifest)) fail('AndroidManifest.xml must set android:allowBackup="false" (see docs/ANDROID.md).');
if (!/android:usesCleartextTraffic="false"/.test(manifest)) fail('AndroidManifest.xml must set android:usesCleartextTraffic="false".');

// Release build type.
const gradle = readFileSync(join(root, 'android/app/build.gradle'), 'utf8');
const release = /release\s*\{([\s\S]*?)\n {8}\}/.exec(gradle)?.[1] ?? '';
if (!/debuggable false/.test(release)) fail('android/app/build.gradle: the release build type must say `debuggable false`.');

// Signing material must never be committed.
try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n');
  const secret = tracked.filter((f) => /\.(jks|keystore|p12|pk8|pem)$/i.test(f) || /(^|\/)keystore\.properties$/.test(f) || /(^|\/)local\.properties$/.test(f));
  if (secret.length) fail(`Signing or local files are tracked by git: ${secret.join(', ')}`);
} catch {
  // Not a git checkout (e.g. a source archive): nothing to check.
}

if (problems.length) {
  console.error(`Native config check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Native config check passed: no server URL, https only, no mixed content, release not debuggable, permissions as documented, no signing files tracked.');
