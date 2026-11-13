import { useEffect, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import { applyAppearance } from './lib/theme';
import { TabBar, TopBar } from './components/TopBar';
import { FilterBar } from './components/FilterBar';
import { Chart } from './components/Chart';
import { Detail } from './components/Detail';
import { DataPage } from './components/DataPage';
import { BlockPage } from './components/BlockPage';
import { SettingsPage } from './components/SettingsPage';
import { FinalsOverview, InitialsOverview } from './components/OverviewPages';
import { BrowsePage } from './components/BrowsePage';
import { LearnPage } from './components/LearnPage';
import { hasPanel } from './lib/routes';

/** The practice area is its own chunk, fetched the first time it is opened. */
function PracticeLazy() {
  const [Page, setPage] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    import('./practice/PracticePage').then(
      (m) => live && setPage(() => m.default),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);
  if (failed) return <p class="page">The practice area could not be loaded. If you are offline, open it once while online.</p>;
  return Page ? <Page /> : <p class="page hint">Loading…</p>;
}
import { AboutPage } from './components/AboutPage';
import { route } from './lib/router';
import { filtersOpen, memoryOnly, ready, settings, toast } from './lib/store';
import { online } from './lib/viewport';

export function App() {
  const page = route.value.page;
  const s = settings.value;

  // Every appearance setting is written to <html> (tokens and attributes) and cached for the next first paint.
  useEffect(() => {
    if (!ready.value) return;
    applyAppearance(s);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(settings.value);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [ready.value, s.theme, s.preset, s.accent, s.customAccent, s.typeface, s.cjk, s.textSize, s.spacing, s.toneColours, s.cellBorders, s.reduceMotion]);

  return (
    <div class="app">
      <TopBar />
      {memoryOnly.value && (
        <div class="banner" role="status">
          This browser is not letting the app store data (private browsing?). Notes and recordings will be lost when you close the tab.
        </div>
      )}
      {!online.value && page === 'chart' && (
        <div class="banner" role="status">
          Offline. Clips you have played or downloaded still work; the rest will be silent until you are back online.
        </div>
      )}
      {page === 'chart' && filtersOpen.value && <FilterBar />}
      {page === 'chart' || page === 'finals' || page === 'initials' || page === 'browse' || page === 'learn' ? (
        <main class={`stage${page !== 'chart' ? ' blocks' : ''}${route.value.syllable ? ' sheet-open' : ''}`}>
          {ready.value && page === 'chart' && <Chart />}
          {ready.value && (page === 'finals' || page === 'initials') && (route.value.block ? <BlockPage key={`${page}/${route.value.block}`} /> : page === 'finals' ? <FinalsOverview /> : <InitialsOverview />)}
          {ready.value && page === 'browse' && <BrowsePage />}
          {ready.value && page === 'learn' && <LearnPage />}
          {ready.value && route.value.syllable && hasPanel(route.value) && <Detail key={route.value.syllable} />}
        </main>
      ) : (
        <main class="page-wrap">
          {page === 'data' && <DataPage />}
          {page === 'settings' && <SettingsPage />}
          {page === 'practice' && (s.showPractice ? <PracticeLazy /> : <p class="page hint">The practice area is turned off in Settings.</p>)}
          {page === 'about' && <AboutPage />}
        </main>
      )}
      <TabBar />
      {toast.value && (
        <div class={`toast ${toast.value.kind}`} role={toast.value.kind === 'error' ? 'alert' : 'status'}>
          {toast.value.text}
        </div>
      )}
    </div>
  );
}
