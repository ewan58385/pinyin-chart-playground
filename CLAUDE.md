# CLAUDE.md — project state file (read first, update after every step)

Offline-first PWA: interactive Mandarin pinyin chart (Vite + TypeScript + Preact + @preact/signals, vite-plugin-pwa, IndexedDB via `idb`, zips via `fflate`). Static site, no backend. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on push to `main`.

## Round 3 checklist (branch `round-3`, local commits only, nothing pushed)

| Section | Status | Notes |
|---|---|---|
| 1 Remove generated voices, restore the sound pack | done | pack restored from the first commit; rerun of `data:audio` reproduces it byte for byte; DB v6 / export v6 |
| 2 "Hear it on Forvo" link | done | `src/lib/forvo.ts`; `/word/<char>/`, else `/search/<pinyin>/zh/`; link only |
| 3 Tone characters spilling out of syllable cards | done | shared `SyllableCard` (one box per tone); chart cells sized for five slots |
| 4 Clickable group and initial headers | done | underlined links with chevrons, corner links, hint line |
| 5 Finals / Initials overview pages, breadcrumbs | done | `OverviewPages.tsx`; `crumbsFor` in routes.ts (tested) |
| 6 Mobile navigation | done | bottom `TabBar` below 860px; sheet and toasts sit above it |
| 7 Browse by category | done | `src/data/categories.ts`, `BrowsePage.tsx` |
| 8 Learning path | done | `src/data/learn.ts` (9 stages), `LearnPage.tsx`; progress from statuses, nothing stored |
| 9 Practice as a first-class section | done | `src/practice/Session.tsx` guided session by scope (`src/lib/scope.ts`), hub with quiz and pairs |

## NEXT (what to do on resume)

Round 3 is complete on branch `round-3` (not merged, not pushed). Open questions for the user: restore the lesson links and times that Round 2 removed (the Round 3 brief refers to them; stages currently rest on the data's own labels only); merge `round-3` into `main` and push; delete the local `.env` and the cloud speech resource if no longer wanted.

## Round 4 (minor changes, 2026-11-12)

Chart hint bar removed; arrow-key notes removed (keys still work); `StudyCard` (Learn stage pages, Practice sessions) separate from the chart's `SyllableCard`, sharing `cardData.ts`; Learn = the path (no drills, links to Practice), Practice = drills (no stage text, links to Learn); `ToneView` takes `parts`; overview groups get a 11px `role=progressbar` bar; "Whole chart" is a title in the block nav. No routes changed. Video timestamps (asked for on Learn) do not exist since Round 2 step 7.

## Key decisions

- Audio is the davinfifield pack only (Unlicense), tones 1–4; neutral tones have no native audio and the UI says so. `src/lib/audio.ts` caches in `native-audio-v1` and deletes any other non-Workbox Cache Storage bucket at startup.
- The lesson links and their times were removed in Round 2 step 7 at the user's request and stay removed, although the Round 3 brief mentions them (flag in the summary).
- Learning path: stage membership is a partition of the standard syllables by the data's labels (final type, initial difficulty, tags), tones 1–4; a review stage and a neutral-tone stage follow. No lesson-order data exists, so the order rests on those labels; the order of the three "problem" groups (j q x, zh ch sh r, z c) follows the Round 3 brief's example.
- Mobile tabs are Chart, Finals, Initials, Learn, Practice; Browse and My data move to the More menu on phones.
- Stored settings are read through `settingsFrom` (store.ts): unknown names and wrong types are ignored.
- Schema history: DB v3 folded syllable notes into tone notes (+ `legacyNotes`), v4 dropped the lesson-times store, v5 added `practiceHistory`, v6 dropped the per-cell audio preference store. Export format is at version 6; older files import, unknown fields are dropped.
- Appearance: tokens are set on `<html>` by `src/lib/theme.ts` from `src/data/themes.ts`; `tests/contrast.test.ts` enforces WCAG AA. Exception to the no-localStorage rule: `pinyin-chart-appearance` caches the resolved appearance for the first paint; IndexedDB stays the source of truth.
- Pitch: `src/lib/pitch.ts` (YIN, noise-floor-relative gate, octave correction) for both traces; `scripts/diagnose-pitch.ts` writes `reports/pitch-diagnosis.md`.

## Commands

```sh
npm run dev / npm test / npm run typecheck / npm run build / npm run preview
npx vitest run tests/pitch.test.ts        # one file;  npx vitest run -t "toneMark"  # by name
BASE_PATH=/pinyin-chart/ npm run build    # sub-path build, as GitHub Pages uses
npm run data:sources | data:build | data:audio | data:fonts | data:icons   # data pipeline (outputs committed)
npx tsx scripts/diagnose-pitch.ts         # pitch diagnosis report
```

Data pipeline order: `data:build` → `data:fonts` (CJK fonts are subset to `font-chars.json`) and `data:audio` (reads `syllables.json`, needs ffmpeg). No linter. Browser testing: no Chromium here; Firefox headless (`/usr/sbin/firefox`) via puppeteer-core with `media.navigator.streams.fake`. Not tested on real iOS/Android.

## Architecture (condensed)

- **Bundled vs user data are strictly separate.** Bundled read-only content (chart data, examples, audio index) is imported via `src/data/index.ts`. Everything the user creates lives only in IndexedDB (`src/lib/db.ts`, DB `pinyin-chart-user`) and is laid over bundled data at read time (`resolveExample` in `src/lib/store.ts`). Recordings are stored as ArrayBuffer + MIME type (Safari).
- **Grid:** 22 initials (`src/data/initials.ts`, null initial first) × 36 finals (`src/data/finals.ts`, groups A/E/O/I/U/Ü). `parseSyllable` in `src/lib/pinyin.ts` maps spellings to squares; off-grid syllables are excluded. Tone cell ids are numeric (`ma1`, `lü4`, `de5`); filenames write ü as `v`.
- **Data is evidence-based.** `scripts/build-data.ts` derives syllables from CC-CEDICT + Unihan; `verified` when ≥2 sources agree. Hand overrides only in `scripts/curation.ts`. Never invent linguistic facts; mark uncertainty `verified: false`.
- **Audio** (`src/lib/audio.ts`): clips are not in the Workbox precache; the app caches them itself, lazily per syllable or via "Download all". One shared `<audio>` element fed blob URLs, unlocked in the tap handler (iOS). `src/lib/recorder.ts` asks for raw audio, prefers audio/mp4 then webm, caps at 10 s.
- **Routing:** pure grammar in `src/lib/routes.ts` (tested), signal in `src/lib/router.ts`. `#/finals`, `#/initials` (overviews), `#/finals/e`, `#/initials/retroflex`, `#/browse/<category>`, `#/learn/<stage>` carry the open syllable on the hash; `#/practice/<scope>/<syllable>/<tone>` carries the session step. Detail view is a side panel on wide screens, a bottom sheet below 860px.
- **Export/import** (`src/lib/transfer.ts`): one zip = `data.json` + `recordings/<id>.<ext>`; merge by newest `updatedAt`.
- **Design:** reference-book look, warm off-white/near-black, one vermilion accent, hairline borders, 2–4px radii, no gradients/glassmorphism/emoji. Icons only from Lucide via `src/components/icons.ts`. Touch targets ≥44px; 16px inputs on narrow screens. Self-hosted subset fonts.
