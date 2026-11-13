/**
 * The platform layer with Capacitor mocked: the native implementation's file
 * delivery (chunked writes, share sheet, cancel, errors), back button, microphone,
 * version and storage reports; the web implementation's download; and the choice
 * between them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  native: false,
  kind: 'web',
  written: [] as { op: string; path: string; data?: string }[],
  share: vi.fn(),
  writeFail: false,
  backHandler: null as null | ((e: { canGoBack: boolean }) => void),
  removed: 0,
  exit: vi.fn(),
  setStyle: vi.fn(() => Promise.resolve()),
  hide: vi.fn(() => Promise.resolve()),
  mic: { granted: false, canAskAgain: true } as { granted: boolean; canAskAgain: boolean } | Error,
  openSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => h.kind },
  registerPlugin: () => ({
    status: () => (h.mic instanceof Error ? Promise.reject(h.mic) : Promise.resolve(h.mic)),
    openSettings: h.openSettings,
  }),
  SystemBars: { setStyle: h.setStyle },
  SystemBarsStyle: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    rmdir: vi.fn(async ({ path }) => void h.written.push({ op: 'rmdir', path })),
    mkdir: vi.fn(async ({ path }) => void h.written.push({ op: 'mkdir', path })),
    writeFile: vi.fn(async ({ path, data }) => {
      if (h.writeFail) throw new Error('ENOSPC');
      h.written.push({ op: 'write', path, data });
    }),
    appendFile: vi.fn(async ({ path, data }) => void h.written.push({ op: 'append', path, data })),
    getUri: vi.fn(async ({ path }) => ({ uri: `file:///data/cache/${path}` })),
  },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: h.share } }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_name: string, fn: (e: { canGoBack: boolean }) => void) => {
      h.backHandler = fn;
      return { remove: () => void h.removed++ };
    }),
    exitApp: h.exit,
    getInfo: vi.fn(async () => ({ version: '1.0.0', build: '10000' })),
  },
}));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: h.hide } }));

// Minimal DOM: the native platform listens for link taps; the web one makes an <a download>.
const clicks: { href: string; download: string }[] = [];
let clickListener: ((e: unknown) => void) | null = null;
beforeEach(() => {
  h.written = [];
  h.writeFail = false;
  h.share.mockReset();
  clicks.length = 0;
  vi.stubGlobal('document', {
    addEventListener: (_t: string, fn: (e: unknown) => void) => (clickListener = fn),
    createElement: () => {
      const a = { href: '', download: '', click: () => clicks.push({ href: a.href, download: a.download }), remove: () => {} };
      return a;
    },
    body: { appendChild: () => {} },
  });
  vi.stubGlobal('location', { origin: 'https://localhost', assign: vi.fn() });
  vi.stubGlobal('window', { location: globalThis.location, open: vi.fn() });
  vi.stubGlobal('navigator', { storage: { estimate: async () => ({ usage: 5, quota: 100 }), persist: async () => true, persisted: async () => false } });
});
afterEach(() => vi.unstubAllGlobals());

const decode = (b64: string) => new Uint8Array(Buffer.from(b64, 'base64'));

describe('native platform', async () => {
  const { createNativePlatform, base64Of, WRITE_CHUNK, isShareCancel } = await import('../src/platform/native');

  it('encodes bytes to base64 in slices that decode back exactly', () => {
    const bytes = Uint8Array.from({ length: 100_003 }, (_, i) => (i * 31) % 256);
    expect(decode(base64Of(bytes))).toEqual(bytes);
    expect(decode(base64Of(bytes, 3, 9))).toEqual(bytes.subarray(3, 9));
  });

  it('writes a large export in chunks to the cache export folder, then opens the share sheet', async () => {
    const p = createNativePlatform('android');
    const bytes = Uint8Array.from({ length: WRITE_CHUNK * 2 + 1234 }, (_, i) => i % 251);
    h.share.mockResolvedValue({ activityType: 'com.google.android.apps.docs' });
    expect(await p.deliverFile(bytes, 'pinyin-chart-20261113-1200.zip', 'application/zip')).toBe('shared');
    const ops = h.written.map((w) => w.op);
    expect(ops).toEqual(['rmdir', 'mkdir', 'write', 'append', 'append']);
    expect(h.written.slice(2).every((w) => w.path === 'exports/pinyin-chart-20261113-1200.zip')).toBe(true);
    const joined = Buffer.concat(h.written.slice(2).map((w) => Buffer.from(w.data!, 'base64')));
    expect(joined.equals(Buffer.from(bytes))).toBe(true);
    expect(h.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///data/cache/exports/pinyin-chart-20261113-1200.zip'] }));
  });

  it('writes a small file in one piece', async () => {
    const p = createNativePlatform('android');
    h.share.mockResolvedValue({});
    await p.deliverFile(new Uint8Array([1, 2, 3]), 'x.zip', 'application/zip');
    expect(h.written.filter((w) => w.op === 'append')).toHaveLength(0);
  });

  it('reports a closed share sheet as cancelled, not as an error', async () => {
    const p = createNativePlatform('android');
    h.share.mockRejectedValue(new Error('Share canceled'));
    expect(await p.deliverFile(new Uint8Array([1]), 'x.zip', 'application/zip')).toBe('cancelled');
    expect(isShareCancel(new Error('Share canceled'))).toBe(true);
    expect(isShareCancel(new Error('No Activity found'))).toBe(false);
  });

  it('turns write and share failures into messages', async () => {
    const p = createNativePlatform('android');
    h.writeFail = true;
    await expect(p.deliverFile(new Uint8Array([1]), 'x.zip', 'application/zip')).rejects.toThrow(/not enough free space|could not be written/);
    h.writeFail = false;
    h.share.mockRejectedValue(new Error('No Activity found to handle Intent'));
    await expect(p.deliverFile(new Uint8Array([1]), 'x.zip', 'application/zip')).rejects.toThrow(/share sheet could not open/);
  });

  it('passes the back button through and can stop listening', async () => {
    const p = createNativePlatform('android');
    const seen: boolean[] = [];
    const off = p.onBackButton((e) => seen.push(e.canGoBack));
    await Promise.resolve();
    h.backHandler?.({ canGoBack: true });
    h.backHandler?.({ canGoBack: false });
    expect(seen).toEqual([true, false]);
    off();
    await new Promise((r) => setTimeout(r, 0));
    expect(h.removed).toBe(1);
    p.exitApp();
    expect(h.exit).toHaveBeenCalled();
  });

  it('tells a refusal it may ask again from one it may not', async () => {
    const p = createNativePlatform('android');
    h.mic = { granted: false, canAskAgain: true };
    expect(await p.microphoneRefusal()).toBe('denied');
    h.mic = { granted: false, canAskAgain: false };
    expect(await p.microphoneRefusal()).toBe('denied-permanently');
    h.mic = { granted: true, canAskAgain: false };
    expect(await p.microphoneRefusal()).toBeNull();
    h.mic = new Error('not implemented');
    expect(await p.microphoneRefusal()).toBeNull();
    expect(await p.openAppSettings()).toBe(true);
  });

  it('reports the version with the build number, app storage, and bundled audio', async () => {
    const p = createNativePlatform('android');
    expect(await p.appVersion()).toEqual({ version: __APP_VERSION__, build: '10000' });
    expect(await p.storageStatus()).toEqual({ kind: 'app', canRequest: false, persisted: true, usage: 5, quota: 100 });
    expect((await p.requestPersistentStorage()).kind).toBe('app');
    expect(p.bundledAudio).toBe(true);
    expect(p.externalLinkTarget).toBe('in your browser');
  });

  it('matches the system bar icons to the theme and hides the launch screen', () => {
    const p = createNativePlatform('android');
    p.setSystemBarsTheme('dark');
    p.setSystemBarsTheme('light');
    expect(h.setStyle.mock.calls.map((c) => (c as unknown as [{ style: string }])[0].style)).toEqual(['DARK', 'LIGHT']);
    p.appReady();
    expect(h.hide).toHaveBeenCalled();
  });

  it('sends taps on links to other sites to the browser and leaves the app’s own links alone', () => {
    createNativePlatform('android');
    const tapLink = (href: string) => {
      const u = new URL(href);
      const e = { defaultPrevented: false, button: 0, target: { closest: () => ({ protocol: u.protocol, origin: u.origin, href }) }, preventDefault() { this.defaultPrevented = true; } };
      clickListener?.(e);
      return e.defaultPrevented;
    };
    expect(tapLink('https://forvo.com/word/%E5%A6%88/')).toBe(true);
    expect(location.assign).toHaveBeenCalledWith('https://forvo.com/word/%E5%A6%88/');
    expect(tapLink('https://localhost/#/credits')).toBe(false);
  });
});

describe('web platform', async () => {
  const { webPlatform } = await import('../src/platform/web');
  it('downloads files and reports browser storage', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
    expect(await webPlatform.deliverFile(new Uint8Array([1, 2]), 'b.zip', 'application/zip')).toBe('downloaded');
    expect(clicks).toEqual([{ href: 'blob:x', download: 'b.zip' }]);
    expect(await webPlatform.storageStatus()).toEqual({ kind: 'browser', canRequest: true, persisted: null, usage: 5, quota: 100 });
    expect((await webPlatform.requestPersistentStorage()).persisted).toBe(true);
    expect(await webPlatform.microphoneRefusal()).toBeNull();
    expect(await webPlatform.openAppSettings()).toBe(false);
    expect(await webPlatform.appVersion()).toEqual({ version: __APP_VERSION__ });
    expect(webPlatform.bundledAudio).toBe(false);
  });
  it('reports storage it cannot ask about', async () => {
    vi.stubGlobal('navigator', {});
    expect(await webPlatform.storageStatus()).toEqual({ kind: 'browser', canRequest: false, persisted: null });
  });
});

describe('choosing the platform', () => {
  it('uses the web implementation in a browser and the native one in the Android app', async () => {
    vi.resetModules();
    h.native = false;
    h.kind = 'web';
    expect((await import('../src/platform')).platform.kind).toBe('web');
    vi.resetModules();
    h.native = true;
    h.kind = 'android';
    const { platform } = await import('../src/platform');
    expect(platform.kind).toBe('android');
    expect(platform.isNative).toBe(true);
  });
});
