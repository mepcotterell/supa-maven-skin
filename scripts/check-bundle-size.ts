#!/usr/bin/env node
/**
 * @fileoverview Bundle size budget check for Supa Maven Skin. Measures the raw and gzip size of
 * the Vite-built CSS bundle, JS entry, and lazily loaded JS chunks in `target/classes/` and exits
 * non-zero when a budget is exceeded or a built script is covered by no budget. It runs at the end
 * of `npm run build`, which the `vite-build` frontend-maven-plugin execution invokes, so
 * `mvn verify` fails on a size regression.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** A group of built assets and the maximum gzip size they may reach together. */
interface BundleBudget {
  /** What the budget covers, for the report. */
  label: string;
  /** Directory of the built assets, relative to the repository root. */
  dir: string;
  /** Matches the names of the files in `dir` that the budget covers. */
  files: RegExp;
  /** Maximum allowed gzip size in bytes, summed over every matching file. */
  maxGzipBytes: number;
}

/** Measured sizes of one built asset. */
interface BundleMeasurement {
  /** Uncompressed size in bytes. */
  rawBytes: number;
  /** Gzip size in bytes (zlib default level 6, which matches typical web server settings). */
  gzipBytes: number;
}

const KIB = 1024;

/** Directory holding the JS entry and its lazily loaded chunks. */
const JS_DIR = 'target/classes/js';

/**
 * Gzip size budgets: the single source of truth for bundle size limits.
 *
 * Every page downloads the CSS bundle and the JS entry. The lazily loaded chunks (the Bootstrap 6
 * widgets only author content uses, and the Component Playground) load only on pages whose markup
 * needs them, so they share one budget for their combined size: weight moved out of the entry into
 * a chunk, or a new chunk, still has to fit, so it cannot grow unnoticed.
 *
 * Each budget is the gzip size measured under the Node version Maven pins in `pom.xml` (v22.14.0)
 * plus about 5% headroom, rounded up to a whole KiB:
 * - CSS: 77,468 B for 0.1.1-SNAPSHOT, before the accessibility fixes and the SRI Mermaid/KaTeX
 *   loader merged; 78,317 B (76.48 KiB) by 0.1.5-SNAPSHOT, leaving about 4.4% headroom.
 * - JS entry: 70,240 B (68.59 KiB) once the widgets only author content uses moved into chunks
 *   (0.1.5-SNAPSHOT). Before that the single bundle measured 102,943 B (100.53 KiB) of a
 *   104 KiB budget.
 * - JS chunks: 40,294 B (39.35 KiB) in total for the same change, license banners included; the
 *   Datepicker chunk, with its vanilla-calendar-pro peer dependency, is 19,564 B of it.
 * Gzip output differs slightly between the zlib builds of different Node versions (newer Node
 * measured ~0.3% smaller), so Maven's pinned Node is the reference. The headroom absorbs small
 * fixes; it is not meant to absorb a new feature or dependency.
 *
 * To raise a budget deliberately: run `mvn -B -ntp verify` (or `npm run build` with the pinned
 * Node), note the reported gzip size, decide that the growth is worth what every consumer site
 * downloads (on every page for the CSS and the JS entry, on the pages using a widget for the
 * chunks), set the new limit here (measured size + ~5%, rounded up to a whole KiB), and state the
 * new size and its cause in the `CHANGELOG.md` entry for the change that grew the bundle.
 */
const BUDGETS: readonly BundleBudget[] = [
  {
    label: 'CSS bundle',
    dir: 'target/classes/css',
    files: /^supa-maven-skin\.min\.css$/,
    maxGzipBytes: 80 * KIB
  },
  {
    label: 'JS entry',
    dir: JS_DIR,
    files: /^supa-maven-skin\.min\.js$/,
    maxGzipBytes: 73 * KIB
  },
  {
    label: 'JS lazy chunks (total)',
    dir: JS_DIR,
    files: /^supa-maven-skin-.+\.min\.js$/,
    maxGzipBytes: 42 * KIB
  }
];

