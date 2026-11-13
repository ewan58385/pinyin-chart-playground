/** The platform as a web browser sees it: downloads, new tabs, browser storage. */
import type { Platform, StorageReport } from './types';

async function estimate(): Promise<{ usage?: number; quota?: number }> {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return {};
  }
}

const storageApi = () => (typeof navigator === 'undefined' ? undefined : navigator.storage);

export const webPlatform: Platform = {
  kind: 'web',
  isNative: false,
  bundledAudio: false,
  externalLinkTarget: 'in a new tab',

  async deliverFile(bytes, filename, type) {
    const blob = new Blob([bytes as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloaded';
  },

  openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  onBackButton: () => () => {},
  exitApp() {},
  setSystemBarsTheme() {},
  appReady() {},

  // A browser does not say whether it will ask again; its own settings decide.
  microphoneRefusal: async () => null,
  openAppSettings: async () => false,

  appVersion: async () => ({ version: __APP_VERSION__ }),

  async storageStatus(): Promise<StorageReport> {
    const storage = storageApi();
    if (!storage?.persist) return { kind: 'browser', canRequest: false, persisted: null };
    let persisted: boolean | null = null;
    try {
      if (await storage.persisted()) persisted = true;
    } catch {
      /* leave as unknown */
    }
    return { kind: 'browser', canRequest: true, persisted, ...(await estimate()) };
  },

  async requestPersistentStorage(): Promise<StorageReport> {
    const storage = storageApi();
    if (!storage?.persist) return { kind: 'browser', canRequest: false, persisted: null };
    try {
      const persisted = (await storage.persisted()) || (await storage.persist());
      return { kind: 'browser', canRequest: true, persisted, ...(await estimate()) };
    } catch {
      return { kind: 'browser', canRequest: true, persisted: false };
    }
  },
};
