# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

It is also the project state file: read it first, and update **State** and **Key decisions** after every step of a piece of work.

Offline-first PWA: interactive Mandarin pinyin chart (Vite + TypeScript + Preact + @preact/signals, vite-plugin-pwa, IndexedDB via `idb`, zips via `fflate`). Static site, no backend. `.github/workflows/deploy.yml` runs `npm test`, then builds with `BASE_PATH=/<repo>/` and deploys to GitHub Pages on every push to `main`, so pushing to `main` publishes. README.md is the user-facing feature reference; keep it in step when behaviour changes.

## State

As of 2026-11-13: `main` = `origin/main` at a366e0c (Round 7). Round 8 (blank deployed site) is done in the working tree, **uncommitted**: startup error boundary, static "starting" notice in index.html, hardened settings parsing and data loading, a post-deploy check in the workflow. Browser checks: `.cache/screenshots/round8/`.

**Deployment problem (needs the user):** GitHub Pages' Source is "Deploy from a branch", so every push also runs GitHub's own "pages build and deployment", which publishes the unbuilt repo (index.html → /src/main.tsx, 404 → blank). It races the Actions deploy; at a366e0c it finished 2 s later and won. Fix: Settings → Pages → Source: GitHub Actions, then re-run "Deploy to GitHub Pages". The workflow's `verify` job now fails if the live page is not the build. The user's screenshots (`*.png` in the root) are untracked.

