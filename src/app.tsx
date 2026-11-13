import { useEffect } from 'preact/hooks';
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
import { crumbsFor, hasPanel } from './lib/routes';

import { AboutPage } from './components/AboutPage';
import { CreditsPage } from './components/CreditsPage';
import { route } from './lib/router';
import { filtersOpen, memoryOnly, ready, settings, toast } from './lib/store';
import { online } from './lib/viewport';

export function App() {
  const page = route.value.page;
  const s = settings.value;

  // The tab title follows the page (and the open syllable): "zhi · E group · Pinyin Chart".
  useEffect(() => {
    const trail = crumbsFor(route.value);
    const here = trail.length > 1 ? trail[trail.length - 1].label : '';
    document.title = [route.value.syllable, here, 'Pinyin Chart'].filter(Boolean).join(' · ');
  }, [route.value]);

  // Every appearance setting is written to <html> (tokens and attributes) and cached for the next first paint.
  useEffect(() => {
    if (!ready.value) return;
    applyAppearance(s);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(settings.value);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [ready.value, s.theme, s.preset, s.typeface, s.cjk, s.textSize, s.spacing, s.toneColours, s.cellBorders, s.reduceMotion]);

  return (
    <div class="app">
      <TopBar />
      {memoryOnly.value && (
        <div class="banner" role="status">
          This browser is not letting the app save anything (private browsing?), so your notes and recordings will be lost when you close the tab.
        </div>
      )}
      {!online.value && page === 'chart' && (
        <div class="banner" role="status">
          You are offline. Recordings you have already played or downloaded still work; the others will play when you are back online.
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
          {page === 'about' && <AboutPage />}
          {page === 'credits' && <CreditsPage />}
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
