/**
 * Runs the Android Gradle wrapper from the project root on any OS:
 *   tsx scripts/gradle.ts assembleDebug
 * Prints the version that will be built first.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { androidVersion } from './lib/android-version';

const root = join(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
const { versionName, versionCode } = androidVersion(pkg.version, process.env.ANDROID_VERSION_CODE);
console.log(`Android ${versionName} (versionCode ${versionCode})`);

const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const r = spawnSync(wrapper, process.argv.slice(2), { cwd: join(root, 'android'), stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
