import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, settingsFrom } from '../src/lib/store';

describe('stored settings', () => {
  it('lays stored values over the defaults', () => {
    const s = settingsFrom([
      { name: 'flipAxes', value: true },
      { name: 'preset', value: 'sepia' },
    ]);
    expect(s.flipAxes).toBe(true);
    expect(s.preset).toBe('sepia');
    expect(s.heatmap).toBe(DEFAULT_SETTINGS.heatmap);
  });
  it('ignores settings left behind by removed features, and values of the wrong type', () => {
    const s = settingsFrom([
      { name: 'voice', value: 'someone' },
      { name: 'accent', value: 'teal' },
      { name: 'customAccent', value: '#ffcc00' },
      { name: 'rate', value: 'fast' },
    ]) as unknown as Record<string, unknown>;
    expect('voice' in s).toBe(false);
    // The accent is fixed now: an old accent choice is ignored.
    expect('accent' in s).toBe(false);
    expect('customAccent' in s).toBe(false);
    expect(s.rate).toBe(DEFAULT_SETTINGS.rate);
  });
});

describe('settings fallback at startup', () => {
  it('never throws, whatever is stored', () => {
    for (const junk of [undefined, null, 42, 'text', {}, [null, undefined, 7, 'x', [], {}], [{ name: null, value: 1 }, { value: 'dark' }, { name: 'theme' }]])
      expect(settingsFrom(junk as never)).toEqual(DEFAULT_SETTINGS);
  });

  it('ignores names inherited from Object, and values outside a fixed choice', () => {
    const s = settingsFrom([
      { name: 'toString', value: 'x' },
      { name: '__proto__', value: { theme: 'dark' } },
      { name: 'theme', value: 'purple' },
      { name: 'textSize', value: 9 },
      { name: 'textSize', value: Number.NaN },
      { name: 'rate', value: 2 },
      { name: 'density', value: 'everything' },
    ]);
    expect(s).toEqual(DEFAULT_SETTINGS);
    expect(Object.prototype.hasOwnProperty.call(s, 'toString')).toBe(false);
  });

  it('still takes the valid rows next to malformed ones', () => {
    const s = settingsFrom([null, { name: 'accent', value: 'teal' }, { name: 'theme', value: 'dark' }, { name: 'textSize', value: 3 }, { name: 'rate', value: 0.75 }]);
    expect(s.theme).toBe('dark');
    expect(s.textSize).toBe(3);
    expect(s.rate).toBe(0.75);
  });

  it('loads saved data even when stored rows are malformed', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    vi.stubGlobal('indexedDB', undefined);
    const db = await import('../src/lib/db');
    const store = await import('../src/lib/store');
    await db.put('settings', { name: 'theme', value: 'dark', updatedAt: 1 });
    await db.put('settings', { name: 'accent', value: 'teal', updatedAt: 1 });
    await db.put('status', { cell: 'ma1', status: 'solid', updatedAt: 1 });
    await db.put('status', { status: 'shaky' } as never); // no cell
    await store.loadUserData();
    expect(store.ready.value).toBe(true);
    expect(store.settings.value.theme).toBe('dark');
    expect(store.statuses.value).toEqual({ ma1: 'solid' });
    // The removed accent setting is deleted from storage.
    await new Promise((r) => setTimeout(r, 10));
    expect((await db.getAll<{ name: string }>('settings')).map((r) => r.name)).toEqual(['theme']);
    vi.unstubAllGlobals();
  });
});
