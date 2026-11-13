/**
 * Stops `npm run android:apk` early when no upload key is configured, with directions,
 * instead of producing an unsigned APK that will not install. See docs/RELEASING.md.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const fromFile = existsSync(join(root, 'android', 'keystore.properties'));
const fromEnv = ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'].every((k) => !!process.env[k]);
if (!fromFile && !fromEnv) {
  console.error(
    [
      'No upload key configured, so a signed APK cannot be built.',
      'Create android/keystore.properties (see docs/RELEASING.md) or set ANDROID_KEYSTORE_PATH,',
      'ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD.',
      'For testing without a key, use `npm run android:debug`.',
    ].join('\n'),
  );
  process.exit(1);
}
