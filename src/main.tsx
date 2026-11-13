import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './styles/fonts.css';
import './styles/base.css';
import './styles/chart.css';
import './styles/detail.css';
import './styles/pages.css';
import './styles/blocks.css';
import './styles/settings.css';
import './styles/nav.css';
import './styles/learn.css';
import { App } from './app';
import { ErrorBoundary, StartupError } from './components/StartupError';
import { loadUserData, checkPersistence, ready } from './lib/store';
import { purgeStaleAudioCaches, refreshCachedCount } from './lib/audio';
import { listenForSystemBack } from './lib/systemBack';
import { platform } from './platform';

// index.html puts a plain "starting" notice in #app so the screen is never blank
// while the script loads (or if it cannot load); it is replaced here.
const root = document.getElementById('app')!;
root.textContent = '';
try {
  render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
    root,
  );
} catch (err) {
  console.error('Pinyin Chart failed to start:', err);
  root.textContent = '';
  render(<StartupError />, root);
}

// Android: the back button closes what is open, then steps back, then leaves the app.
listenForSystemBack();

void loadUserData()
  .catch((err) => {
    // Reading stored data should not fail (loadUserData guards each store), but if it
    // does, the app still opens with the defaults rather than waiting forever.
    console.error('Could not load saved data:', err);
    ready.value = true;
  })
  .then(() => {
    // Whether storage is persistent is shown on the "My data" page. The request
    // itself is made the first time something is saved (see store.ts).
    void checkPersistence();
    // Audio buckets from earlier releases are dropped before counting what is cached.
    void purgeStaleAudioCaches().then(refreshCachedCount);
  })
  .finally(() => {
    // The launch screen (Android) stays up until the first screen is drawn in the
    // saved theme, so there is no flash of the wrong colours.
    requestAnimationFrame(() => platform.appReady());
  });

// The service worker makes the app shell, chart data and fonts available offline.
// A new version installs in the background and takes over on the next visit.
// The Android app has everything inside it and updates through the store: no service worker
// (the native build also turns the plugin off, so this import is a no-op there).
if (!platform.isNative) registerSW({ immediate: true });
