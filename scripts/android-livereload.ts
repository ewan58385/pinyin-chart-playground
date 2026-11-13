/**
 * Live reload on an Android emulator or a USB-connected phone (docs/ANDROID.md):
 *   npm run android:livereload [-- --target <device id>]
 *
 * Starts the Vite dev server in native mode on port 5173, forwards the device's
 * localhost:5173 to it (adb reverse, so the page is a secure context and the microphone
 * works), then builds, installs and opens a debug build pointed at it with
 * `cap run android --live-reload`. Capacitor writes the server address only into the
 * Android project's generated copy of the config; `npm run android:sync` (part of every
 * release build) replaces it, and scripts/check-native-config.ts fails if it is still there.
 * Press Ctrl+C to stop.
 */
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const PORT = 5173;
const args = process.argv.slice(2);
const targetAt = args.indexOf('--target');
let target = targetAt >= 0 ? args[targetAt + 1] : undefined;
if (!target) {
  // One device or emulator connected: use it (cap run would otherwise stop to ask).
  const list = spawnSync('adb', ['devices'], { encoding: 'utf8' });
  const devices = (list.stdout ?? '').split('\n').filter((l) => /\tdevice$/.test(l)).map((l) => l.split('\t')[0]);
  if (devices.length === 1) target = devices[0];
  else {
    console.error(devices.length ? `Several devices are connected (${devices.join(', ')}). Choose one: npm run android:livereload -- --target <id>` : 'No device found: start an emulator or connect a phone with USB debugging on.');
    process.exit(1);
  }
}
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const vite = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--mode', 'native', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: root,
  stdio: 'inherit',
});
const stop = (code: number) => {
  vite.kill('SIGTERM');
  process.exit(code);
};
process.on('SIGINT', () => stop(0));

const adb = spawnSync('adb', [...(target ? ['-s', target] : []), 'reverse', `tcp:${PORT}`, `tcp:${PORT}`], { stdio: 'inherit' });
if (adb.status !== 0) {
  console.error('adb reverse failed: start an emulator or connect a phone with USB debugging on, and make sure adb is on your PATH.');
  stop(1);
}

const run = spawnSync(npx, ['cap', 'run', 'android', '--live-reload', '--host', 'localhost', '--port', String(PORT), ...(target ? ['--target', target] : [])], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (run.status !== 0) stop(run.status ?? 1);
console.log(`Live reload running from http://localhost:${PORT}. Press Ctrl+C to stop.`);
