/**
 * What the app needs from the platform it runs on. The web build and the Android app
 * each implement this (web.ts, native.ts); index.ts picks one at startup. The rest of
 * the app talks only to this interface, so adding iOS means adding an implementation,
 * not changing the app. Nothing outside src/platform/ and src/main.tsx imports Capacitor.
 */

export type PlatformKind = 'web' | 'android' | 'ios';

/** How a file the app made left it: downloaded by the browser, or handed to the share sheet. */
export type DeliverResult = 'downloaded' | 'shared' | 'cancelled';

/** Why the microphone could not be opened after the user was asked. */
export type MicrophoneRefusal =
  /** Refused, but the app may ask again next time. */
  | 'denied'
  /** Refused for good: only the system or browser settings can change it. */
  | 'denied-permanently';

export interface StorageReport {
  /**
   * "browser": the browser may clear the data under storage pressure unless it agrees
   * to keep it (persisted). "app": the data is in the app's own storage on the device.
   */
  kind: 'browser' | 'app';
  /** The browser can be asked to keep the data. Always false for "app". */
  canRequest: boolean;
  /** null = not asked yet or unknown. */
  persisted: boolean | null;
  usage?: number;
  quota?: number;
}

export interface AppVersion {
  /** package.json version, e.g. "1.0.0". */
  version: string;
  /** The store build number, where there is one (Android versionCode). */
  build?: string;
}

export interface BackEvent {
  /** The WebView has an earlier history entry. */
  canGoBack: boolean;
}

export interface Platform {
  readonly kind: PlatformKind;
  readonly isNative: boolean;
  /** The native recordings ship inside the app: nothing to download, cache or wait for. */
  readonly bundledAudio: boolean;
  /** How an external link opens, for labels: "in a new tab" or "in your browser". */
  readonly externalLinkTarget: string;

  /** Save or share a file the app made (backup, Anki export). Rejects with a message fit to show. */
  deliverFile(bytes: Uint8Array, filename: string, type: string): Promise<DeliverResult>;
  /** Open a web address outside the app. */
  openExternal(url: string): void;

  /** The system back button or gesture. Returns a function that removes the handler. Web: never called. */
  onBackButton(handler: (e: BackEvent) => void): () => void;
  /** Leave the app (Android: back at the start screen). Web: does nothing. */
  exitApp(): void;

  /** Match the status and navigation bar icons to the theme: light icons on the dark theme. */
  setSystemBarsTheme(theme: 'light' | 'dark'): void;
  /** Hide the launch screen once the app has drawn itself. */
  appReady(): void;

  /** After the microphone was refused: may the app ask again? null if unknown. */
  microphoneRefusal(): Promise<MicrophoneRefusal | null>;
  /** Open this app's page in the system settings. False if there is none (web). */
  openAppSettings(): Promise<boolean>;

  appVersion(): Promise<AppVersion>;

  /** Where the user's data is kept and whether it may be cleared. Never prompts. */
  storageStatus(): Promise<StorageReport>;
  /** Ask for the data to be kept (may prompt in some browsers). */
  requestPersistentStorage(): Promise<StorageReport>;
}
