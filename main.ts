// Neon Coast Cover Studio — the hand-in program for gta6-cover-art-01.
// Node 22, standard library only. It gathers this repository's app/ and
// screenshots/ beside this file, copies them into the output directory, and
// writes the dossier.json the judge reads, using the kit's vendored library
// (vendor/makefun-app.ts, byte-for-byte the kit copy).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

function mustExist(dir, what) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`missing ${what} directory: ${dir}`);
  }
}

mustExist(appDir, 'app');
mustExist(shotsDir, 'screenshots');
const shotFiles = readdirSync(shotsDir).filter((f) => !f.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// dossier text; the other caps refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; app/ over 993 files,
// 48 MiB in all, or a path over 1000 bytes — app/ shares /output's own
// 1000-entry cap with screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`handed in ${shotFiles.length} screenshots to ${out}`);
