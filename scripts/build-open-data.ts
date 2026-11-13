/**
 * Assembles open-data/: the material that must be shared under Creative Commons
 * Attribution-ShareAlike, because it is adapted from CC BY-SA sources.
 *
 *   open-data/data/*.json        the generated data containing CC-CEDICT-derived text and readings
 *   open-data/audio-manifest.json source, speaker, licence and changes for every recording
 *   open-data/audio/*.mp3        the adapted recordings (only with --audio; not committed, see README)
 *   open-data/LICENSE            licence references and attribution lines
 *   open-data/README.md          sources, authors and the changes made
 *
 * Run: npm run data:open            (data, manifest, LICENSE, README)
 *      npm run data:open -- --audio (also copies the 1,302 clips from public/audio/)
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/sources';
import { CREDITS, LICENCES_CHECKED_ON, attributionText } from '../src/data/credits';

const OUT = join(ROOT, 'open-data');
const GEN = join(ROOT, 'src', 'data', 'generated');
export const OPEN_DATA_FILES = ['cells.json', 'syllables.json', 'char-index.json', 'data-meta.json'];

mkdirSync(join(OUT, 'data'), { recursive: true });
for (const f of OPEN_DATA_FILES) copyFileSync(join(GEN, f), join(OUT, 'data', f));
copyFileSync(join(ROOT, 'audio-manifest.json'), join(OUT, 'audio-manifest.json'));

if (process.argv.includes('--audio')) {
  rmSync(join(OUT, 'audio'), { recursive: true, force: true });
  mkdirSync(join(OUT, 'audio'));
  const clips = readdirSync(join(ROOT, 'public', 'audio')).filter((f) => f.endsWith('.mp3'));
  for (const f of clips) copyFileSync(join(ROOT, 'public', 'audio', f), join(OUT, 'audio', f));
  console.log(`Copied ${clips.length} recordings to open-data/audio/`);
}

const audio = CREDITS.find((c) => c.id === 'audio')!;
const cedict = CREDITS.find((c) => c.id === 'cedict')!;

writeFileSync(
  join(OUT, 'LICENSE'),
  [
    'Pinyin Chart open data',
    '',
    'This folder contains material adapted from works licensed under Creative Commons',
    'Attribution-ShareAlike. The adaptations are shared under the same licences:',
    '',
    `- data/ (meanings, example words, readings and syllable lists adapted from ${cedict.name}):`,
    `  ${cedict.licence}, ${cedict.licenceUrl}`,
    `- audio/ and audio-manifest.json (recordings adapted from ${audio.name}):`,
    `  ${audio.licence}, ${audio.licenceUrl}`,
    `  ${audio.notes?.[1] ?? ''}`,
    '',
    'The data also uses readings and counts from the Unicode Han Database (Unicode License v3)',
    'and HSK levels from complete-hsk-vocabulary and its sources (MIT); their licence notices',
    'are reproduced at the end of this file.',
    '',
    'Attribution',
    '',
    ...attributionText(['cedict', 'audio', 'unihan', 'hsk', 'hsk-vocabulary', 'hanyu-shuiping-kaoshi', 'hsk30']),
    '',
    `Licences as checked on ${LICENCES_CHECKED_ON}.`,
    '',
    // The Unicode and MIT licences ask for their notice to accompany copies of the data.
    ...CREDITS.filter((c) => ['unihan', 'hsk', 'hsk-vocabulary', 'hanyu-shuiping-kaoshi', 'hsk30'].includes(c.id) && c.licenceText).flatMap((c) => [
      '----------------------------------------------------------------------',
      `${c.name}`,
      '',
      readFileSync(join(ROOT, c.licenceText!), 'utf8').trim(),
      '',
    ]),
  ].join('\n'),
);

writeFileSync(
  join(OUT, 'README.md'),
  [
    '# Pinyin Chart open data',
    '',
    'The data and recordings behind Pinyin Chart that are shared under Creative Commons Attribution-ShareAlike. See `LICENSE`.',
    '',
    '## Contents',
    '',
    '- `data/cells.json`: for each syllable and tone, an example character, a short meaning and up to three example words (adapted from CC-CEDICT).',
    '- `data/syllables.json`: every syllable on the chart with its tones and the dictionaries that list it (CC-CEDICT and the Unicode Han Database).',
    '- `data/char-index.json`: characters and their readings, for search (CC-CEDICT, Unicode Han Database, HSK levels).',
    '- `data/data-meta.json`: counts, sources and the thresholds used to choose the examples.',
    '- `audio-manifest.json`: for every recording, the original file, speaker, authors, licence, source URL and the changes made.',
    '- `audio/`: the 1,302 adapted recordings, named `{syllable}{tone}.mp3` (ü written v). They are not committed here, to avoid a second copy of the',
    '  app’s `public/audio/`; run `npm run data:open -- --audio` in the app repository to copy them in before publishing this folder.',
    '',
    '## Sources and changes',
    '',
    ...attributionText(['cedict', 'audio', 'unihan', 'hsk', 'hsk-vocabulary', 'hanyu-shuiping-kaoshi', 'hsk30']).map((l) => (l.startsWith('  ') ? `  ${l.trim()}` : `- ${l}`)),
    '',
    'Changes to the CC-CEDICT text: meanings were shortened, a few senses reordered, example characters and words selected for each syllable and tone, and pinyin converted to tone marks.',
    '',
  ].join('\n'),
);
console.log('open-data/ written');
