import { AUDIO_CLIPS_BY_TONE, AUDIO_SOURCES, AUDIO_TOTAL_BYTES, CELLS, DATA_META, SYLLABLES, hasNativeAudio } from '../data';
import { TONES } from '../lib/pinyin';
import { totalClipCount } from '../lib/audio';

const Ext = ({ href, children }: { href: string; children: preact.ComponentChildren }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

export function AboutPage() {
  const c = DATA_META.counts;
  const visibleCells = c.toneCellsStandard + c.toneCellsNeutralInWord;
  const silent = SYLLABLES.flatMap((s) => s.tones).filter((t) => t.status !== 'single-source' && !hasNativeAudio(t.numeric));
  const noAudio = silent.length;
  // Worded from the actual coverage, tone by tone.
  const silentByTone = TONES.map((tone) => ({ tone, n: silent.filter((t) => t.tone === tone).length })).filter((x) => x.n > 0);
  const toneWord = (tone: number) => (tone === 5 ? 'neutral tone' : `tone ${tone}`);
  const unverifiedChars = Object.values(CELLS).filter((x) => !x.verified).length;
  return (
    <article class="page">
      <h1>About this chart</h1>
      <p class="lede">
        A personal study tool for Mandarin pinyin: every syllable and tone with native audio, an example character, and your own notes and recordings.
      </p>

      <section>
        <h2>What is in it</h2>
        <div class="stat-grid">
          <div class="stat">
            <b>{c.syllablesStandard}</b>
            <span>syllables</span>
          </div>
          <div class="stat">
            <b>{visibleCells}</b>
            <span>syllable-and-tone cells</span>
          </div>
          <div class="stat">
            <b>{c.cellsWithCharacter}</b>
            <span>with an example character</span>
          </div>
          <div class="stat">
            <b>{totalClipCount}</b>
            <span>native clips, {(AUDIO_TOTAL_BYTES / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
        <p style="margin-top:12px">
          The syllable list is not made by combining initials with finals. A syllable or tone is on the chart because dictionaries attest it, and it counts
          as verified when at least two independent sources agree. Data built {DATA_META.generatedAt}.
        </p>
      </section>

      <section>
        <h2>Finding your way</h2>
        <ul class="plain">
          <li>
            <a href="#/">Chart</a>: every syllable. Group names and initials in its headers open their own pages.
          </li>
          <li>
            <a href="#/finals">Finals</a> and <a href="#/initials">Initials</a>: overviews of the 36 finals in six groups and of the 21 initials and the null initial, each leading
            to a page per group.
          </li>
          <li>
            <a href="#/browse">Browse</a>: the same syllables by category (type of final, spelling tags, difficulty and articulation of the initial), derived from the
            labels in the data.
          </li>
          <li>
            <a href="#/learn">Learn</a>: nine stages from the sounds the data labels simplest to the hardest, what each covers and why, a picture of where its
            syllables sit on the chart, and its syllables to listen to and mark. The order follows those labels (simple, compound and nasal finals; easy, tougher and problem initials); progress is read from
            the new / shaky / solid marks you set, and nothing is locked.
          </li>
          <li>
            <a href="#/data">My data</a>: backup and restore. One zip holds everything you have added in this browser; restoring it on another device
            merges it in.
          </li>
        </ul>
      </section>

      <section>
        <h2>What is not certain</h2>
        <ul class="plain">
          <li>
            <b>{c.toneCellsSingleSource} tone cells</b> (including {c.syllablesSingleSource} whole syllables:{' '}
            <span class="py">
              {SYLLABLES.filter((s) => s.status === 'single-source')
                .map((s) => s.id)
                .join(', ')}
            </span>
            ) are attested by one source only. They are hidden unless you turn on “Unverified cells” in the display options.
          </li>
          <li>
            <b>{c.toneCellsNeutralInWord} neutral-tone cells</b> rest on CC-CEDICT word entries alone, and <b>{unverifiedChars} example characters</b> have a
            reading that only CC-CEDICT gives. Both are shown, and flagged where they appear.
          </li>
          {noAudio > 0 && (
            <li>
              <b>
                {noAudio} {noAudio === 1 ? 'cell has' : 'cells have'} no native audio
              </b>
              {silentByTone.length === 1
                ? `, all of them ${silentByTone[0].tone === 5 ? 'neutral tones' : toneWord(silentByTone[0].tone)}.`
                : ` (${silentByTone.map((x) => `${x.n} ${toneWord(x.tone)}`).join(', ')}).`}
              {AUDIO_CLIPS_BY_TONE[5] === 0 &&
                ' The audio set has no usable neutral-tone recordings: its few neutral-tone files did not pass the checks every clip goes through, so they are not used.'}{' '}
              The cells without a clip say so where they appear.
            </li>
          )}
          <li>Glosses are shortened automatically from CC-CEDICT and can be clumsy. Any character, gloss or example word can be edited.</li>
          <li>
            Pinyin for example words is in dictionary form: tone changes in running speech (不 before a fourth tone, 一, two third tones together) are not
            applied.
          </li>
        </ul>
      </section>

      <section>
        <h2>Syllables with no square</h2>
        <p>These are attested but cannot be written as one of the 22 rows by 36 columns, so they are not on the chart:</p>
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
              {o.id === 'r' && ': the erhua suffix'}
              {o.id === 'ê' && ': would need a column of its own'}
              {o.id === 'yo' && ': would need an “io” column'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Sources and licences</h2>
        <dl class="sources">
          {Object.entries(AUDIO_SOURCES).map(([key, s]) => (
            <div key={key}>
              <dt>Native audio: {s.url !== 'UNKNOWN' ? <Ext href={s.url}>{s.name}</Ext> : s.name}</dt>
              <dd>
                Spoken by {s.speaker}. Authors: {s.author}. {s.copyright}. Licence:{' '}
                {s.licenceUrl !== 'UNKNOWN' ? <Ext href={s.licenceUrl}>{s.licence}</Ext> : s.licence}.
                {s.url === 'UNKNOWN' && ' Web address: UNKNOWN (the files and their README do not give one).'} The clips were trimmed, levelled and
                re-encoded for this app; those adapted clips are shared under the same licence. Every clip, with its original file name, is listed in
                audio-manifest.json in the source repository.
              </dd>
            </div>
          ))}
          {Object.entries(DATA_META.sources).map(([key, s]) => (
            <div key={key}>
              <dt>
                <Ext href={s.homepage}>{s.name}</Ext>
              </dt>
              <dd>
                {s.author}. Licence: <Ext href={s.licenceUrl}>{s.licence}</Ext>.{' '}
                {key === 'cedict' && 'Readings, glosses and example words. The example data in this app is a derivative and is shared under the same licence.'}
                {key === 'unihan' && 'Second source for readings (kXHC1983, kTGHZ2013, kHanyuPinlu, kMandarin).'}
                {key === 'subtlexChr' && 'Character frequency ranks. Cai, Q. & Brysbaert, M. (2010), PLoS ONE 5(6): e10729.'}
                {key === 'subtlexWf' && 'Word frequencies, used to choose example characters and words.'}
                {key === 'hsk' && 'Which words and single characters are taught, and at what level.'}
              </dd>
            </div>
          ))}
          <div>
            <dt>
              <Ext href="https://forvo.com/languages/zh/">Forvo</Ext>
            </dt>
            <dd>
              The “Hear it on Forvo” links open forvo.com, an external site that is not part of this app. Nothing is fetched, stored or cached from it.
            </dd>
          </div>
          <div>
            <dt>Typefaces</dt>
            <dd>
              <Ext href="https://github.com/adobe-fonts/source-serif">Source Serif 4</Ext>, <Ext href="https://github.com/adobe-fonts/source-sans">Source Sans 3</Ext>{' '}
              and <Ext href="https://github.com/adobe-fonts/source-han-serif">Source Han Serif</Ext>, by Adobe, under the SIL Open Font License 1.1. They are
              subsetted to the characters this app uses and renamed, as the licence requires for modified versions.
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
