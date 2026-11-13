import { describe, expect, it } from 'vitest';
import { closeTopLayer, decideBack, openLayerCount, pushLayer, type BackState } from '../src/lib/back';

const at = (s: Partial<BackState>): BackState => ({ layers: 0, sheetOpen: false, atHome: false, canGoBack: true, ...s });

describe('system back button: what it does', () => {
  it('closes an open layer before anything else', () => {
    expect(decideBack(at({ layers: 1, sheetOpen: true, atHome: false }))).toBe('close-layer');
    expect(decideBack(at({ layers: 2, atHome: true }))).toBe('close-layer');
  });
  it('then closes the syllable sheet', () => {
    expect(decideBack(at({ sheetOpen: true }))).toBe('close-sheet');
    expect(decideBack(at({ sheetOpen: true, canGoBack: false }))).toBe('close-sheet');
  });
  it('then steps back through pages', () => {
    expect(decideBack(at({}))).toBe('history-back');
  });
  it('goes to the chart from a page with no history (opened directly)', () => {
    expect(decideBack(at({ canGoBack: false }))).toBe('go-home');
  });
  it('leaves the app on the chart with nothing open, even with history behind it', () => {
    expect(decideBack(at({ atHome: true }))).toBe('exit');
    expect(decideBack(at({ atHome: true, canGoBack: false }))).toBe('exit');
  });
});

describe('open layers', () => {
  it('closes the most recently opened layer first, one per press', () => {
    const closed: string[] = [];
    const offMenu = pushLayer(() => closed.push('menu'));
    pushLayer(() => closed.push('confirm'));
    expect(openLayerCount()).toBe(2);
    expect(closeTopLayer()).toBe(true);
    expect(closed).toEqual(['confirm']);
    expect(openLayerCount()).toBe(1);
    offMenu(); // the menu closed itself (a tap outside, Escape)
    expect(openLayerCount()).toBe(0);
    expect(closeTopLayer()).toBe(false);
    expect(closed).toEqual(['confirm']);
  });
  it('unregistering twice or out of order is harmless', () => {
    const a = pushLayer(() => {});
    const b = pushLayer(() => {});
    a();
    a();
    expect(openLayerCount()).toBe(1);
    b();
    expect(openLayerCount()).toBe(0);
  });
});
