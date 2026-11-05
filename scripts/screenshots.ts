/**
 * @fileoverview README screenshots of the generated self-site.
 *
 * Serves `target/site/` from an in-process Node static file server, opens self-site pages in
 * headless Chromium (Playwright), and writes the images README.md shows to `.github/screenshots/`:
 * a desktop page, a phone page beside its open navigation drawer, and one region in every color
 * scheme, each once per polarity so README.md's `<picture>` elements can follow the reader's
 * GitHub theme.
 *
 * The images are reproducible, so they can be refreshed after a design change without hand
 * editing: every capture uses a fixed viewport and device scale factor, `reducedMotion: 'reduce'`,
 * a fixed locale and time zone, and only the local server (requests to anything else, such as
 * the Mermaid and KaTeX CDNs, are aborted). Each page seeds its palette and polarity through the
 * same `localStorage` keys the anti-FOUC `<head>` script reads, then waits for
 * `html[data-supa-ready]`, loaded fonts, decoded images, and finished CSS transitions and
 * animations. The pointer is parked outside the viewport and nothing keeps focus, so no hover
 * state, focus ring, or tooltip shows, and a check refuses to capture if one does or if a
 * `-SNAPSHOT` version is in view. Tiles are framed and laid out by a small HTML page in the same
 * browser, and Chromium's own canvas encoder writes lossless WebP, so no image library is needed
 * and two runs over the same `target/site/` produce byte-identical files.
 *
 * Run `mvn -B -ntp clean verify site` first, then `npm run screenshots`, and commit the changed
 * images. Requires a Chromium build (`npx playwright install chromium`). Like
 * `npm run test:a11y`, it is not part of CI or the Maven build.
 */
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, relative, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

/** Polarity stored in `localStorage['supa-theme']` (see `theme.ts`). */
type Polarity = 'light' | 'dark';

/** Palette IDs stored in `localStorage['supa-palette']` (see `theme.ts`), in picker order. */
const PALETTES = [
  'furo',
  'bootstrap',
  'modus',
  'modus-tinted',
  'modus-deuteranopia',
  'modus-tritanopia'
] as const;

type Palette = (typeof PALETTES)[number];

/** Browser viewport in CSS pixels. */
interface Viewport {
  width: number;
  height: number;
}

/** One page captured in one palette × polarity variant. */
interface Shot {
  /** Top-level HTML file under `target/site/`. */
  page: string;
  viewport: Viewport;
  palette: Palette;
  polarity: Polarity;
  /** Drives the loaded page into the state to capture, such as an open drawer. */
  prepare?: (page: Page) => Promise<void>;
}

/** A captured shot: the PNG and the color-scheme name the skin's picker shows for it. */
interface Capture {
  png: Buffer;
  paletteLabel: string;
}

/** One image file: its shots framed and laid out in a grid. */
interface Figure {
  /** File name under `.github/screenshots/`. */
  file: string;
  polarity: Polarity;
  columns: number;
  /** Size of each tile relative to its viewport (1 is native size, 1/3 a thumbnail). */
  scale: number;
  /** Prints the skin's color-scheme name under each tile. */
  captions: boolean;
  shots: Shot[];
}

const ROOT_DIR: string = resolve(import.meta.dirname, '..');
const SITE_DIR: string = join(ROOT_DIR, 'target', 'site');
const OUT_DIR: string = join(ROOT_DIR, '.github', 'screenshots');
const POLARITIES: readonly Polarity[] = ['light', 'dark'];

/**
 * Device pixels per CSS pixel. README.md shows the desktop image at roughly 60% of its width, so
 * one device pixel per CSS pixel is already sharp there and keeps the images small.
 */
const DEVICE_SCALE_FACTOR = 1;
/**
 * Tall enough to show the hero page's admonition and its first code block below the title, with
 * the sidebar on the left and the "On this page" TOC (shown from 1280px up) on the right.
 */
const DESKTOP: Viewport = { width: 1440, height: 1080 };
const PALETTE_VIEWPORT: Viewport = { width: 1440, height: 900 };
const MOBILE: Viewport = { width: 390, height: 844 };
const READY_TIMEOUT_MS = 30_000;
const STATE_TIMEOUT_MS = 5_000;

