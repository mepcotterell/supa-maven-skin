#!/usr/bin/env node
/**
 * @fileoverview Bundle size budget check for Supa Maven Skin. Measures the raw and gzip size of
 * the Vite-built CSS and JS bundles in `target/classes/` and exits non-zero when any bundle's
 * gzip size exceeds its budget. It runs at the end of `npm run build`, which the `vite-build`
 * frontend-maven-plugin execution invokes, so `mvn verify` fails on a size regression.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

/** A built asset and the maximum gzip size it may reach. */
interface BundleBudget {
  /** Path of the built asset, relative to the repository root. */
  path: string;
  /** Maximum allowed gzip size in bytes. */
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

/**
 * Gzip size budgets: the single source of truth for bundle size limits.
 *
 * Each budget is the gzip size measured for 0.1.1-SNAPSHOT under the Node version Maven pins in
 * `pom.xml` (v22.14.0: CSS 77,468 B; JS 100,916 B), plus about 5% headroom, rounded up to a
 * whole KiB. Gzip output differs slightly between the zlib builds of different Node versions
 * (newer Node measured ~0.3% smaller), so Maven's pinned Node is the reference. The headroom
 * absorbs small fixes; it is not meant to absorb a new feature or dependency.
 *
 * To raise a budget deliberately: run `mvn -B -ntp verify` (or `npm run build` with the pinned
 * Node), note the reported gzip size, decide that the growth is worth what every consumer site
 * downloads on every page, set the new limit here (measured size + ~5%, rounded up to a whole
 * KiB), and state the new size and its cause in the `CHANGELOG.md` entry for the change that
 * grew the bundle.
 */
const BUDGETS: readonly BundleBudget[] = [
  { path: 'target/classes/css/supa-maven-skin.min.css', maxGzipBytes: 80 * KIB },
  { path: 'target/classes/js/supa-maven-skin.min.js', maxGzipBytes: 104 * KIB },
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

const failures: string[] = [];

for (const budget of BUDGETS) {
  const absolutePath: string = join(ROOT_DIR, budget.path);
  const relPath: string = relative(ROOT_DIR, absolutePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relPath}: not found. Run the Vite build before checking bundle sizes.`);
    continue;
  }
  const { rawBytes, gzipBytes } = measure(absolutePath);
  const usedPercent: string = ((gzipBytes / budget.maxGzipBytes) * 100).toFixed(1);
  console.log(
    `  ${relPath}: ${formatKib(rawBytes)} raw, ${formatKib(gzipBytes)} gzip ` +
      `(${usedPercent}% of ${formatKib(budget.maxGzipBytes)} budget)`
  );
  if (gzipBytes > budget.maxGzipBytes) {
    failures.push(
      `${relPath}: gzip size ${formatKib(gzipBytes)} (${gzipBytes} B) exceeds its budget of ` +
        `${formatKib(budget.maxGzipBytes)} (${budget.maxGzipBytes} B) by ` +
        `${gzipBytes - budget.maxGzipBytes} B.`
    );
  }
}

if (failures.length > 0) {
  console.error(`Bundle Size Check found ${failures.length} problem(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    'Shrink the bundle, or raise the budget deliberately in scripts/check-bundle-size.ts ' +
      '(see the comment above BUDGETS).'
  );
  process.exit(1);
} else {
  console.log(`Bundle Size Check passed for ${BUDGETS.length} bundle(s).`);
}
