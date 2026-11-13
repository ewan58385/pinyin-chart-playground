# Pinyin Chart open data

The data and recordings behind Pinyin Chart that are shared under Creative Commons Attribution-ShareAlike. See `LICENSE`.

## Contents

- `data/cells.json`: for each syllable and tone, an example character, a short meaning and up to three example words (adapted from CC-CEDICT).
- `data/syllables.json`: every syllable on the chart with its tones and the dictionaries that list it (CC-CEDICT and the Unicode Han Database).
- `data/char-index.json`: characters and their readings, for search (CC-CEDICT, Unicode Han Database, HSK levels).
- `data/data-meta.json`: counts, sources and the thresholds used to choose the examples.
- `audio-manifest.json`: for every recording, the original file, speaker, authors, licence, source URL and the changes made.
- `audio/`: the 1,302 adapted recordings, named `{syllable}{tone}.mp3` (ü written v). They are not committed here, to avoid a second copy of the
  app’s `public/audio/`; run `npm run data:open -- --audio` in the app repository to copy them in before publishing this folder.

## Sources and changes

- audio-cmn, syllables set (syllabs v.2): the native recording of every syllable and tone.
  By Chen Wang 王琛 (speaker); Hugo Lopez, PLIDAM, INALCO (project management, repository, audio compression, file renaming); Nicolas Vion (recording software). Licence: CC-BY-SA-3.0 (https://creativecommons.org/licenses/by-sa/3.0/). https://github.com/hugolpz/audio-cmn
  © 2013 Wang Chen, Lopez Hugo, Vion Nicolas.
  The repository README states the licence as "CC-by-sa" with no version, and the repository has no LICENSE file. Each recording's own metadata (SWAC_COLL_LICENSE) states "CC-BY-SA-3.0".
  Changes made for this app: Trimmed to the syllable, high-pass filtered (70 Hz), levelled to a common loudness, faded in and out, and converted to mono 24 kHz MP3 at 48 kbit/s. These adapted recordings are shared under the same licence.
  Only the syllable recordings are used; the project’s separate set of HSK word recordings is not.
- CC-CEDICT (release of 2026-11-11): example characters, meanings, example words and readings.
  By MDBG and CC-CEDICT contributors; based on CEDICT © 1997, 1998 Paul Andrew Denisowski. Licence: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). https://www.mdbg.net/chinese/dictionary?page=cc-cedict
  Changes made for this app: meanings shortened, a few senses reordered, and example words selected. The example data in this app is adapted from CC-CEDICT and shared under the same licence.
- Unicode Han Database (Unihan) (Unicode 18.0.0): readings of characters, how often each reading is used, and the list of standard characters.
  By Unicode, Inc. Licence: Unicode License v3 (https://www.unicode.org/license.txt). https://www.unicode.org/reports/tr38/
- complete-hsk-vocabulary (main branch, retrieved 2026-11-13): the HSK level of each word (the level only).
  By Yanis Zafirópulos (drkameleon). Licence: MIT (https://github.com/drkameleon/complete-hsk-vocabulary/blob/main/LICENSE). https://github.com/drkameleon/complete-hsk-vocabulary
- hsk-vocabulary: levels of the earlier HSK (via complete-hsk-vocabulary).
  By Clement Venard. Licence: MIT. https://github.com/clem109/hsk-vocabulary
- hanyu-shuiping-kaoshi: levels of the earlier HSK (via hsk-vocabulary).
  By gigacool. Licence: MIT. https://github.com/gigacool/hanyu-shuiping-kaoshi
- hsk30: levels of HSK 3.0 (via complete-hsk-vocabulary), taken from the official HSK 3.0 standard.
  By Pleco Inc. Licence: MIT. https://github.com/elkmovie/hsk30

Changes to the CC-CEDICT text: meanings were shortened, a few senses reordered, example characters and words selected for each syllable and tone, and pinyin converted to tone marks.
