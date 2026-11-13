/**
 * The system back button (Android). Back closes whatever is on top first: an open
 * menu, search results, the filters panel or a confirmation (the "layers"), then
 * the syllable sheet, then steps back through the pages; at the chart it leaves
 * the app. On the web the browser's own back button and Escape do this already.
 */
import { useEffect, useRef } from 'preact/hooks';

export type BackAction = 'close-layer' | 'close-sheet' | 'history-back' | 'go-home' | 'exit';

export interface BackState {
  /** Menus, result lists, panels and confirmations that are open. */
  layers: number;
  /** A syllable is open in the side panel or bottom sheet. */
  sheetOpen: boolean;
  /** On the chart with nothing open: the start screen. */
  atHome: boolean;
  /** The app's view has an earlier page to go back to. */
  canGoBack: boolean;
}

export function decideBack(s: BackState): BackAction {
  if (s.layers > 0) return 'close-layer';
  if (s.sheetOpen) return 'close-sheet';
  if (s.atHome) return 'exit';
  return s.canGoBack ? 'history-back' : 'go-home';
}

/** Open layers, most recently opened last. Each entry closes its layer. */
const layers: { close: () => void }[] = [];

/** Register an open layer; returns the function that unregisters it. */
export function pushLayer(close: () => void): () => void {
  const entry = { close };
  layers.push(entry);
  return () => {
    const i = layers.indexOf(entry);
    if (i >= 0) layers.splice(i, 1);
  };
}

export const openLayerCount = () => layers.length;

/** Close the most recently opened layer. False if none was open. */
export function closeTopLayer(): boolean {
  const top = layers.pop();
  if (!top) return false;
  top.close();
  return true;
}

/** While `open` is true, the system back button closes this layer (with `close`) before anything else. */
export function useBackLayer(open: boolean, close: () => void) {
  const latest = useRef(close);
  latest.current = close;
  useEffect(() => (open ? pushLayer(() => latest.current()) : undefined), [open]);
}
