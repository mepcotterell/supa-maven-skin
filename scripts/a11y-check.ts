/**
 * @fileoverview Rendered-page accessibility checks for the generated self-site.
 *
 * Serves `target/site/` from an in-process Node static file server, opens every
 * top-level page in headless Chromium (Playwright), waits for Supa Maven Skin to
 * finish initialising (`html[data-supa-ready]`), and runs axe-core with the
 * WCAG 2.0/2.1/2.2 A and AA rule tags. The SCSS token linter (`npm run lint:scss`)
 * proves palette pairs meet their contrast targets in isolation; this script
 * proves the rendered combination of Velocity markup, CSS, and TypeScript
 * enhancements does too.
 *
 * Run `mvn -B -ntp clean verify site` first, then `npm run test:a11y`.
 * Requires a Chromium build (`npx playwright install chromium`). It is
 * deliberately not part of `npm test` or the Maven build so consumer sites and
 * `mvn verify` never need a browser.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';

/** Polarity stored in `localStorage['supa-theme']` (see `theme.ts`). */
type Polarity = 'light' | 'dark';

/** Palette IDs stored in `localStorage['supa-palette']` (see `theme.ts`). */
const PALETTES = [
  'furo',
  'bootstrap',
  'modus',
  'modus-tinted',
  'modus-deuteranopia',
  'modus-tritanopia'
] as const;

type Palette = (typeof PALETTES)[number];

/** One page × theme × viewport combination to scan. */
interface ScanJob {
  page: string;
  palette: Palette;
  polarity: Polarity;
  width: number;
  height: number;
}

/** One axe violation node flattened for reporting. */
interface Finding {
  page: string;
  variant: string;
  ruleId: string;
  impact: string;
  target: string;
  summary: string;
  html: string;
  helpUrl: string;
}

const ROOT_DIR: string = resolve(import.meta.dirname, '..');
const SITE_DIR: string = join(ROOT_DIR, 'target', 'site');
const WCAG_TAGS: string[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const DESKTOP = { width: 1440, height: 900 } as const;
const MOBILE = { width: 390, height: 844 } as const;
const READY_TIMEOUT_MS = 30_000;
const CONCURRENCY = 4;

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * Resolves a request URL path to a file under `siteDir`, refusing traversal.
 *
 * @param siteDir - Absolute directory being served.
 * @param urlPath - Raw request path (may contain a query string).
 * @returns Absolute file path, or null when the path escapes `siteDir` or is missing.
 */
function resolveSitePath(siteDir: string, urlPath: string): string | null {
  const pathname = decodeURIComponent(urlPath.split(/[?#]/, 1)[0] ?? '/');
  const candidate = normalize(join(siteDir, pathname));
  if (candidate !== siteDir && !candidate.startsWith(siteDir + sep)) {
    return null;
  }
  if (!existsSync(candidate)) {
    return null;
  }
  if (statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return candidate;
}

/**
 * Starts a static file server for `siteDir` on an ephemeral loopback port.
 *
 * @param siteDir - Absolute directory to serve.
 * @returns The listening server and its base URL.
 */
async function startServer(siteDir: string): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const filePath = resolveSitePath(siteDir, req.url ?? '/');
    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    readFile(filePath).then(
      (body) => {
        const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(body);
      },
      () => {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Read error');
      }
    );
  });
  await new Promise<void>((resolveListen) => {
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

/**
 * Builds the scan matrix required by the a11y lane.
 *
 * @param pages - Top-level HTML file names found in `target/site`.
 * @returns Every page in furo light/dark at desktop size, `index.html` in all
 *     12 palette × polarity variants, and `index.html` at a mobile viewport.
 */
function buildJobs(pages: string[]): ScanJob[] {
  const jobs: ScanJob[] = [];
  for (const page of pages) {
    for (const polarity of ['light', 'dark'] as const) {
      jobs.push({ page, palette: 'furo', polarity, ...DESKTOP });
    }
  }
  for (const palette of PALETTES) {
    if (palette === 'furo') {
      continue; // Already covered by the per-page furo light/dark pass above.
    }
    for (const polarity of ['light', 'dark'] as const) {
      jobs.push({ page: 'index.html', palette, polarity, ...DESKTOP });
    }
  }
  for (const polarity of ['light', 'dark'] as const) {
    jobs.push({ page: 'index.html', palette: 'furo', polarity, ...MOBILE });
  }
  return jobs;
}

/**
 * Formats a scan job's variant label for the report.
 *
 * @param job - Scan job.
 * @returns Human-readable variant such as `modus/dark @1440x900`.
 */
function variantLabel(job: ScanJob): string {
  return `${job.palette}/${job.polarity} @${job.width}x${job.height}`;
}

/**
 * Opens one page variant, waits for the skin to finish initialising, and runs axe.
 *
 * @param browser - Shared Chromium instance.
 * @param baseUrl - Static server base URL.
 * @param job - Page/variant to scan.
 * @returns Flattened violation nodes for this job.
 */
async function scan(browser: Browser, baseUrl: string, job: ScanJob): Promise<Finding[]> {
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.height },
    colorScheme: job.polarity,
    reducedMotion: 'reduce'
  });
  try {
    // Seed the same keys the <head> anti-FOUC script and theme.ts read, before
    // any page script runs, so the first paint already uses the variant.
    await context.addInitScript(
      ([theme, palette]: [string, string]) => {
        try {
          window.localStorage.setItem('supa-theme', theme);
          window.localStorage.setItem('supa-palette', palette);
        } catch {
          // Storage can be unavailable on opaque origins; the scan then uses defaults.
        }
      },
      [job.polarity, job.palette] as [string, string]
    );
    const page = await context.newPage();
    await page.goto(`${baseUrl}/${job.page}`, { waitUntil: 'load' });
    await page.waitForSelector('html[data-supa-ready="true"]', {
      state: 'attached',
      timeout: READY_TIMEOUT_MS
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const applied = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-bs-theme'),
      palette: document.documentElement.getAttribute('data-supa-palette')
    }));
    if (applied.theme !== job.polarity || applied.palette !== job.palette) {
      throw new Error(
        `${job.page} [${variantLabel(job)}] did not apply the requested variant ` +
          `(got data-bs-theme=${applied.theme}, data-supa-palette=${applied.palette}).`
      );
    }
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const findings: Finding[] = [];
    // No rule exclusions: every violation is either fixed in the skin or in demo content.
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        findings.push({
          page: job.page,
          variant: variantLabel(job),
          ruleId: violation.id,
          impact: node.impact ?? violation.impact ?? 'unknown',
          target: node.target.map((t) => (Array.isArray(t) ? t.join(' >>> ') : String(t))).join(' '),
          summary: (node.failureSummary ?? violation.help).replace(/\s+/g, ' ').trim(),
          html: node.html.replace(/\s+/g, ' ').trim().slice(0, 160),
          helpUrl: violation.helpUrl
        });
      }
    }
    return findings;
  } finally {
    await context.close();
  }
}