Open questions for the user:
- The audio set's web address is UNKNOWN (not in the folder or its tags); fill `url` in `scripts/build-audio.ts` if it is known, then rerun `npm run data:audio`.
- Restore the lesson links and their times that Round 2 removed? Round 3–5 briefs refer to them ("video times", `src/data/video.ts`); none exist.
- Delete the local `.env` (gitignored) and the cloud speech resource from the removed generated-voices work, if no longer wanted.
- `toolbar-thin-desktop.png` (the user's screenshot) sits untracked in the project root.

## Commands

```sh
npm run dev | npm test | npm run typecheck | npm run preview
npm run build                             # tsc --noEmit, then vite build
BASE_PATH=/pinyin-chart/ npm run build    # sub-path build, as GitHub Pages uses
npx vitest run tests/pitch.test.ts        # one file;  npx vitest run -t "toneMark"  # by name
npm run data:sources | data:build | data:audio | data:fonts | data:icons | data:all   # data pipeline (outputs committed)
npm run data:audio -- --source <folder>   # audio from another local folder (default .cache/sources/audio-cmn/syllabs)
npx tsx scripts/diagnose-pitch.ts         # writes reports/pitch-diagnosis.md
```

- No linter; `tsc` is strict with `noUnusedLocals`/`noUnusedParameters` and covers `src`, `tests`, `scripts`.
- Vitest runs `tests/**/*.test.ts` in a node environment; DB tests use `fake-indexeddb`.
- Data pipeline order: `data:sources` (downloads into `.cache/`) → `data:build` → `data:audio` (reads `syllables.json` and the local recordings folder, downloads nothing; needs ffmpeg + ffprobe) → `data:fonts` (Han fonts subset to `font-chars.json` plus the Han characters of the audio attribution; python3 + fonttools + brotli). `data:icons` needs Pillow. Each run rewrites `reports/*.md`. `data:fonts` rewrites every woff2 with new bytes even when the glyph set is unchanged; restore unchanged ones with git to avoid churn.
- Browser testing: no Chromium here; Firefox headless (`/usr/sbin/firefox`) via puppeteer-core with `media.navigator.streams.fake`. Not tested on real iOS/Android.

## Architecture

- **Bundled vs user data are strictly separate.** Bundled read-only content (chart data, examples, audio index; generated JSON in `src/data/generated/`) is imported via `src/data/index.ts`. Everything the user creates lives only in IndexedDB (`src/lib/db.ts`, DB `pinyin-chart-user`) and is laid over bundled data at read time (`resolveExample` in `src/lib/store.ts`). Recordings are stored as ArrayBuffer + MIME type (Safari).
- **Grid:** 22 initials (`src/data/initials.ts`, null initial first) × 36 finals (`src/data/finals.ts`, groups A/E/O/I/U/Ü). `parseSyllable` in `src/lib/pinyin.ts` maps spellings to squares; off-grid syllables are excluded. Tone cell ids are numeric (`ma1`, `lü4`, `de5`); filenames write ü as `v`.
- **Data is evidence-based.** `scripts/build-data.ts` derives syllables from CC-CEDICT + Unihan; `verified` when ≥2 sources agree. Hand overrides only in `scripts/curation.ts` (reject or reorder only). Never invent linguistic facts; mark uncertainty `verified: false`.
- **Audio** (`src/lib/audio.ts`): clips (`public/audio/`) are excluded from the Workbox precache (`vite.config.ts`); the app caches them itself in `native-audio-v2`, lazily per syllable or via "Download all", and deletes any other non-Workbox Cache Storage bucket at startup (bump the name whenever the recordings are replaced). Clips are fetched with `cache: 'no-cache'`. Copy about missing audio is worded from `AUDIO_CLIPS_BY_TONE` (`src/data/index.ts`), never assumed. One shared `<audio>` element fed blob URLs, unlocked in the tap handler (iOS). `src/lib/recorder.ts` asks for raw audio (no echo cancellation/noise suppression/AGC), prefers audio/mp4 then webm, caps at 10 s.
- **Pitch:** `src/lib/pitch.ts` (YIN, noise-floor-relative gate, octave correction) for both the native and the user trace; `src/lib/overlay.ts` fits the axis.
- **Routing:** pure grammar in `src/lib/routes.ts` (tested, incl. `crumbsFor` breadcrumbs), signal in `src/lib/router.ts`. `#/finals`, `#/initials` (overviews), `#/finals/e`, `#/initials/retroflex`, `#/browse/<category>`, `#/learn/<stage>` carry the open syllable on the hash; Old `#/practice/…` links (a removed section) redirect to Learn: `stage/<id>` to that stage, anything else to `#/learn`, and the address is rewritten (`isRedirect`). Detail view is a side panel on wide screens, a bottom sheet below 860px, where a bottom `TabBar` replaces the side nav.
- **Learn** (`src/data/learn.ts`, 9 stages, `LearnPage.tsx`): each stage page has a fact list (covers, initials and finals read from its syllables, tones, why here) and a chart picture (`StageMap.tsx`, layout in `src/lib/stageMap.ts`, tested): all 36 columns, whole initial blocks without stage syllables folded into bands, `role="img"`, not focusable. Progress is derived from tone statuses; nothing extra is stored. `src/lib/scope.ts` gives the cells of a stage / group / category for summaries and progress bars.
- **Cards:** the chart's `SyllableCard` (one box per tone) and the Learn stage pages' `StudyCard` are separate components sharing `src/components/cardData.ts`.
- **Finals / Initials panel** (`BlockNav` in `BlockPage.tsx`): 156px wide with a centred "Chart" title; on wide screens it folds to a 56px rail (`blockNavCollapsed` setting); one toggle element in both states so focus is kept. On phones it is a strip and does not fold.
- **Reset app** (`resetAllData` in store.ts, `clearAll` in db.ts; last section of My data, two-step alertdialog): empties every store including the retired one, deletes the native audio cache (`clearAudioCache`, which also stops a download and resets its progress), drops the appearance cache, resets filters, reloads state. The Workbox precache is untouched. Tested with fake-indexeddb and with the memory fallback (`tests/reset-memory.test.ts`).
- **Backup and restore** (`src/lib/transfer.ts`, near the foot of My data): one zip = `data.json` + `recordings/<id>.<ext>`; merge by newest `updatedAt`; tested end to end against fake-indexeddb in `tests/db.test.ts`.
- **Appearance:** tokens are set on `<html>` by `src/lib/theme.ts` from `src/data/themes.ts`; `tests/contrast.test.ts` enforces WCAG AA. The accent is fixed vermilion (`ACCENT` in themes.ts); presets change only the paper and ink.
- **Text size = CSS zoom on `.app`.** Inside it every length is multiplied by the zoom, so never write `dvh`, `vw` or `env(safe-area-inset-*)` in CSS: use `calc(N * var(--vh))`, `var(--vw)`, `var(--safe-top|right|bottom|left)` from base.css, which divide by `--text-scale`. That keeps the frame at the viewport and the tab bar flush at every size.
- **Startup must never be blank:** index.html ships a plain "starting…" notice in `#app` (Reload offered after 8 s if the app has not mounted); main.tsx clears it and renders inside `ErrorBoundary` (`StartupError.tsx`); `loadUserData` reads each store defensively and `settingsFrom` accepts anything (unknown names, inherited names like `toString`, wrong types, values outside a fixed choice are dropped). Tested in `tests/settings.test.ts`.
- Browser testing: a Chrome headless shell can be fetched with `npx @puppeteer/browsers install chrome-headless-shell@stable` (the system `chromium-browser` is only a snap stub). Start preview servers with `node node_modules/vite/bin/vite.js preview` and kill that process: killing an `npx` wrapper leaves vite running.
- **Restore** defaults to replace (checkbox ticked on every visit, confirm step names what is deleted); unticked it merges. No share-sheet path: `deliverFile` is a plain download.
- **Segmented controls** (`.seg` in base.css): equal-width grid columns, a hairline before every option, the selected option inset. In Settings they span the row, labels wrap, and they stack below a 250px container width.
- **Card key:** `CardLegend` in `SyllableCard.tsx` is the one legend for syllable cards (group and Browse pages); its sample boxes reuse the `.tone-btn` classes.
- **Design:** reference-book look, warm off-white/near-black, one vermilion accent, hairline borders, 2–4px radii, no gradients/glassmorphism/emoji. Icons only from Lucide via `src/components/icons.ts`. Touch targets ≥44px; 16px inputs on narrow screens. Self-hosted subset fonts.

## Key decisions

- Audio is the Audio-cmn syllables set only (speaker Chen Wang 王琛, CC BY-SA 3.0, authors Wang Chen, Lopez Hugo, Vion Nicolas; web address UNKNOWN), 1,302 clips covering every visible cell of the four full tones. Raw files live in `.cache/sources/audio-cmn/syllabs/` (gitignored). Its 19 neutral-tone files fail the checks as a set (long, several syllables, an octave low), so no neutral cell has audio and the UI says so. `cmn-jv4.mp3` maps to ju4 (ü is spelled u after j q x y). Attribution per clip in `audio-manifest.json`; checks and exclusions in `reports/audio-coverage.md`.
- The lesson links and their times were removed in Round 2 at the user's request and stay removed unless the user says otherwise.
- Practice (sessions, quiz, minimal pairs) was removed in Round 5. Its IndexedDB store `practiceHistory` stays declared (`RETIRED_STORES` in db.ts) so existing rows are not deleted; nothing reads, writes, clears or exports it. Old exports carrying it still import (the field is dropped); export version stays 6.
- Learning path: stage membership partitions the standard syllables by the data's labels (final type, initial difficulty, tags), tones 1–4, then a review stage and a neutral-tone stage. No lesson-order data exists; the order of the three "problem" groups (j q x, zh ch sh r, z c) follows the Round 3 brief.
- Mobile tabs are Chart, Finals, Initials, Learn, My data (for backup); Browse moves to the More menu on phones. Desktop nav shows My data with a "backup" sub-label.
- Forvo (`src/lib/forvo.ts`) is an outbound link only: `/word/<char>/`, else `/search/<pinyin>/zh/`; nothing fetched or stored.
- Stored settings are read through `settingsFrom` (`store.ts`): unknown names and wrong types are ignored.
- `DB_VERSION` (`db.ts`) and `EXPORT_VERSION` (`transfer.ts`) are both 6; upgrades and the export format are covered by `tests/db.test.ts` and `tests/transfer.test.ts`. History: DB v3 folded syllable notes into tone notes (+ `legacyNotes`), v4 dropped the lesson-times store, v5 added `practiceHistory`, v6 dropped the per-cell audio preference store. Older export files import; unknown fields are dropped.
- User-facing text is written for learners: no build or data-source wording (attested, verified, sources, generated, cells, clips), no explanation of missing audio (just "No recording"), UK spelling, sentence case. The user's own audio is a "recording" everywhere (new ones are named "Recording N"; the native audio is "native recording"). Single-source syllables show as "Rare". Developer docs (README, reports, scripts) may stay technical.
- Settings rows whose names the app no longer knows (an old `accent` / `customAccent`, `showPractice`) are ignored by `settingsFrom` and deleted at load.
- Only exception to the no-localStorage rule: `pinyin-chart-appearance` caches the resolved appearance for the first paint; IndexedDB stays the source of truth.
