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
      { name: 'rate', value: 'fast' },
    ]) as unknown as Record<string, unknown>;
    expect('voice' in s).toBe(false);
    expect(s.rate).toBe(DEFAULT_SETTINGS.rate);
  });
});
