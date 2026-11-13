import { describe, expect, it } from 'vitest';
import { mergeNotes } from '../src/lib/notes';

describe('merging the old syllable notes into the tone note', () => {
  it('puts the note first, then each field on its own line, only when it has text', () => {
    expect(mergeNotes('dips low', 'buzzed', 'not "juh"')).toBe('dips low\nHow it sounds: buzzed\nWatch out: not "juh"');
    expect(mergeNotes('', 'buzzed', '')).toBe('How it sounds: buzzed');
    expect(mergeNotes('', '', 'careful')).toBe('Watch out: careful');
    expect(mergeNotes('keep', '', '')).toBe('keep');
    expect(mergeNotes('', '  ', '')).toBe('');
  });

  it('is idempotent', () => {
    const once = mergeNotes('dips', 'buzzed', 'not juh');
    expect(mergeNotes(once, 'buzzed', 'not juh')).toBe(once);
    expect(mergeNotes(mergeNotes(once, 'buzzed', 'not juh'), 'buzzed', 'not juh')).toBe(once);
  });

  it('keeps multi-line notes and trims trailing whitespace', () => {
    expect(mergeNotes('line one\nline two\n', 'x', '')).toBe('line one\nline two\nHow it sounds: x');
  });
});
