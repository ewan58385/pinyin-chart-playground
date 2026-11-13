/** Connects the system back button to the app: see decideBack in back.ts for the order. */
import { platform } from '../platform';
import { closeTopLayer, decideBack, openLayerCount } from './back';
import { closeSyllable, goPage, route } from './router';

export function handleSystemBack(canGoBack: boolean) {
  const r = route.value;
  const action = decideBack({
    layers: openLayerCount(),
    sheetOpen: !!r.syllable,
    atHome: r.page === 'chart' && !r.block && !r.syllable,
    canGoBack,
  });
  if (action === 'close-layer') closeTopLayer();
  else if (action === 'close-sheet') closeSyllable();
  else if (action === 'history-back') history.back();
  else if (action === 'go-home') goPage('chart');
  else platform.exitApp();
}

export function listenForSystemBack() {
  return platform.onBackButton(({ canGoBack }) => handleSystemBack(canGoBack));
}
