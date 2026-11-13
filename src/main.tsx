import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './styles/fonts.css';
import './styles/base.css';
import './styles/chart.css';
import './styles/detail.css';
import './styles/pages.css';
import './styles/blocks.css';
import './styles/settings.css';
import './styles/practice.css';
import './styles/nav.css';
import './styles/learn.css';
import { App } from './app';
import { loadUserData, checkPersistence } from './lib/store';
import { purgeStaleAudioCaches, refreshCachedCount } from './lib/audio';

render(<App />, document.getElementById('app')!);

void loadUserData().then(() => {
  // Whether storage is persistent is shown on the "My data" page. The request
  // itself is made the first time something is saved (see store.ts).
  void checkPersistence();
  // Audio buckets from earlier releases are dropped before counting what is cached.
  void purgeStaleAudioCaches().then(refreshCachedCount);
});

// The service worker makes the app shell, chart data and fonts available offline.
// A new version installs in the background and takes over on the next visit.
registerSW({ immediate: true });
