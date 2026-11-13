/**
 * Capacitor configuration for the Android app (see docs/ANDROID.md).
 *
 * The app id and name come from app.config.json; the version comes from package.json
 * (read by android/app/build.gradle). Never add `server.url` here: live reload is only
 * through `npm run android:livereload`, which passes the address on the command line,
 * and scripts/check-native-config.ts fails CI if a server URL appears in any config.
 */
import type { CapacitorConfig } from '@capacitor/cli';
import identity from './app.config.json' with { type: 'json' };

const config: CapacitorConfig = {
  appId: identity.appId,
  appName: identity.appName,
  // `npm run build:native` writes the web app here (base "/", no service worker).
  webDir: 'dist',
  // Paper colour, so nothing white shows before the page paints. The splash screen
  // stays up until the app has drawn its first screen in the right theme.
  backgroundColor: '#f7f4ee',
  loggingBehavior: 'debug',
  server: {
    androidScheme: 'https',
  },
  android: {
    // Remote WebView debugging is left at Capacitor's default: on in debug builds,
    // off in release builds (they are not debuggable). No http content in https pages.
    allowMixedContent: false,
  },
  plugins: {
    SystemBars: {
      // Draw edge to edge and let the page pad itself with env(safe-area-inset-*).
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      // The app hides the launch screen as soon as it has drawn its first screen
      // (platform.appReady in src/main.tsx). The automatic hide after 4 s is only a
      // safety net, so a device that cannot run the app still sees its startup notice.
      launchAutoHide: true,
      launchShowDuration: 4000,
      launchFadeOutDuration: 150,
    },
  },
};

export default config;
