/**
 * The platform the app is running on, chosen once at startup with Capacitor's own
 * platform detection: the Android app gets the native implementation, a browser gets
 * the web one. Import `platform` from here; never import Capacitor elsewhere.
 */
import { Capacitor } from '@capacitor/core';
import { createNativePlatform } from './native';
import { webPlatform } from './web';
import type { Platform } from './types';

export type * from './types';

function choose(): Platform {
  const kind = Capacitor.getPlatform();
  if (Capacitor.isNativePlatform() && (kind === 'android' || kind === 'ios')) return createNativePlatform(kind);
  return webPlatform;
}

export const platform: Platform = choose();
