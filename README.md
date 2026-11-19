# Neon Coast — Cover Studio

[![make.fun](https://make.fun/badge/competition/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/submission/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and a caption into poster-style cover
art — multi-panel layouts, a sunset / neon colour grade, bold condensed
lettering — and exports it as a PNG to share.

## What it does

- **Any photo:** upload up to 4 photos from your machine (nothing is uploaded anywhere). Click a panel in the live preview to select it, drag to move its photo, scroll to zoom, or use the zoom slider. One photo can fill every panel, or each panel can hold a different photo.
- **Six poster layouts:** Hero + 3, Four Grid, Three Bands, Full Bleed, Tilted Snaps, Nine Panel.
- **Five colour grades:** Vice Sunset, Neon Nights, Palm Gold, Midnight Drive, Candy Pop — gradient skies, a low sun, palm silhouettes, halftone dots, film grain and a vignette, all drawn in code.
- **Caption:** a big condensed gradient title with an ink outline, plus a neon subtitle line. Both editable live.
- **Fast:** photo to PNG in a few steps, in the common post sizes **1080 × 1080**, **1080 × 1350** and **1920 × 1080** — one click each.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network, no account. `app/` is plain static files.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `app/` and `screenshots/` to the
output directory and writes `dossier.json` with the kit's `vendor/makefun-app.ts`.

## Originality

All art, lettering and effects are drawn in code in `app/src/cover.js`. No
Rockstar logo, wordmark, official artwork, character or font is used anywhere.
Lettering uses bold system sans fonts, condensed in code; no font file is
shipped. The two sample photos in `app/samples/` were made for make.fun with
an image model and are free to use.
