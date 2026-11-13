import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import identity from './app.config.json' with { type: 'json' };

/** Files in public/ that only an installable web app uses; the native build drops them. */
const PWA_ONLY_FILES = ['apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png', 'pwa-maskable-512.png'];

function dropPwaFiles(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-pwa-files',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    transformIndexHtml: (html) => html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '').replace(/\s*<meta name="apple-mobile-web-app-[^>]*>/g, '').replace(/\s*<meta name="mobile-web-app-capable"[^>]*>/, ''),
    closeBundle() {
      for (const f of PWA_ONLY_FILES) rmSync(join(outDir, f), { force: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  // `vite build --mode native` (npm run build:native) is the build packaged in the
  // Android app: served from the app's own origin, so base is "/", no service worker,
  // and no install icons. The audio and fonts are in dist/ either way.
  const native = mode === 'native';
  // GitHub Pages serves a project site from /<repo>/, Cloudflare Pages from /.
  // Set BASE_PATH=/<repo>/ when building for GitHub Pages (the workflow does this).
  const base = native ? '/' : (process.env.BASE_PATH ?? '/');
  return {
    base,
    define: {
      // The one app version, from package.json; Android's versionName is derived from it too.
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      preact(),
      native && dropPwaFiles(),
      VitePWA({
        // Off in the native build: no service worker, no manifest, and the register
        // module becomes a no-op.
        disable: native,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        manifest: {
          name: identity.appName,
          short_name: 'Pinyin',
          description: 'An interactive Mandarin pinyin chart with native audio, your own recordings and notes.',
          lang: 'en',
          display: 'standalone',
          orientation: 'any',
          start_url: '.',
          scope: '.',
          theme_color: '#f7f4ee',
          background_color: '#f7f4ee',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // The app shell, chart data and fonts are precached. Native audio is not:
          // the app caches clips itself (see src/lib/audio.ts), so they survive app updates.
          globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
          globIgnores: ['audio/**'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: {
      // The Android project's build folders hold copies of the app; watching them makes live reload loop.
      watch: { ignored: ['**/android/**'] },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
