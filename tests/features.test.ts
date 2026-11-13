import { describe, expect, it } from 'vitest';
import { listOf, missingFeatures } from '../src/lib/features';

const full = { indexedDB: {}, MediaRecorder: class {}, AudioContext: class {}, navigator: { mediaDevices: { getUserMedia: () => {} } } };

describe('startup feature check', () => {
  it('finds nothing missing when everything is there', () => {
    expect(missingFeatures(full)).toEqual([]);
    expect(missingFeatures({ ...full, AudioContext: undefined, webkitAudioContext: class {} })).toEqual([]);
  });
  it('names each missing feature', () => {
    expect(missingFeatures({ ...full, indexedDB: undefined })).toEqual(['storage']);
    expect(missingFeatures({ ...full, MediaRecorder: undefined })).toEqual(['recording']);
    expect(missingFeatures({ ...full, navigator: {} })).toEqual(['recording']);
    expect(missingFeatures({ ...full, AudioContext: undefined })).toEqual(['webAudio']);
    expect(missingFeatures({})).toEqual(['storage', 'recording', 'webAudio']);
  });
  it('treats storage that throws on access as missing', () => {
    const env = { ...full };
    Object.defineProperty(env, 'indexedDB', {
      get() {
        throw new Error('SecurityError');
      },
    });
    expect(missingFeatures(env)).toEqual(['storage']);
  });
  it('joins names into a sentence', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['a'])).toBe('a');
    expect(listOf(['a', 'b'])).toBe('a and b');
    expect(listOf(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('microphone refusal messages', async () => {
  const { refusalMessage } = await import('../src/lib/recorder');
  it('says how to fix each kind of refusal', () => {
    expect(refusalMessage(false, null).message).toMatch(/browser settings/);
    expect(refusalMessage(false, null).fix).toBeUndefined();
    expect(refusalMessage(true, 'denied').message).toMatch(/tap Record again and choose Allow/);
    expect(refusalMessage(true, 'denied').fix).toBeUndefined();
    expect(refusalMessage(true, 'denied-permanently').message).toMatch(/open Settings, then Permissions, then Microphone/);
    expect(refusalMessage(true, 'denied-permanently').fix).toBe('settings');
    expect(refusalMessage(true, null).fix).toBe('settings');
  });
});
