# BUILD REPORT — Neon Coast Cover Studio (gta6-cover-art-01)

## Concept

A poster-style cover maker, not a photo filter: the app turns 1–4 of the
user's own photos plus a caption into a multi-panel poster cover in the
sunset/neon genre — white-framed panels, a gradient sky with a low sun, palm
silhouettes where sky shows, halftone dots, film grain, a vignette, a big
condensed gradient title with an ink outline, a neon subtitle, and a star
badge — then exports a PNG in the post size the user picks. Everything is
drawn in code on a 2D canvas; nothing is borrowed. No Rockstar logo,
wordmark, artwork, character or font anywhere; lettering uses bold system
sans fonts condensed in code, and no font file is shipped.

## Files

- `main.ts` — hand-in program (Node 22, stdlib only): copies `app/` and
  `screenshots/` to `$MAKEFUN_OUTPUT_DIR`, writes `dossier.json` with the
  kit's `vendor/makefun-app.ts` (byte-for-byte kit copy, unchanged).
- `serve.ts` — local static server for testing (`node serve.ts`, port 8080).
- `app/index.html` + `app/style.css` — dark studio editor shell.
- `app/src/cover.js` — the cover engine: `SIZES`, `LAYOUTS` (6), `GRADES`
  (5), `layoutPanels`, `drawPhotoInPanel` (cover-fit + zoom/pan, clamped),
  `drawPalm`, `drawTitle`, `renderCover`, `exportCoverCanvas`.
- `app/src/main.js` — the editor: 4 photo slots (upload or sample), layout
  and grade pickers, title/subtitle inputs, per-panel photo/zoom controls,
  click-to-select + drag-to-pan + wheel-to-zoom on the preview, "fill all
  panels" and "reset crop", 3 export buttons, `?shot=` scenes and
  `?selftest=1` via `shots.js`.
- `app/src/shots.js` — `runShot` (editor/cover scenes, `pany`/`panx` shot
  framing) and `runSelfTest` (scripted play-test, reports
  `window.__testResult`).
- `app/samples/boulevard.jpg`, `app/samples/pier.jpg` — kit samples, made
  for make.fun, free to use. Used in every screenshot; no real person.
- `screenshots/` — 4 JPEGs (see below), all real renders or real exports.
- `shots.json` — the four shot scenes. `LICENSE` (MIT), `README.md` with
  the gta6-cover-art-01 badges for `rizko-d/gta6-cover-art`,
  `.makefun/owner.json` with wallet
  `vitaKkZsRToivowgPSba4wCKZ8buCQQzQvxeLXyxoFC`.

## Features (against the brief)

- Any photo: 4 upload slots, per-panel photo assignment, per-panel zoom
  (slider or wheel) and pan (drag), fill-all-panels, reset crop.
- Layouts: Hero + 3, Four Grid, Three Bands, Full Bleed, Tilted Snaps,
  Nine Panel. Grades: Vice Sunset, Neon Nights, Palm Gold, Midnight Drive,
  Candy Pop.
- Fast: load a sample photo, pick a layout, type a caption, one click per
  export size — 1080×1080, 1080×1350, 1920×1080.
- Offline: static files only; the only requests the browser makes are to
  localhost (verified — see below).

## How to run

```sh
node serve.ts            # http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Verification (all real runs, 2026-11-19)

Playwright (Python, headless Chromium from the local cache) served the app
on `http://127.0.0.1:8123` (`/tmp/cover-art-test/shots.py`):

- `?selftest=1` — **pass** (1,014 ms): photo 1 + photo 2 loaded, caption
  and layout changed, panel 0 cropped (zoom 1.6, pan applied), all three
  sizes exported and re-measured as exact PNGs:
  1080×1080 (2,033,904 B), 1080×1350 (2,561,496 B), 1920×1080
  (3,099,926 B). Zero console errors, zero page errors, zero failed
  requests, zero external requests (38 requests total, all localhost /
  blob: / data:).
- Real exports via the UI buttons (same run): each export downloaded as a
  PNG at the exact pixel size, then scaled with PIL to the screenshot
  limits — these are screenshots 1, 3 and 4.
- `MAKEFUN_OUTPUT_DIR=/tmp/out-cover-art node main.ts` — succeeds,
  writes `/tmp/out-cover-art/dossier.json` (see output below).
- Static scan: no `http(s)://` URLs, no `fetch(` calls in app code (the
  only matches are the self-test's request *counter*, which patches
  XHR/fetch to count calls and never makes one); no Rockstar/GTA assets —
  the word "Rockstar" appears only in disclaimer sentences stating none is
  used. `app/` totals 159,336 bytes, 11 files — far under the caps.

## Screenshots

| File | Size | What it shows |
|---|---|---|
| `1-cover.jpg` | 1280×720, 151,174 B | Real exported 1920×1080 cover, Hero + 3 / Vice Sunset, "NEON COAST" |
| `2-editor.jpg` | 1280×800, 150,374 B | Editor in the browser, photo loaded, Four Grid / Neon Nights |
| `3-cover-portrait.jpg` | 1024×1280, 166,162 B | Real exported 1080×1350 cover, Three Bands / Palm Gold, "SUNSET HEIST" |
| `4-cover-square.jpg` | 1080×1080, 231,845 B | Real exported 1080×1080 cover, Nine Panel / Midnight Drive, "NIGHT DRIVE" |

All four are ≤ 256 KiB, long side ≤ 1280, short side ≥ 480. The first by
name is the cover (landscape, largest in the judge's contact sheet).

## Fixes made during the build

1. Panel frames were stroked from the panel centre instead of its corner
   (`strokeRect(0, 0, …)` after translating to the centre) — white frame
   boxes floated across the photos. Fixed to `strokeRect(-w/2, -h/2, …)`.
2. The bottom-left "POSTER No. 06" tag collided with the subtitle line in
   the title band. Removed the tag.
3. Palm silhouettes drawn at the sky edges were clipped by panels and read
   as dark smudges. Now drawn only in the Tilted Snaps layout, where open
   sky shows, fully inside the canvas.
4. Wide/short panels cropped faces out of the sample photos in the cover
   screenshots. Added `pany`/`panx` shot framing (`shots.js`) and framed
   the hero and strip shots at `pany=0.8` so faces show.
5. The self-test call in `main.js` did not pass `redraw`; fixed before the
   first test run.

## Known weaknesses

- Lettering is bold system sans condensed in code, not a true condensed
  display font — good, but a shipped OFL condensed face would look
  closer to the genre. (Deliberate: avoids any font-licence risk.)
- The star badge can overlap a photo corner in the Hero + 3 and Three
  Bands layouts; it reads as a sticker, but it does cover a small part of
  the photo.
- In very wide, short panels (side stack of Hero + 3) a portrait photo
  still crops hard; the user can pan/zoom to fix it, but the default
  framing depends on the photo.
- The tilted layout's rotated panels are hit-tested by bounding box, so
  clicking near a rotated corner can select the wrong panel.
- Grain is seeded-random dots, not true film grain; at 1920×1080 it is
  subtle.
