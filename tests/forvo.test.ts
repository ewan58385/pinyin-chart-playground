import { describe, expect, it } from 'vitest';
import { forvoLink, forvoSearchUrl, forvoWordUrl } from '../src/lib/forvo';

describe('Forvo links', () => {
  it('uses the word page for an example character or word, percent-encoded', () => {
    expect(forvoWordUrl('妈')).toBe('https://forvo.com/word/%E5%A6%88/');
    expect(forvoLink('妈', 'mā')).toEqual({ url: 'https://forvo.com/word/%E5%A6%88/', term: '妈', kind: 'word' });
    expect(forvoLink(' 妈妈 ', 'māma').url).toBe('https://forvo.com/word/%E5%A6%88%E5%A6%88/');
  });
  it('falls back to a Mandarin search for the pinyin when there is no character', () => {
    expect(forvoSearchUrl('中')).toBe('https://forvo.com/search/%E4%B8%AD/zh/');
    expect(forvoLink('', 'lüè')).toEqual({ url: 'https://forvo.com/search/l%C3%BC%C3%A8/zh/', term: 'lüè', kind: 'search' });
  });
  it('only ever points at forvo.com over https', () => {
    for (const l of [forvoLink('妈', 'mā'), forvoLink('', 'ma')]) expect(new URL(l.url).origin).toBe('https://forvo.com');
  });
});
