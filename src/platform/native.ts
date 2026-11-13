/**
 * The platform inside the Capacitor app (Android now; iOS would reuse most of this).
 * Only official Capacitor plugins, plus one small local plugin in the Android project
 * (MicrophonePermissionPlugin.java). See docs/ANDROID.md.
 */
import { registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import type { MicrophoneRefusal, Platform, PlatformKind, StorageReport } from './types';

interface MicrophonePermissionPlugin {
  status(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  openSettings(): Promise<void>;
}
const MicrophonePermission = registerPlugin<MicrophonePermissionPlugin>('MicrophonePermission');

/** Exports are written here (in the app's cache) and handed to the share sheet; android/app/src/main/res/xml/file_paths.xml shares only this folder. */
export const EXPORT_DIR = 'exports';
/** Bytes per write over the bridge. A multiple of 3, so each piece encodes to base64 on its own. */
export const WRITE_CHUNK = 3 * 1024 * 1024;

/** Base64 of bytes[start, end), built in slices small enough for String.fromCharCode. */
export function base64Of(bytes: Uint8Array, start = 0, end = bytes.length): string {
  let bin = '';
  for (let i = start; i < end; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, end)));
  return btoa(bin);
}

/** Map the Share plugin's rejection to "the user closed the sheet", which is not an error. */
export const isShareCancel = (err: unknown) => /cancel/i.test(String((err as Error)?.message ?? err));

async function writeExport(bytes: Uint8Array, filename: string): Promise<string> {
  // One export at a time is kept: earlier ones are removed so the cache does not grow.
  await Filesystem.rmdir({ path: EXPORT_DIR, directory: Directory.Cache, recursive: true }).catch(() => {});
  await Filesystem.mkdir({ path: EXPORT_DIR, directory: Directory.Cache, recursive: true }).catch(() => {});
  const path = `${EXPORT_DIR}/${filename}`;
  const first = Math.min(WRITE_CHUNK, bytes.length);
  await Filesystem.writeFile({ path, directory: Directory.Cache, data: base64Of(bytes, 0, first) });
  for (let at = first; at < bytes.length; at += WRITE_CHUNK) {
    await Filesystem.appendFile({ path, directory: Directory.Cache, data: base64Of(bytes, at, Math.min(at + WRITE_CHUNK, bytes.length)) });
  }
  return (await Filesystem.getUri({ path, directory: Directory.Cache })).uri;
}

const appStorage = async (): Promise<StorageReport> => {
  let usage: number | undefined;
  let quota: number | undefined;
  try {
    ({ usage, quota } = await navigator.storage.estimate());
  } catch {
    /* not reported */
  }
  return { kind: 'app', canRequest: false, persisted: true, usage, quota };
};

/** Send taps on links to other sites to the system browser instead of the app's own view. */
function routeExternalLinks(open: (url: string) => void) {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || !/^https?:$/.test(a.protocol) || a.origin === location.origin) return;
    e.preventDefault();
    open(a.href);
  });
}

export function createNativePlatform(kind: Exclude<PlatformKind, 'web'>): Platform {
  const platform: Platform = {
    kind,
    isNative: true,
    bundledAudio: true,
    externalLinkTarget: 'in your browser',

    async deliverFile(bytes, filename) {
      let uri: string;
      try {
        uri = await writeExport(bytes, filename);
      } catch (err) {
        throw new Error(`there is not enough free space, or the file could not be written (${(err as Error)?.message ?? 'no reason given'})`);
      }
      try {
        await Share.share({ title: filename, files: [uri], dialogTitle: 'Save or send' });
        return 'shared';
      } catch (err) {
        if (isShareCancel(err)) return 'cancelled';
        throw new Error(`the share sheet could not open (${(err as Error)?.message ?? 'no reason given'})`);
      }
    },

    openExternal(url) {
      // A navigation away from the app's own origin is handed to the system browser by
      // Capacitor (Bridge.launchIntent); the app's view never leaves the app.
      window.location.assign(url);
    },

    onBackButton(handler) {
      const pending = App.addListener('backButton', ({ canGoBack }) => handler({ canGoBack }));
      return () => void pending.then((h) => h.remove());
    },
    exitApp() {
      void App.exitApp();
    },

    setSystemBarsTheme(theme) {
      // Dark style = light icons, for the dark theme's background.
      void SystemBars.setStyle({ style: theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
    },
    appReady() {
      void SplashScreen.hide().catch(() => {});
    },

    async microphoneRefusal(): Promise<MicrophoneRefusal | null> {
      try {
        const s = await MicrophonePermission.status();
        if (s.granted) return null;
        return s.canAskAgain ? 'denied' : 'denied-permanently';
      } catch {
        return null;
      }
    },
    async openAppSettings() {
      try {
        await MicrophonePermission.openSettings();
        return true;
      } catch {
        return false;
      }
    },

    async appVersion() {
      try {
        const info = await App.getInfo();
        return { version: __APP_VERSION__, build: info.build };
      } catch {
        return { version: __APP_VERSION__ };
      }
    },

    async storageStatus() {
      return appStorage();
    },
    async requestPersistentStorage() {
      // The WebView keeps the app's data in the app's own storage; asking changes nothing visible.
      try {
        await navigator.storage?.persist?.();
      } catch {
        /* nothing to report */
      }
      return appStorage();
    },
  };
  routeExternalLinks((url) => platform.openExternal(url));
  return platform;
}
