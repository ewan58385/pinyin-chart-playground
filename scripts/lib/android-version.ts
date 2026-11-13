/**
 * The Android version rule, as android/app/build.gradle applies it (keep the two in step;
 * tests/android-version.test.ts checks both). package.json "version" is the only input.
 *
 *   versionName = "MAJOR.MINOR.PATCH"
 *   versionCode = MAJOR * 10000 + MINOR * 100 + PATCH   (1.2.3 -> 10203)
 *
 * MINOR and PATCH must be 0-99 so the code always grows with the version. An explicit
 * code (ANDROID_VERSION_CODE) replaces the derived one, e.g. to re-upload a fixed build.
 */
export const MAX_VERSION_CODE = 2_100_000_000;

export function androidVersion(version: string, override?: string | number | null): { versionName: string; versionCode: number } {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`package.json version '${version}' must be MAJOR.MINOR.PATCH (digits only) for Android.`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (minor > 99 || patch > 99) throw new Error(`package.json version '${version}': minor and patch must be 0-99 for the Android version code.`);
  const text = override === undefined || override === null ? '' : String(override).trim();
  const versionCode = text ? Number(text) : major * 10000 + minor * 100 + patch;
  if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > MAX_VERSION_CODE) {
    throw new Error(`Android versionCode ${text || versionCode} is outside 1-${MAX_VERSION_CODE}.`);
  }
  return { versionName: version, versionCode };
}
