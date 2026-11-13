/**
 * Regenerates the Android launcher icon and launch screen (docs/ANDROID.md):
 *   npm run android:assets
 *
 * 1. scripts/build-icons.py --android draws the sources into assets/ and the
 *    monochrome (themed icon) vector into the Android project.
 * 2. @capacitor/assets turns assets/ into every density of launcher icon (adaptive
 *    foreground and background, legacy, round) and splash (light and dark).
 * 3. The adaptive-icon definitions get the monochrome layer, which @capacitor/assets
 *    does not write, so Android 13+ themed icons show the glyph.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run('python3', ['scripts/build-icons.py', '--android']);
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  'capacitor-assets',
  'generate',
  '--android',
  '--iconBackgroundColor',
  '#b0372a',
  '--iconBackgroundColorDark',
  '#b0372a',
  '--splashBackgroundColor',
  '#f7f4ee',
  '--splashBackgroundColorDark',
  '#171614',
]);

for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  const file = join(root, 'android/app/src/main/res/mipmap-anydpi-v26', name);
  let xml = readFileSync(file, 'utf8').replace(/\s*<monochrome[^>]*\/>/g, '');
  xml = xml.replace(/(\s*)<\/adaptive-icon>/, '\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>\n</adaptive-icon>');
  writeFileSync(file, xml);
}
console.log('Android icon and splash regenerated, with the monochrome layer.');