/** Gap between tiles in a figure, in CSS pixels. */
const FIGURE_GAP = 24;
/**
 * Caption size in CSS pixels. GitHub shrinks the palette figure to about 60% of its width, so
 * this reads as roughly 14px there.
 */
const CAPTION_FONT_SIZE = 24;

/** Caption colors close to GitHub's own text colors, so each figure reads in its polarity. */
const CAPTION_COLORS: Readonly<Record<Polarity, string>> = {
  light: '#1f2328',
  dark: '#e6edf3'
};

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
 * The self-site renders `${project.version}` in the sidebar's version badge, which is a
 * `-SNAPSHOT` on main between releases. README.md must not advertise a build consumers cannot
 * resolve, so the badge is hidden, exactly as `<footerVersion>false</footerVersion>` renders it.
 */
const HIDE_VERSION_CSS = '.supa-version-badge { display: none !important; }';

/**
 * Opens the sidebar drawer from its mobile-header toggle and waits until it is open.
 *
 * The toggle is clicked from script, not with the mouse, so the pointer never enters the page and
 * nothing under it can show a hover state.
 *
 * @param page - Page at a viewport below `lg`.
 */
async function openSidebarDrawer(page: Page): Promise<void> {
  await page
    .locator('.supa-mobile-header [data-bs-target="#supaSidebarDrawer"]')
    .evaluate((toggle) => (toggle as HTMLElement).click());
  await page
    .locator('dialog#supaSidebarDrawer[open]')
    .waitFor({ state: 'visible', timeout: STATE_TIMEOUT_MS });
}

/**
 * Every image README.md shows, once per polarity: a content-rich desktop page with the sidebar,
 * an admonition, a code block, and the TOC; a phone page beside its open navigation drawer; and
 * the Kitchen Sink's colored admonitions as a thumbnail in each of the 6 color schemes.
 */
const FIGURES: readonly Figure[] = POLARITIES.flatMap((polarity): Figure[] => [
  {
    file: `desktop-${polarity}.webp`,
    polarity,
    columns: 1,
    scale: 1,
    captions: false,
    shots: [{ page: 'troubleshooting.html', viewport: DESKTOP, palette: 'furo', polarity }]
  },
  {
    file: `mobile-${polarity}.webp`,
    polarity,
    columns: 2,
    scale: 1,
    captions: false,
    shots: [
      { page: 'getting-started.html', viewport: MOBILE, palette: 'furo', polarity },
      {
        page: 'getting-started.html',
        viewport: MOBILE,
        palette: 'furo',
        polarity,
        prepare: openSidebarDrawer
      }
    ]
  },
  {
    file: `palettes-${polarity}.webp`,
    polarity,
    columns: 3,
    scale: 1 / 3,
    captions: true,
    shots: PALETTES.map((palette) => ({
      page: 'kitchen-sink.html',
      viewport: PALETTE_VIEWPORT,
      palette,
      polarity
    }))
  }
]);

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
 * Waits until nothing on the page is still moving or loading, so the capture shows the settled
 * page and never a half-faded color.
 *
 * Reduced motion already drops most of the skin's transitions; this also waits out any that
 * remain, any finite animation (such as a drawer sliding in), and image decoding, then lets two
 * frames paint.
 *
 * @param page - Page to settle.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => undefined)));
    const finite = document.getAnimations().filter((animation) => {
      const iterations = animation.effect?.getComputedTiming().iterations;
      return animation instanceof CSSTransition || (iterations !== undefined && Number.isFinite(iterations));
    });
    // An animation interrupted by another state change rejects `finished`; that one is settled too.
    await Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  });
}

/**
 * Throws when the page could show anything but its plain, settled state: a hovered or focused
 * element, an open tooltip, or a `-SNAPSHOT` version string inside the viewport.
 *
 * @param page - Page about to be captured.
 */
