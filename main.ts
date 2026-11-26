// Sky Courier hand-in program (Node 22, standard library only).
//
// It copies this repository's game/ and screenshots/ into the output
// directory and writes dossier.json there with the vendored make.fun
// library, so the sealed scorer can read the entry. Run it twice and
// both runs must produce identical bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Without MAKEFUN_OUTPUT_DIR it writes to /output, the grader's dir.)

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');

mkdirSync(outDir, { recursive: true });
// Start clean so a stale file from an earlier run can never leak in.
rmSync(join(outDir, 'game'), { recursive: true, force: true });
rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });

cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });
} else {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Sky Courier written to ${outDir}`);
