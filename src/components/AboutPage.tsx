import { AUDIO_CLIPS_BY_TONE, AUDIO_SOURCES, AUDIO_TOTAL_BYTES, DATA_META, SYLLABLES, hasNativeAudio } from '../data';
import { totalClipCount } from '../lib/audio';

const Ext = ({ href, children }: { href: string; children: preact.ComponentChildren }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

/** What each data set is credited for. */
const CREDIT_FOR: Record<string, string> = {
  cedict: 'Example characters, meanings and example words',
  unihan: 'Pronunciations of characters',
  subtlexChr: 'How common each character is',
  subtlexWf: 'How common each word is',
  hsk: 'Word lists by HSK level',
};

const n = (x: number) => x.toLocaleString('en-GB');

const FONTS: { name: string; href: string; by: string }[] = [
  { name: 'Source Serif 4', href: 'https://github.com/adobe-fonts/source-serif', by: 'the Source Serif 4 Project Authors' },
  { name: 'Source Sans 3', href: 'https://github.com/adobe-fonts/source-sans', by: 'Adobe' },
  { name: 'Literata', href: 'https://github.com/googlefonts/literata', by: 'the Literata Project Authors' },
  { name: 'Inter', href: 'https://github.com/rsms/inter', by: 'the Inter Project Authors' },
  { name: 'Noto Serif and Noto Sans', href: 'https://github.com/notofonts/latin-greek-cyrillic', by: 'the Noto Project Authors' },
  { name: 'Source Han Serif and Source Han Sans', href: 'https://github.com/adobe-fonts/source-han-serif', by: 'Adobe' },
];

export function AboutPage() {
  const c = DATA_META.counts;
  const tones = c.toneCellsStandard + c.toneCellsNeutralInWord;
  // Tones without a native recording, among those shown by default.
  const silent = SYLLABLES.flatMap((s) => s.tones).filter((t) => t.status !== 'single-source' && !hasNativeAudio(t.numeric));
  const onlyNeutralSilent = silent.length > 0 && silent.every((t) => t.tone === 5) && AUDIO_CLIPS_BY_TONE[5] === 0;
  return (
    <article class="page about">
      <h1>About Pinyin Chart</h1>
      <p class="lede">
        A study companion for Mandarin pronunciation: every syllable and tone, with a native recording to listen to, an example character, and room for your
        own notes and recordings.
      </p>

      <section>
        <h2>What is in it</h2>
        <div class="stat-grid">
          <div class="stat">
            <b>{n(c.syllablesStandard)}</b>
            <span>syllables</span>
          </div>
          <div class="stat">
            <b>{n(tones)}</b>
            <span>tones in all</span>
          </div>
          <div class="stat">
            <b>{n(c.cellsWithCharacter)}</b>
            <span>with an example character</span>
          </div>
          <div class="stat">
            <b>{n(totalClipCount)}</b>
            <span>native recordings, {(AUDIO_TOTAL_BYTES / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
      </section>

      <section>
        <h2>Finding your way</h2>
        <ul class="plain">
          <li>
            <a href="#/">Chart</a>: every syllable. The group names and initials in its headings open their own pages.
          </li>
          <li>
            <a href="#/finals">Finals</a> and <a href="#/initials">Initials</a>: the 36 finals in six groups, and the 21 initials in seven groups, each with a page per
            group.
          </li>
          <li>
            <a href="#/browse">Browse</a>: the same syllables sorted by kind of sound: type of final, tricky spellings, and how hard each initial is.
          </li>
          <li>
            <a href="#/learn">Learn</a>: nine stages from the easiest sounds to the hardest. Each stage explains what it covers and why it comes where it does,
            shows where its syllables sit on the chart, and lets you listen to them and mark how well you know them. Nothing is locked.
          </li>
          <li>
            <a href="#/data">My data</a>: what is saved on this device, recordings for offline use, Anki cards, backup and restore.
          </li>
        </ul>
      </section>

      <section>
        <h2>Limitations</h2>
        <ul class="plain">
          <li>Meanings are kept short, and an example character or word is not always the best one. You can edit any of them.</li>
          <li>
            Pinyin shows each syllable’s own tone. Tone changes in connected speech, such as 不 before a fourth tone, 一, or two third tones in a row, are not
            shown.
          </li>
          <li>A few rare syllables and tones are hidden. To see them, turn on “Rare syllables” in the ⋯ menu.</li>
          {onlyNeutralSilent ? (
            <li>Neutral tones have no native recording. Listen for them in the example words, or on Forvo.</li>
          ) : (
            silent.length > 0 && <li>{silent.length} tones have no native recording.</li>
          )}
          <li>All the native recordings are by one speaker. Voices differ, so listen to other speakers too, for example on Forvo.</li>
        </ul>
      </section>

      <section>
        <h2>Sounds not on the chart</h2>
        <p>A few sounds do not fit the chart’s rows and columns, so they are not on it:</p>
        <ul class="plain">
          {DATA_META.offGrid.map((o) => (
            <li key={o.id}>
              <span class="py">{o.id}</span>
              {o.evidence.length > 0 && (
                <>
                  {' '}
                  (<span class="han">{o.evidence.slice(0, 3).join(' ')}</span>)
                </>
              )}
              {o.id === 'r' && ': the -r ending (erhua)'}
              {o.id === 'ê' && ': would need a column of its own'}
              {o.id === 'yo' && ': would need an “io” column'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Credits</h2>
        <dl class="sources">
          {Object.entries(AUDIO_SOURCES).map(([key, s]) => (
            <div key={key}>
              <dt>Native recordings</dt>
              <dd>
                Spoken by {s.speaker}, from {s.url !== 'UNKNOWN' ? <Ext href={s.url}>{s.name}</Ext> : s.name} by {s.author}. {s.copyright.replace(/^Copyright©\s*/, '© ')}.
                Licence: {s.licenceUrl !== 'UNKNOWN' ? <Ext href={s.licenceUrl}>{s.licence}</Ext> : s.licence}. The recordings in this app have been trimmed and
                their volume evened out; these versions are shared under the same licence.
              </dd>
            </div>
          ))}
          {Object.entries(DATA_META.sources).map(([key, s]) => (
            <div key={key}>
              <dt>{CREDIT_FOR[key] ?? s.name}</dt>
              <dd>
                <Ext href={s.homepage}>{s.name}</Ext>, by {s.author}. Licence: <Ext href={s.licenceUrl}>{s.licence}</Ext>.
                {key === 'cedict' && ' The example data in this app is adapted from it and shared under the same licence.'}
                {key === 'subtlexChr' && ' Cai, Q. & Brysbaert, M. (2010), PLoS ONE 5(6): e10729.'}
              </dd>
            </div>
          ))}
          <div>
            <dt>Hear it on Forvo</dt>
            <dd>
              The “Hear it on Forvo” links open <Ext href="https://forvo.com/languages/zh/">forvo.com</Ext>, a separate website with recordings from its own
              community.
            </dd>
          </div>
          <div>
            <dt>Typefaces</dt>
            <dd>
              {FONTS.map((f, i) => (
                <>
                  {i > 0 && (i === FONTS.length - 1 ? ' and ' : ', ')}
                  <Ext href={f.href}>{f.name}</Ext> by {f.by}
                </>
              ))}
              , all under the SIL Open Font License 1.1. The copies in this app contain only the characters it uses and are renamed, as the licence requires.
            </dd>
          </div>
          <div>
            <dt>Icons</dt>
            <dd>
              <Ext href="https://lucide.dev">Lucide</Ext>, ISC licence.
            </dd>
          </div>
        </dl>
      </section>
    </article>
  );
}