async function assertCleanState(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const found: string[] = [];
    const hovered = document.querySelectorAll(':hover');
    if (hovered.length > 0) {
      found.push(`${hovered.length} element(s) match :hover`);
    }
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) {
      found.push(`focus is on <${active.tagName.toLowerCase()} class="${active.className}">`);
    }
    if (document.querySelector('.tooltip.show, .popover.show') !== null) {
      found.push('a tooltip or popover is shown');
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!node.textContent?.includes('SNAPSHOT') || !parent?.checkVisibility({ visibilityProperty: true })) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      const inView = Array.from(range.getClientRects()).some(
        (rect) => rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
      );
      if (inView) {
        found.push(`"${node.textContent.trim().slice(0, 60)}" is visible`);
      }
    }
    return found;
  });
  if (problems.length > 0) {
    throw new Error(problems.join('; '));
  }
}

/**
 * Captures one shot in a fresh browser context.
 *
 * @param browser - Shared Chromium instance.
 * @param baseUrl - Static server base URL.
 * @param shot - Page, viewport, and variant to capture.
 * @returns The viewport PNG and the color-scheme name the skin shows for the variant.
 */
async function captureShot(browser: Browser, baseUrl: string, shot: Shot): Promise<Capture> {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: shot.polarity,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC'
  });
  try {
    // Only the local site: a CDN response (Mermaid, KaTeX) would make the images depend on the
    // network. The captured pages need none of them.
    await context.route('**/*', (route) =>
      route.request().url().startsWith(`${baseUrl}/`) ? route.continue() : route.abort()
    );
    // Seed the same keys the <head> anti-FOUC script and theme.ts read, before any page script
    // runs, so the first paint already uses the variant.
    await context.addInitScript(
      ([theme, palette]: [string, string]) => {
        window.localStorage.setItem('supa-theme', theme);
        window.localStorage.setItem('supa-palette', palette);
      },
      [shot.polarity, shot.palette] as [string, string]
    );
    const page = await context.newPage();
    page.setDefaultTimeout(STATE_TIMEOUT_MS);
    await page.goto(`${baseUrl}/${shot.page}`, { waitUntil: 'load' });
    await page.waitForSelector('html[data-supa-ready="true"]', {
      state: 'attached',
      timeout: READY_TIMEOUT_MS
    });
    const applied = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-bs-theme'),
      palette: document.documentElement.getAttribute('data-supa-palette'),
      label: document.querySelector('[data-supa-palette-label]')?.textContent?.trim() ?? ''
    }));
    if (applied.theme !== shot.polarity || applied.palette !== shot.palette) {
      throw new Error(
        `did not apply the requested variant (got data-bs-theme=${applied.theme}, ` +
          `data-supa-palette=${applied.palette}).`
      );
    }
    await page.addStyleTag({ content: HIDE_VERSION_CSS });
    await shot.prepare?.(page);
    // Park the pointer outside the viewport, so nothing shows a hover state or tooltip even if a
    // `prepare` step used the mouse.
    await page.mouse.move(-1, -1);
    // Opening a dialog moves focus into it, and a script-driven focus can draw a focus ring.
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    await settle(page);
    await assertCleanState(page);
    const png = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
    return { png, paletteLabel: applied.label };
  } finally {
    await context.close();
  }
}

/**
 * Escapes text for an HTML text node or attribute value.
 *
 * @param text - Raw text.
 * @returns HTML-safe text.
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/**
 * Builds the HTML page that frames a figure's tiles with rounded corners and a thin border,
 * lays them out, and adds captions, over a transparent background so the figure sits on either
 * GitHub theme.
 *
 * @param figure - Figure being rendered.
 * @param captures - One capture per shot, in order.
 * @returns A self-contained HTML document.
 */