const ROOT_DIR: string = process.cwd();

/**
 * Formats a byte count as KiB with two decimals.
 *
 * @param bytes - Byte count to format.
 * @returns Human-readable size such as `75.56 KiB`.
 */
function formatKib(bytes: number): string {
  return `${(bytes / KIB).toFixed(2)} KiB`;
}

/**
 * Reads a built asset and measures its raw and gzip size.
 *
 * @param absolutePath - Absolute path to the built asset.
 * @returns Raw and gzip byte counts of the asset.
 */
function measure(absolutePath: string): BundleMeasurement {
  const content: Buffer = readFileSync(absolutePath);
  return { rawBytes: content.length, gzipBytes: gzipSync(content).length };
}

/**
 * Lists the files in a repository-relative directory, sorted by name.
 *
 * @param dir - Directory relative to the repository root.
 * @returns File names, or an empty list when the directory does not exist.
 */
function listFiles(dir: string): string[] {
  const absoluteDir: string = join(ROOT_DIR, dir);
  return existsSync(absoluteDir) ? readdirSync(absoluteDir).sort() : [];
}

const failures: string[] = [];
// Tracked apart from `failures` so the raise-the-budget hint appears only for a real size
// regression, not when a bundle is missing because the Vite build did not run.
let overBudget = false;

for (const budget of BUDGETS) {
  const files: string[] = listFiles(budget.dir).filter((name) => budget.files.test(name));
  if (files.length === 0) {
    failures.push(
      `${budget.label}: no file in ${budget.dir} matches ${budget.files}. ` +
        'Run the Vite build before checking bundle sizes.'
    );
    continue;
  }
  let rawTotal = 0;
  let gzipTotal = 0;
  const lines: string[] = [];
  for (const name of files) {
    const { rawBytes, gzipBytes } = measure(join(ROOT_DIR, budget.dir, name));
    rawTotal += rawBytes;
    gzipTotal += gzipBytes;
    lines.push(`${budget.dir}/${name}: ${formatKib(rawBytes)} raw, ${formatKib(gzipBytes)} gzip`);
  }
  const usedPercent: string = ((gzipTotal / budget.maxGzipBytes) * 100).toFixed(1);
  const summary = `${formatKib(gzipTotal)} gzip (${usedPercent}% of ${formatKib(budget.maxGzipBytes)} budget)`;
  if (files.length === 1) {
    console.log(`  ${lines[0]} (${usedPercent}% of ${formatKib(budget.maxGzipBytes)} budget)`);
  } else {
    console.log(`  ${budget.label}: ${files.length} files, ${formatKib(rawTotal)} raw, ${summary}`);
    for (const line of lines) {
      console.log(`    ${line}`);
    }
  }
  if (gzipTotal > budget.maxGzipBytes) {
    overBudget = true;
    failures.push(
      `${budget.label}: gzip size ${formatKib(gzipTotal)} (${gzipTotal} B) exceeds its budget of ` +
        `${formatKib(budget.maxGzipBytes)} (${budget.maxGzipBytes} B) by ` +
        `${gzipTotal - budget.maxGzipBytes} B.`
    );
  }
}

// A script no budget covers (a chunk named outside the `supa-maven-skin-*` pattern, or a stray
// file) would ship in the JAR unmeasured.
for (const name of listFiles(JS_DIR).filter((file) => file.endsWith('.js'))) {
  const covered = BUDGETS.some((budget) => budget.dir === JS_DIR && budget.files.test(name));
  if (!covered) {
    failures.push(`${JS_DIR}/${name}: no budget covers this script. Add it to BUDGETS.`);
  }
}

if (failures.length > 0) {
  console.error(`Bundle Size Check found ${failures.length} problem(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  if (overBudget) {
    console.error(
      'Shrink the bundle, or raise the budget deliberately in scripts/check-bundle-size.ts ' +
        '(see the comment above BUDGETS).'
    );
  }
  process.exit(1);
} else {
  console.log(`Bundle Size Check passed for ${BUDGETS.length} budget(s).`);
}