/**
 * Runs `worker` over `items` with bounded parallelism, preserving input order.
 *
 * @param items - Work items.
 * @param limit - Maximum concurrent workers.
 * @param worker - Async function applied to each item.
 * @returns Results in the same order as `items`.
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Prints findings grouped by page and variant.
 *
 * @param findings - All violations across every scan.
 */
function printReport(findings: Finding[]): void {
  let lastHeading = '';
  for (const f of findings) {
    const heading = `${f.page} [${f.variant}]`;
    if (heading !== lastHeading) {
      console.error(`\n${heading}`);
      lastHeading = heading;
    }
    console.error(`  - ${f.ruleId} (${f.impact}) ${f.target}`);
    console.error(`      ${f.html}`);
    console.error(`      ${f.summary}`);
    console.error(`      ${f.helpUrl}`);
  }
}

/**
 * Entry point: serves the site, scans every job, prints a report, and sets the exit code.
 *
 * @returns Process exit code (0 when no violations, 1 otherwise).
 */
async function main(): Promise<number> {
  if (!existsSync(join(SITE_DIR, 'index.html'))) {
    console.error(
      `a11y: ${SITE_DIR}/index.html not found. Build the self-site first: mvn -B -ntp clean verify site`
    );
    return 1;
  }
  const pages = readdirSync(SITE_DIR)
    .filter((name) => name.endsWith('.html'))
    .sort();
  // Optional positional page names (`npm run test:a11y -- team.html`) narrow
  // the matrix while iterating on a fix; CI always runs the full matrix.
  const only = new Set(process.argv.slice(2));
  // A mistyped name would otherwise scan nothing and report success, which
  // reads like a clean result; reject unknown names before starting a browser.
  const unknown = [...only].filter((name) => !pages.includes(name));
  if (unknown.length > 0) {
    console.error(
      `a11y: no such page in ${SITE_DIR}: ${unknown.join(', ')}\n` +
        `a11y: available pages: ${pages.join(', ')}`
    );
    return 1;
  }
  const jobs = buildJobs(pages).filter((job) => only.size === 0 || only.has(job.page));
  if (jobs.length === 0) {
    console.error('a11y: nothing to scan (no HTML pages matched).');
    return 1;
  }
  const { server, baseUrl } = await startServer(SITE_DIR);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const activeBrowser = browser;
    console.log(
      `a11y: scanning ${jobs.length} page variants (${pages.length} pages) with axe-core [${WCAG_TAGS.join(', ')}]`
    );
    const perJob = await mapLimit(jobs, CONCURRENCY, async (job) => {
      const findings = await scan(activeBrowser, baseUrl, job);
      console.log(
        `  ${findings.length === 0 ? 'ok  ' : 'FAIL'} ${job.page} [${variantLabel(job)}]` +
          (findings.length > 0 ? ` (${findings.length} violation nodes)` : '')
      );
      return findings;
    });
    const findings = perJob.flat();
    if (findings.length > 0) {
      printReport(findings);
      const rules = new Set(findings.map((f) => f.ruleId));
      console.error(
        `\na11y: ${findings.length} violation nodes (${rules.size} rules: ${[...rules].join(', ')}).`
      );
      return 1;
    }
    console.log(`a11y: no WCAG A/AA violations across ${jobs.length} page variants.`);
    return 0;
  } finally {
    await browser?.close();
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error('a11y: check aborted:', error);
    process.exitCode = 1;
  }
);