function figureHtml(figure: Figure, captures: Capture[]): string {
  const tiles = captures
    .map((capture, idx) => {
      const { width, height } = figure.shots[idx].viewport;
      const src = `data:image/png;base64,${capture.png.toString('base64')}`;
      const caption = figure.captions ? `<figcaption>${escapeHtml(capture.paletteLabel)}</figcaption>` : '';
      return (
        `<figure><div class="frame"><img src="${src}" alt="" ` +
        `width="${Math.round(width * figure.scale)}" height="${Math.round(height * figure.scale)}"></div>` +
        `${caption}</figure>`
      );
    })
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; background: transparent; }
  .figure {
    display: inline-grid;
    grid-template-columns: repeat(${figure.columns}, auto);
    gap: ${FIGURE_GAP}px;
  }
  figure { margin: 0; }
  .frame {
    overflow: hidden;
    border: 1px solid rgb(127 127 127 / 40%);
    border-radius: 12px;
  }
  img { display: block; }
  figcaption {
    margin-top: 10px;
    font: 600 ${CAPTION_FONT_SIZE}px/1.25
      -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: ${CAPTION_COLORS[figure.polarity]};
    text-align: center;
  }
</style></head><body><div class="figure">${tiles}</div></body></html>`;
}

/**
 * Renders a figure from its captures and encodes it as lossless WebP.
 *
 * @param browser - Shared Chromium instance.
 * @param figure - Figure to render.
 * @param captures - One capture per shot, in order.
 * @returns The encoded WebP image.
 */
async function renderFigure(browser: Browser, figure: Figure, captures: Capture[]): Promise<Buffer> {
  const context = await browser.newContext({
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    reducedMotion: 'reduce'
  });
  try {
    const page = await context.newPage();
    await page.setContent(figureHtml(figure, captures), { waitUntil: 'load' });
    await settle(page);
    const png = await page.locator('.figure').screenshot({ type: 'png', omitBackground: true });
    // Playwright writes only PNG and JPEG. Chromium's canvas encoder writes WebP, and a quality
    // of 1 selects its lossless mode, which keeps text as sharp as PNG at about 70% of the size.
    const webp = await page.evaluate(async (base64: string) => {
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
      const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('no 2D canvas context');
      }
      ctx.drawImage(bitmap, 0, 0);
      const encoded = await canvas.convertToBlob({ type: 'image/webp', quality: 1 });
      if (encoded.type !== 'image/webp') {
        throw new Error(`this Chromium cannot encode WebP (got ${encoded.type})`);
      }
      const bytes = new Uint8Array(await encoded.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    }, png.toString('base64'));
    return Buffer.from(webp, 'base64');
  } finally {
    await context.close();
  }
}

/**
 * Entry point: serves the site, captures every figure, and writes the images.
 *
 * @returns Process exit code (0 when every image was written, 1 otherwise).
 */
async function main(): Promise<number> {
  if (!existsSync(join(SITE_DIR, 'index.html'))) {
    console.error(
      `screenshots: ${SITE_DIR}/index.html not found. Build the self-site first: mvn -B -ntp clean verify site`
    );
    return 1;
  }
  const missing = [...new Set(FIGURES.flatMap((f) => f.shots.map((s) => s.page)))].filter(
    (page) => !existsSync(join(SITE_DIR, page))
  );
  if (missing.length > 0) {
    console.error(`screenshots: pages missing from ${SITE_DIR}: ${missing.join(', ')}`);
    return 1;
  }
  await mkdir(OUT_DIR, { recursive: true });
  const { server, baseUrl } = await startServer(SITE_DIR);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    let total = 0;
    for (const figure of FIGURES) {
      const captures: Capture[] = [];
      // One shot at a time: parallel contexts would compete for the CPU, and nothing here
      // should depend on how fast a page happens to load.
      for (const shot of figure.shots) {
        try {
          captures.push(await captureShot(browser, baseUrl, shot));
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message.split('\n', 1)[0] : String(error);
          throw new Error(`${shot.page} [${shot.palette}/${shot.polarity}]: ${message}`, { cause: error });
        }
      }
      const image = await renderFigure(browser, figure, captures);
      const outPath = join(OUT_DIR, figure.file);
      await writeFile(outPath, image);
      total += image.length;
      console.log(`  ${relative(ROOT_DIR, outPath)} (${(image.length / 1024).toFixed(0)} KiB)`);
    }
    console.log(
      `screenshots: wrote ${FIGURES.length} images (${(total / 1024).toFixed(0)} KiB) ` +
        `to ${relative(ROOT_DIR, OUT_DIR)}/`
    );
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
    console.error('screenshots: aborted:', error);
    process.exitCode = 1;
  }
);
