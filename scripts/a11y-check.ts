/**
 * @fileoverview Rendered-page accessibility checks for the generated self-site and the
 * Invoker fixture sites.
 *
 * Serves `target/site/` from an in-process Node static file server, opens every
 * top-level page in a headless Playwright browser (Chromium unless `--engine` or
 * `A11Y_ENGINE` selects another), waits for Supa Maven Skin to
 * finish initialising (`html[data-supa-ready]`), and runs axe-core with the
 * WCAG 2.0/2.1/2.2 A and AA rule tags, plus the AAA `color-contrast-enhanced`
 * rule (7:1) on the `modus*` palettes that promise AAA, and checks that the
 * color-scheme trigger's accessible name contains the scheme name it shows
 * (WCAG 2.5.3 Label in Name) and that no two elements share an `id`. The SCSS
 * token linter (`npm run lint:scss`) proves palette pairs meet their contrast targets in
 * isolation; this script proves the rendered combination of Velocity markup,
 * CSS, and TypeScript enhancements does too.
 *
 * A page scanned right after load only shows the skin's chrome closed, so the
 * matrix also runs data-driven interaction scenarios (`SCENARIOS`): each drives
 * a page into an open, interacted, or hovered state with Playwright locators,
 * the keyboard, and the mouse (the search dialog empty and with highlighted
 * matches and an active result, the sidebar and TOC drawers, the color-scheme
 * and theme menus in each header and drawer placement, a shown tooltip, a copy
 * button and its tooltip in the "Copied!" state, a re-expanded sidebar group,
 * an expanded accordion and switched content tab on `components.html`, a
 * Markdown link followed to a heading whose id starts with a digit there, a
 * hovered themed chip, unthemed chip, and text button there, inline code
 * added there on the solid fills of themed card caps and an active list-group
 * item, including cap text, links, and theme-reset inheritance, measured in every
 * palette and polarity, an opened Combobox, whose script is a lazily loaded chunk,
 * the opened Datepicker
 * calendar in every palette and polarity, in its month view, whose buttons
 * must be named by the month names they show, and again as a range picker opened
 * after a switch from `auto` to an explicit theme, and content pages printed,
 * with print media emulated and backgrounds dropped as browsers print them, so
 * text must read on white paper in every polarity, including the default
 * `auto` mode under a dark OS preference, the component showcase printed,
 * where a state drawn only by a fill must keep it, and a page opened from a
 * link to a heading far down it, which must land under the headers with or
 * without reduced motion, and leave a reader who scrolls before the page is
 * ready, or who scrolls away and reloads, where they are), asserts the
 * state was reached, scans it in `furo` light and dark and `modus` dark (AAA)
 * unless the scenario lists its own variants, and asserts the state still held
 * after the scan, so a broken selector fails the run instead of quietly
 * scanning the closed state. `control-boundaries-focus` checks normal and
 * validation borders of the checkbox, radio, switch, form control, chip input, and OTP slots,
 * range track boundaries, thumb and fill contrast, preserved disabled range and OTP paint,
 * unthemed and themed switch knobs, checked contrast and disabled fading, and a focused pill in
 * all 12 variants, as `copy-button-tooltip` and `range-tooltip` scan a tooltip.
 * `toc-link-focus-mobile`, `toc-link-focus-tablet`, `toc-link-focus-smooth-mobile`,
 * and `toc-link-focus-smooth-tablet` check destination focus, Tab continuation, and that the
 * element Tab reached keeps focus once the TOC navigation has settled.
 * `sidebar-link-focus-mobile`, `sidebar-link-focus-desktop`, and their `-smooth` variants check
 * the same for a same-page sidebar link, in the drawer and in the inline sidebar.
 * `drawer-roles-*` read the sidebar's and the TOC's role and name from Chromium's accessibility
 * tree: a landmark with no dialog inside it inline, and a modal dialog when opened as a drawer.
 * Search results also assert the combobox's active descendant matches selection, and
 * `search-dialog-no-results` the polite no-results status. `sidebar-depth-three` checks the
 * self-site's third sidebar level.
 * `forced-colors-controls-tabs`, `forced-colors-palettes`, and `forced-colors-search`
 * check system-color selection and distinct keyboard focus in light and dark;
 * the controls/tabs scan is scoped to those widgets. `forced-colors-states` checks that checked
 * radios and toggle buttons and selected, current, pressed, and disabled Bootstrap states visibly
 * change their element, that their text reads against the pixels painted under it, that inactive
 * stepper counters and connectors stand out from the page, and that keyboard focus differs from
 * resting selection. `forced-colors-pages` scans
 * every top-level page unscoped in both OS color schemes; `forced-colors-popover`
 * checks open popover text, box edges, and the connecting arrow. `forced-colors-tooltip`
 * checks the range slider's tooltip keeps a system-color text fill and border.
 * Every scan first waits for running CSS transitions to finish, so axe
 * measures settled colors, not a fade.
 *
 * Each Invoker fixture site that `mvn verify` rendered (`target/it/<name>/target/site/`) is
 * served on its own origin too, and every page in it, subdirectories included, is scanned in
 * `furo` light and dark, with its `index.html` also at a phone viewport. A fixture without a
 * rendered site is skipped with a note, or fails the run under `--require-fixtures`, as in CI.
 *
 * `--list` prints the scenario names and exits without a site or a browser;
 * `scripts/lint-docs.ts` compares them with the `architecture.md` scenario table.
 *
 * Run `mvn -B -ntp clean verify site` first, then `npm run test:a11y`; append
 * page, scenario, or fixture names (`npm run test:a11y -- team.html palette-menu sample-site`) to
 * narrow the matrix while iterating, and `--variants furo/light,modus/dark` to
 * keep only those palette × polarity variants. `--engine firefox` or
 * `--engine webkit` (or `A11Y_ENGINE`) runs the same matrix in that engine; a
 * scenario whose `engines` leave it out is skipped, and its reason printed once.
 * Requires that engine's Playwright build (`npx playwright install chromium`,
 * or `firefox` or `webkit`). It is deliberately not part of `npm test` or the
 * Maven build so consumer sites and `mvn verify` never need a browser.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, firefox, webkit } from 'playwright';
import type { Browser, BrowserContext, BrowserType, Locator, Page } from 'playwright';
import { WCAG_MINIMUMS } from './contrast-audit.ts';
import type { ContrastRole } from './contrast-audit.ts';

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

/** Playwright browser engines the runner can scan in; `chromium` is the default and CI's. */
const ENGINES = ['chromium', 'firefox', 'webkit'] as const;

type Engine = (typeof ENGINES)[number];

/** Launchers for each engine. */
const BROWSER_TYPES: Readonly<Record<Engine, BrowserType>> = { chromium, firefox, webkit };

/** Environment variable that selects the engine when no `--engine` flag does. */
const ENGINE_ENV = 'A11Y_ENGINE';

/**
 * The engines an engine-limited scenario runs in, and why the others skip it. A run in another
 * engine prints the reason once per scenario name, not per variant.
 */
interface EngineSupport {
  /** Engines the scenario runs in. */
  supported: readonly Engine[];
  /** Why the other engines cannot run it. */
  reason: string;
}

/** Browser viewport in CSS pixels. */
interface Viewport {
  width: number;
  height: number;
}

/** One palette × polarity combination. */
interface Variant {
  palette: Palette;
  polarity: Polarity;
}

/**
 * An interactive state of the skin's chrome that a load-time scan never sees.
 *
 * The page is loaded exactly as for a plain scan (variant seeded, skin ready,
 * fonts loaded), then `setup` drives it into the state and `assertState`
 * proves it got there before axe runs.
 */
interface InteractionScenario {
  /** Short kebab-case name shown in the report and accepted as a CLI filter. */
  name: string;
  /** Top-level HTML file the scenario opens. */
  page: string;
  /** Viewport the state needs (drawers only exist below their breakpoints). */
  viewport: Viewport;
  /**
   * Palette × polarity variants to scan the state in. Defaults to
   * `SCENARIO_VARIANTS`; list others for a widget that only some palettes tint.
   */
  variants?: readonly Variant[];
  /**
   * Engines the scenario runs in. Defaults to every one of `ENGINES`; limit it only when an
   * engine, or Playwright's emulation in it, cannot produce the state, and say why.
   */
  engines?: EngineSupport;
  /** Browser permissions the setup needs, such as clipboard access for the copy button. */
  permissions?: string[];
  /**
   * Date and time the page's clock is fixed at (`Date` only; timers keep running), for a widget
   * that renders around today, such as a calendar.
   */
  now?: string;
  /**
   * Selectors that limit the scan to the regions the state changes. Only for a
   * state the skin holds briefly (the copy button resets "Copied!" after 1.8 s),
   * so axe finishes well inside it, a hovered component, which changes only
   * itself, or a widget opened from a field, which changes only itself and the
   * field; the unchanged rest of the page is covered by the load-time scans.
   * Every other scenario scans the whole page.
   */
  scope?: readonly string[];
  /**
   * Changes a browser setting before the page loads, for a setting its first layout must already
   * use, such as the default font size.
   */
  prepare?: (page: Page) => Promise<void>;
  /** Drives the loaded page into the state with locators, the keyboard, and the mouse. */
  setup: (page: Page) => Promise<void>;
  /**
   * Throws unless the page is in the state. Runs after `setup` and again after
   * the scan, so a broken selector, or a state that closed mid-scan, fails the
   * run instead of scanning the closed state.
   */
  assertState: (page: Page) => Promise<void>;
}

/** One page × theme × viewport combination to scan, optionally in an interactive state. */
interface ScanJob extends Variant, Viewport {
  /** Invoker fixture whose rendered site holds the page (`sample-site`), or `''` for the self-site. */
  site: string;
  /** Page path inside its site, such as `index.html` or `fr/guide.html`. */
  page: string;
  scenario?: InteractionScenario;
}

/** A rendered site the runner serves on its own origin and scans. */
interface SiteRoot {
  /** Invoker fixture project name, or `''` for the self-site. */
  name: string;
  /** Absolute directory holding the rendered site. */
  dir: string;
  /** HTML pages to scan, relative to `dir`. */
  pages: string[];
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

/** A job that could not be scanned (variant not applied or scenario state not reached). */
interface ScanError {
  page: string;
  variant: string;
  message: string;
}

const ROOT_DIR: string = resolve(import.meta.dirname, '..');
const SITE_DIR: string = join(ROOT_DIR, 'target', 'site');
/** Invoker fixture projects, each `src/it/<name>/pom.xml`. */
const FIXTURE_SOURCE_DIR: string = join(ROOT_DIR, 'src', 'it');
/** Where `maven-invoker-plugin` renders them: `target/it/<name>/target/site/`. */
const FIXTURE_BUILD_DIR: string = join(ROOT_DIR, 'target', 'it');
/**
 * Flag that turns a fixture project without a rendered site into an error instead of a skip, so a
 * CI artifact that lost the fixture sites cannot pass by scanning only the self-site.
 */
const REQUIRE_FIXTURES_FLAG = 'require-fixtures';
const WCAG_TAGS: string[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Palettes that promise WCAG 2.2 AAA contrast (`--supa-wcag-level: "AAA"` in `_variables.scss`).
 * Their jobs also run axe's `color-contrast-enhanced` rule (1.4.6, 7:1 for text), the only AAA
 * rule enabled: the AA tags alone check 4.5:1, so a modus palette could drift below the 7:1 it
 * advertises with nothing failing.
 */
const AAA_PALETTES: ReadonlySet<Palette> = new Set<Palette>([
  'modus',
  'modus-tinted',
  'modus-deuteranopia',
  'modus-tritanopia'
]);
const AAA_CONTRAST_RULE = 'color-contrast-enhanced';
/**
 * Buttons whose visible text must appear in their `aria-label` (WCAG 2.5.3 Label in Name, Level
 * A), so a voice-control user can activate them by saying what they see. axe's own
 * `label-content-name-mismatch` rule runs under `wcag21a`, but it drops parenthesized text before
 * comparing, so it passed a color-scheme trigger that showed "Furo (AA)" and was named
 * "Accessible color scheme: Furo Default (AA)".
 */
const LABEL_IN_NAME_SELECTOR = '.supa-palette-btn';
const LABEL_IN_NAME_RULE = 'label-in-name';
/**
 * Reported for an `id` that more than one element on a page carries once the skin has run. A
 * fragment link and the TOC reach only the first of them, so a heading id or an anchor that
 * `prepareHeadings()` adds and that repeats another id sends links to the wrong place. axe's own
 * `duplicate-id` rule is deprecated and no longer runs under the WCAG tags.
 */
const UNIQUE_ID_RULE = 'unique-id';
const DESKTOP: Viewport = { width: 1440, height: 900 };
const MOBILE: Viewport = { width: 390, height: 844 };
/**
 * At least `lg` (1024px), so the sidebar is inline and the content header shows
 * the TOC trigger, but below `xl` (1280px), where the TOC is still a drawer.
 */
const TABLET: Viewport = { width: 1100, height: 900 };
/** A tablet in landscape: exactly `lg`, the narrowest width with the sidebar inline. */
const TABLET_LANDSCAPE: Viewport = { width: 1024, height: 768 };
const READY_TIMEOUT_MS = 30_000;
const STATE_TIMEOUT_MS = 5_000;
const CONCURRENCY = 4;
/**
 * Longest one scan job may run, from opening its context to the end of axe, before it is failed
 * as not scanned. The slowest job measured, `forced-colors-states` in Chromium, takes about 12 s
 * (Firefox's slowest about 6 s, WebKit's about 4 s), and a page that never gets ready spends up
 * to 60 s in the timed `goto` and ready waits before failing with its own message, so 120 s
 * catches only a job that is stuck.
 */
const JOB_DEADLINE_MS = 120_000;
/** Longest wait for a browser context or the browser to close before it is abandoned. */
const CLOSE_DEADLINE_MS = 10_000;

/**
 * Variants an interaction scenario runs in unless it lists its own: `furo` (AA)
 * in both polarities and `modus` dark, the strictest AAA palette on the darkest
 * surfaces, where overlay surfaces, shadows, and active-item tints differ most
 * from the page.
 */
const SCENARIO_VARIANTS: readonly Variant[] = [
  { palette: 'furo', polarity: 'light' },
  { palette: 'furo', polarity: 'dark' },
  { palette: 'modus', polarity: 'dark' }
];

/**
 * Forced-colors scenarios. Playwright's WebKit matches `(forced-colors: active)` but keeps the
 * author's colors, and Firefox's emulated palette is not a high-contrast theme (`Canvas` stays
 * white under a dark OS, and `Highlight` on `ButtonFace` is 2.43:1), so only Chromium's emulation
 * is a real forced-colors mode to measure.
 */
const FORCED_COLORS_ENGINES: EngineSupport = {
  supported: ['chromium'],
  reason:
    "WebKit matches (forced-colors: active) without forcing colors, and Firefox's emulated " +
    'palette is not a high-contrast theme'
};

/** The copy button's "Copied!" state, which needs clipboard permissions. */
const CLIPBOARD_ENGINES: EngineSupport = {
  supported: ['chromium'],
  reason: 'Firefox and WebKit do not grant the clipboard-read and clipboard-write permissions'
};

/**
 * Printing in `auto` mode under a dark OS. Firefox reports `prefers-color-scheme: light` under
 * print media, so the skin resolves the light polarity, which prints correctly but is not the
 * dark resolution the scenario asserts before printing.
 */
const AUTO_PRINT_ENGINES: EngineSupport = {
  supported: ['chromium'],
  reason: 'Firefox reports a light color-scheme preference under print media'
};

/**
 * Scenarios that move focus with Tab between links and buttons. WebKit's default keyboard mode
 * skips both on Tab, as macOS Safari does unless "Press Tab to highlight each item" is on.
 */
const TAB_ORDER_ENGINES: EngineSupport = {
  supported: ['chromium', 'firefox'],
  reason: "WebKit's default keyboard mode skips links and buttons on Tab"
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
 * Returns the first line of an error's message, dropping Playwright's call logs.
 *
 * @param error - Thrown value.
 * @returns First message line.
 */
function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.split('\n', 1)[0] ?? message;
}

/**
 * Waits until exactly one element matches `locator` and is visible.
 *
 * Playwright locators are strict, so two matches (two open menus, say) fail
 * as loudly as none.
 *
 * @param locator - Element that proves the state.
 * @param what - Human-readable description for the error message.
 */
async function expectVisible(locator: Locator, what: string): Promise<void> {
  try {
    await locator.waitFor({ state: 'visible', timeout: STATE_TIMEOUT_MS });
  } catch (error: unknown) {
    throw new Error(`expected ${what} to be visible [${String(locator)}]: ${firstLine(error)}`, {
      cause: error
    });
  }
}

/**
 * Waits until the element matched by `locator` has keyboard focus.
 *
 * @param page - Page under test.
 * @param locator - Element that should be focused.
 * @param what - Human-readable description for the error message.
 */
async function expectFocused(page: Page, locator: Locator, what: string): Promise<void> {
  try {
    await locator.and(page.locator(':focus')).waitFor({ state: 'attached', timeout: STATE_TIMEOUT_MS });
  } catch {
    const actual = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `<${el.tagName.toLowerCase()} class="${el.className}">` : 'nothing';
    });
    throw new Error(`expected focus on ${what} [${String(locator)}], but focus is on ${actual}`);
  }
}

/** Name the `components.html` documentation channels navigation gives itself in its `title`. */
const CHANNELS_NAME = 'Documentation channels';

/**
 * Throws unless the documentation channels navigation on `components.html` keeps the hooks the
 * recipe documents through Doxia, and the skin has turned them into ARIA. Doxia strips `aria-*`
 * and `data-*` from raw HTML but keeps `title` and `class` (R-10), so the served page must name
 * the navigation with `title` and mark the link to this page with `class="active"`, and the
 * hydrated page must expose that name, drop the `title` tooltip, and mark only that link
 * `aria-current="page"`.
 *
 * @param page - `components.html`, after the skin has initialized.
 */
async function expectChannelSemantics(page: Page): Promise<void> {
  const served = await page.evaluate(async () => {
    const html = await (await fetch(location.href)).text();
    const nav = new DOMParser().parseFromString(html, 'text/html').querySelector('.documentation-channels');
    return {
      title: nav?.getAttribute('title') ?? null,
      current: Array.from(nav?.querySelectorAll('a.active') ?? [], (a) => a.getAttribute('href')).join()
    };
  });
  if (served.title !== CHANNELS_NAME || served.current !== 'components.html') {
    throw new Error(`served channels navigation lost its title or current-link class: ${JSON.stringify(served)}`);
  }
  const named = await page.getByRole('navigation', { name: CHANNELS_NAME, exact: true }).count();
  const hydrated = await page.locator('.documentation-channels').evaluate((el) => ({
    title: el.getAttribute('title'),
    current: Array.from(el.querySelectorAll('[aria-current]'),
      (a) => `${a.getAttribute('href')}=${a.getAttribute('aria-current')}`).join()
  }));
  if (named !== 1 || hydrated.title !== null || hydrated.current !== 'components.html=page') {
    throw new Error(`channels navigation must be named ${JSON.stringify(CHANNELS_NAME)} and mark ` +
      `components.html current: ${JSON.stringify({ named, ...hydrated })}`);
  }
}

/**
 * Waits until an element's attribute has the expected value.
 *
 * @param locator - Element to inspect.
 * @param name - Attribute name.
 * @param value - Expected attribute value, or null when the attribute must be absent.
 * @param what - Human-readable description for the error message.
 */
async function expectAttribute(
  locator: Locator,
  name: string,
  value: string | null,
  what: string
): Promise<void> {
  const deadline = Date.now() + STATE_TIMEOUT_MS;
  let actual: string | null = null;
  while (Date.now() < deadline) {
    actual = await locator.getAttribute(name, { timeout: STATE_TIMEOUT_MS });
    if (actual === value) {
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  const expected = value === null ? `no ${name}` : `${name}="${value}"`;
  throw new Error(`expected ${what} to have ${expected} [${String(locator)}], got ${actual}`);
}

/**
 * Checks that the element matched by `locator` is under the mouse pointer (`:hover`).
 *
 * The pointer only moves when a scenario moves it, so one check after setup, and one after the
 * scan, proves the hovered state; no polling is needed.
 *
 * @param locator - Element that should be hovered.
 * @param what - Human-readable description for the error message.
 */
async function expectHovered(locator: Locator, what: string): Promise<void> {
  const hovered = await locator.evaluate((el) => el.matches(':hover'), undefined, {
    timeout: STATE_TIMEOUT_MS
  });
  if (!hovered) {
    throw new Error(`expected the pointer over ${what} [${String(locator)}]`);
  }
}

/**
 * Waits until the page has stopped scrolling and its CSS transitions have finished, so axe
 * measures settled colors.
 *
 * A state change can recolor text at once while its background still fades (the search result
 * that loses `.is-active`), and axe would otherwise measure whatever mix the fade had reached.
 * A smooth scroll still running after a scenario's setup carries content under the resting
 * pointer, and each `:hover` it gives or takes starts a transition after an earlier wait has
 * returned (a code block's language label fading out). So the wait repeats until two frames
 * pass with no scroll and no transition running before or after them.
 * Animations are not awaited: a spinner runs forever, and the skin's own animations end hidden.
 *
 * @param page - Page under test.
 */
async function settleTransitions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    /** @returns The page's running CSS transitions. */
    const running = (): Animation[] =>
      document.getAnimations().filter((animation) => animation instanceof CSSTransition);
    /** @returns A promise that resolves at the next animation frame. */
    const nextFrame = (): Promise<void> =>
      new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    let scrolled: boolean;
    /** Records that the document or a nested scroller moved. */
    const onScroll = (): void => {
      scrolled = true;
    };
    // Element scroll events do not bubble, so listen in the capture phase.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    try {
      for (;;) {
        scrolled = false;
        const transitions = running();
        // A transition interrupted by another state change rejects `finished`; that one is settled too.
        await Promise.all(transitions.map((transition) => transition.finished.catch(() => undefined)));
        // The hover a scroll moves restyles in the frame after it, and its transition starts there.
        await nextFrame();
        await nextFrame();
        if (!scrolled && transitions.length === 0 && running().length === 0) {
          return;
        }
      }
    } finally {
      document.removeEventListener('scroll', onScroll, { capture: true });
    }
  });
}

/**
 * Checks WCAG 2.5.3 Label in Name on every visible `LABEL_IN_NAME_SELECTOR` button: its
 * accessible name must contain its visible text, compared case-insensitively with whitespace
 * collapsed, as Playwright's `getByRole` matches a string `name`.
 *
 * @param page - Page in the job's state.
 * @param job - Scan job, for the report and to know whether the content header is shown.
 * @returns One finding per visible button whose accessible name lacks its visible text.
 */
async function checkLabelInName(page: Page, job: ScanJob): Promise<Finding[]> {
  const findings: Finding[] = [];
  const controls = await page.locator(LABEL_IN_NAME_SELECTOR).filter({ visible: true }).all();
  // The content header shows the trigger at every desktop page load, so finding none there means
  // the selector broke, and the check would otherwise pass without checking anything. A fixture
  // may turn the picker off (<colorSchemeSelector>false</colorSchemeSelector>), which drops its
  // `.supa-palette-picker` container too; the self-site never does.
  const pickerOff = job.site !== '' && (await page.locator('.supa-palette-picker').count()) === 0;
  if (controls.length === 0 && !job.scenario && job.width >= DESKTOP.width && !pickerOff) {
    throw new Error(`no visible ${LABEL_IN_NAME_SELECTOR} to check for WCAG 2.5.3 label in name.`);
  }
  for (const [index, control] of controls.entries()) {
    const text = (await control.innerText()).replace(/\s+/g, ' ').trim();
    if (!text || (await control.and(page.getByRole('button', { name: text })).count()) > 0) {
      continue;
    }
    const name = await control.getAttribute('aria-label');
    findings.push({
      page: pageLabel(job),
      variant: variantLabel(job),
      ruleId: LABEL_IN_NAME_RULE,
      impact: 'serious',
      target: `${LABEL_IN_NAME_SELECTOR} >> nth=${index}`,
      summary:
        `Fix the following: the accessible name (aria-label ${JSON.stringify(name)}) does not ` +
        `contain the visible text ${JSON.stringify(text)} (WCAG 2.5.3 Label in Name)`,
      html: (await control.evaluate((el) => el.outerHTML)).replace(/\s+/g, ' ').trim().slice(0, 160),
      helpUrl: 'https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html'
    });
  }
  return findings;
}

/**
 * Checks that no two elements on the page share an `id` (`UNIQUE_ID_RULE`).
 *
 * @param page - Page in the job's state.
 * @param job - Scan job, for the report.
 * @returns One finding per repeated id.
 */
async function checkUniqueIds(page: Page, job: ScanJob): Promise<Finding[]> {
  const repeated = await page.evaluate(() => {
    const counts = new Map<string, number>();
    for (const el of Array.from(document.querySelectorAll('[id]'))) {
      if (el.id) {
        counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
      }
    }
    return [...counts].filter(([, count]) => count > 1);
  });
  return repeated.map(([id, count]) => ({
    page: pageLabel(job),
    variant: variantLabel(job),
    ruleId: UNIQUE_ID_RULE,
    impact: 'serious',
    target: `[id=${JSON.stringify(id)}]`,
    summary: `Fix the following: ${count} elements have the id ${JSON.stringify(id)}`,
    html: '',
    helpUrl: 'https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute'
  }));
}

/**
 * Throws unless following a link moved the page to the heading after `linkId`, to where a link to
 * the heading's own id puts it. The page scrolls smoothly, so it is measured until it settles.
 *
 * @param page - Page under test, after the link was followed.
 * @param linkId - Id the link names: an empty anchor before the heading.
 * @param headingId - Id of the heading the anchor stands for.
 */
async function expectLandedOnHeading(page: Page, linkId: string, headingId: string): Promise<void> {
  const deadline = Date.now() + STATE_TIMEOUT_MS;
  let problems: string[];
  do {
    problems = await page.evaluate(
      ([link, id, tolerance]: [string, string, number]) => {
        const found: string[] = [];
        if (decodeURIComponent(window.location.hash.slice(1)) !== link) {
          found.push(`the URL fragment is "${window.location.hash}"`);
        }
        // The anchor stands before the heading, or before Doxia's own anchor for it
        const target = document.querySelector(':target');
        let next = target?.nextElementSibling;
        while (next && next.tagName === 'A' && !next.textContent?.trim()) {
          next = next.nextElementSibling;
        }
        if (target?.id !== link || target.tagName !== 'A' || next?.id !== id) {
          const named = target ? `<${target.tagName.toLowerCase()} id="${target.id}">` : 'no element';
          found.push(`the link targets ${named}`);
        }
        const heading = document.getElementById(id);
        // A link to the heading's own id puts its top below the scroll padding and its scroll margin
        const landing =
          (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
          (heading ? Number.parseFloat(getComputedStyle(heading).scrollMarginTop) || 0 : 0);
        const top = heading?.getBoundingClientRect().top;
        if (top === undefined || Math.abs(top - landing) > tolerance) {
          found.push(`the heading is ${top ?? '?'}px from the top instead of ${landing}px`);
        }
        return found;
      },
      [linkId, headingId, LANDING_TOLERANCE_PX] as [string, string, number]
    );
    if (problems.length === 0) {
      return;
    }
    await page.waitForTimeout(100);
  } while (Date.now() < deadline);
  throw new Error(`expected to land on #${headingId} through #${linkId}, but ${problems.join('; ')}`);
}

/**
 * Opens the sidebar drawer from its mobile-header toggle and waits until it is open.
 *
 * @param page - Page under test at a viewport below `lg`.
 */
async function openSidebarDrawer(page: Page): Promise<void> {
  await page.locator('.supa-mobile-header [data-bs-target="#supaSidebarDrawer"]').click();
  await expectVisible(page.locator('dialog#supaSidebarDrawer[open]'), 'the sidebar drawer');
}

/** Which picker a menu scenario opens: `#supaPalettePicker` or `#supaThemeToggle`. */
type MenuKind = 'palette' | 'theme';

/** Where `site.vm` renders a color-scheme or theme menu trigger. */
interface MenuPlacement {
  /** Scenario name prefix, such as `drawer-`. */
  prefix: string;
  /** Selector of the region that holds this placement's triggers. */
  region: string;
  /** Viewport at which the placement is visible. */
  viewport: Viewport;
  /** Pickers rendered as a `.menu` here. */
  kinds: readonly MenuKind[];
  /** Opens whatever contains the trigger (the sidebar drawer) before the menu. */
  reveal?: (page: Page) => Promise<void>;
}

/**
 * Builds the scenario that opens one color-scheme or theme menu from the keyboard.
 *
 * @param placement - Where the trigger lives.
 * @param kind - Which picker to open.
 * @returns The scenario.
 */
function menuScenario(placement: MenuPlacement, kind: MenuKind): InteractionScenario {
  const trigger = `${placement.region} ${kind === 'palette' ? '.supa-palette-btn' : '.supa-theme-toggle-btn'}`;
  const menu = kind === 'palette' ? '.supa-palette-menu' : '.supa-theme-menu';
  const what = kind === 'palette' ? 'color-scheme' : 'theme';
  return {
    name: `${placement.prefix}${kind}-menu`,
    page: kind === 'palette' && placement.prefix === '' ? 'configuration.html' : 'index.html',
    variants: kind === 'palette' && placement.prefix === '' ? ALL_VARIANTS : undefined,
    // expectPaletteFocus Tabs through the palette cards and menu items.
    engines: kind === 'palette' && placement.prefix === '' ? TAB_ORDER_ENGINES : undefined,
    viewport: placement.viewport,
    setup: async (page) => {
      await placement.reveal?.(page);
      await page.locator(trigger).focus();
      // ArrowDown is the keyboard path: it opens the menu and focuses the first option.
      await page.keyboard.press('ArrowDown');
    },
    assertState: async (page) => {
      if (kind === 'palette' && placement.prefix === '') {
        await expectPaletteFocus(page);
      }
      if (placement.reveal) {
        await expectVisible(page.locator(`${placement.region}[open]`), `the open ${placement.region}`);
      }
      await expectAttribute(page.locator(trigger), 'aria-expanded', 'true', `the ${what} trigger`);
      // Strict locators: exactly one menu of this kind is open, and it is this placement's.
      await expectVisible(page.locator(`${menu}.show`), `the single open ${what} menu`);
      await expectVisible(page.locator(`${placement.region} ${menu}.show`), `this placement's ${what} menu`);
      await expectFocused(page, page.locator(`${placement.region} ${menu}.show .menu-item`), `a ${what} option`);
    }
  };
}

/**
 * Every place `site.vm` renders a picker as a `.menu`, each with its own
 * popover placement and surroundings. The mobile header shows its color-scheme
 * menu only from 768px up, hence the tablet-portrait viewport. The sidebar
 * drawer's color-scheme control is a native `<select>` (`#supaPaletteSelect`)
 * whose open list the browser draws outside the page, so axe has nothing to
 * scan there beyond the closed control in `sidebar-drawer`.
 */
const MENU_PLACEMENTS: readonly MenuPlacement[] = [
  { prefix: '', region: '.supa-content-header', viewport: DESKTOP, kinds: ['palette', 'theme'] },
  {
    prefix: 'mobile-header-',
    region: '.supa-mobile-header',
    viewport: { width: 820, height: 1180 },
    kinds: ['palette', 'theme']
  },
  {
    prefix: 'drawer-',
    region: 'dialog#supaSidebarDrawer',
    viewport: MOBILE,
    kinds: ['theme'],
    reveal: openSidebarDrawer
  }
];

/**
 * Variants a hovered component is scanned in: `furo` (AA) in both polarities, and the `modus`
 * and `modus-tinted` polarities where Bootstrap 6's derived hover fills once missed 7:1 on the
 * components page (accent text on a light hovered chip, white text on dark hovered unthemed chips,
 * and darkened text on the tinted night-sky surfaces).
 */
const HOVER_VARIANTS: readonly Variant[] = [
  { palette: 'furo', polarity: 'light' },
  { palette: 'furo', polarity: 'dark' },
  { palette: 'modus', polarity: 'light' },
  { palette: 'modus', polarity: 'dark' },
  { palette: 'modus-tinted', polarity: 'dark' }
];

/**
 * Builds the scenario that hovers one Bootstrap 6 component on `components.html`.
 *
 * Only the hovered component is scanned: the rest of the page is the load-time scan's, and
 * keeping each hover job to one element keeps the extra variants cheap.
 *
 * @param name - Scenario name.
 * @param selector - CSS selector of the component; the first match is hovered.
 * @param what - Human-readable description for error messages.
 * @returns The scenario.
 */
function hoverScenario(name: string, selector: string, what: string): InteractionScenario {
  return {
    name,
    page: 'components.html',
    viewport: DESKTOP,
    variants: HOVER_VARIANTS,
    scope: [selector],
    setup: async (page) => {
      await page.locator(selector).first().hover();
    },
    assertState: async (page) => {
      await expectVisible(page.locator(selector).first(), what);
      await expectHovered(page.locator(selector).first(), what);
    }
  };
}

/**
 * Printable area of an A4 page inside Chrome's default 1 cm margins, at 96 CSS pixels per inch.
 * Browsers lay a page out at its paper width when printing, which is below the skin's `lg`
 * breakpoint, where the screen layout shows the mobile header rather than the inline sidebar.
 */
const PRINT_PAGE: Viewport = { width: 718, height: 1047 };

/**
 * Page furniture that a printed page leaves out: the regions of `site.vm` around the article, the
 * controls inside them, and the controls the enhancers add to the article. Every selector must
 * match on the scanned page, so a renamed class fails the run instead of passing unseen.
 */
const PRINT_HIDDEN: readonly string[] = [
  '.supa-skip-link',
  '.supa-announcement',
  '.supa-mobile-header',
  '.supa-sidebar-column',
  '.supa-search-trigger',
  '.supa-content-header',
  '.supa-palette-picker',
  '.supa-theme-toggle',
  '.supa-content-header a[aria-label="Edit this page"]',
  '.supa-toc-column',
  '.supa-related-pages',
  '.supa-back-to-top',
  '.supa-built-with',
  '#supa-main-content .supa-copy-btn',
  '#supa-main-content .supa-headerlink'
];

/**
 * Drops backgrounds the way a browser prints them, which print media emulation alone does not.
 *
 * Unless the reader opts in (Chrome's "Background graphics", Firefox's "Print backgrounds"), a
 * printout keeps only the backgrounds of `print-color-adjust: exact` elements. Axe then measures
 * text against the white paper: light text from a dark polarity, unreadable on paper, fails there
 * instead of passing on its screen background. CSS cannot select by computed value, so the
 * elements without `exact` are marked first.
 *
 * @param page - Page under test, emulating print media.
 */
async function dropPrintBackgrounds(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll('*'))) {
      if (getComputedStyle(el).getPropertyValue('print-color-adjust') !== 'exact') {
        el.setAttribute('data-a11y-print-economy', '');
      }
    }
  });
  const economy = ['', '::before', '::after'].map((pseudo) => `[data-a11y-print-economy]${pseudo}`);
  await page.addStyleTag({
    content: `${economy.join(', ')} { background-color: transparent !important; background-image: none !important; }`
  });
}

/**
 * Throws unless the page lays out for print: `<html>` takes the light polarity's color scheme and
 * shadow strength, the furniture is not rendered, the article spans the page, nothing is fixed or
 * sticky, and no code block or table scrolls (clips) its content.
 *
 * @param page - Page under test, emulating print media.
 */
async function expectPrintLayout(page: Page): Promise<void> {
  const problems = await page.evaluate((hidden: readonly string[]) => {
    const found: string[] = [];
    const describe = (el: Element): string => `<${el.tagName.toLowerCase()} class="${el.className}">`;
    if (!window.matchMedia('print').matches) {
      found.push('print media is not emulated');
    }
    // Every token resolves at <html> and is inherited from there, so its scheme decides the polarity.
    const scheme = getComputedStyle(document.documentElement).getPropertyValue('color-scheme');
    if (scheme !== 'light') {
      found.push(`<html> has color-scheme "${scheme}" instead of the light polarity`);
    }
    // Bootstrap deepens dark-polarity shadows with this number, which `color-scheme` does not switch.
    const strength = getComputedStyle(document.documentElement).getPropertyValue('--shadow-strength').trim();
    if (strength !== '1') {
      found.push(`<html> has --shadow-strength ${strength} instead of the light polarity's 1`);
    }
    for (const selector of hidden) {
      const matches = Array.from(document.querySelectorAll(selector));
      if (matches.length === 0) {
        found.push(`nothing matches ${selector}`);
      } else if (matches.some((el) => el.checkVisibility())) {
        found.push(`${selector} is rendered`);
      }
    }
    // Measured against <body>, not documentElement.clientWidth: on Linux, headless Chromium lays the
    // page out 15px (a classic scrollbar) narrower than clientWidth reports, and every block from
    // <html> down shares that width. Print zeroes <body>'s margin and padding, so the article must
    // fill it.
    const article = document.querySelector('#supa-main-content');
    const page = document.body.getBoundingClientRect();
    const box = article?.getBoundingClientRect();
    if (!article || !box || box.left > page.left + 1 || box.width < page.width - 1) {
      found.push(`the article spans ${box?.left ?? '?'}-${box?.right ?? '?'} of a ${page.left}-${page.right}px page`);
    }
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const { position } = getComputedStyle(el);
      if ((position === 'fixed' || position === 'sticky') && el.checkVisibility()) {
        found.push(`${describe(el)} is ${position}`);
      }
    }
    for (const el of Array.from(article?.querySelectorAll('pre, [class*="table-responsive"]') ?? [])) {
      if (el.checkVisibility() && el.scrollWidth > el.clientWidth + 1) {
        found.push(`${describe(el)} clips ${el.scrollWidth - el.clientWidth}px`);
      }
    }
    return found;
  }, PRINT_HIDDEN);
  if (problems.length > 0) {
    throw new Error(`expected a print layout, but ${problems.join('; ')}`);
  }
}

/**
 * Builds the scenario that prints a content-rich page: print media emulated, and backgrounds
 * dropped as a browser drops them.
 *
 * @param page - Top-level HTML file to print.
 * @param viewport - Layout width: the paper's printable width, or a wide window.
 * @param suffix - Name suffix that tells apart scenarios of one page.
 * @returns The scenario.
 */
function printScenario(page: string, viewport: Viewport, suffix = ''): InteractionScenario {
  return {
    name: `print-${page.replace(/\.html$/, '')}${suffix}`,
    page,
    viewport,
    setup: async (p) => {
      await p.emulateMedia({ media: 'print' });
      await dropPrintBackgrounds(p);
    },
    assertState: expectPrintLayout
  };
}

/**
 * Builds the scenario that prints a page in the default `auto` theme mode under a dark OS
 * preference: the dark variants' context sets `colorScheme: 'dark'`.
 *
 * `scan()` seeds an explicit polarity, which puts `data-bs-theme` on `<html>`. In `auto` mode,
 * the skin's default, theme.ts removes that attribute, and Bootstrap's
 * `@media (prefers-color-scheme: dark) { :root { ... } }` rule selects the dark polarity instead,
 * which a print rule matching only `[data-bs-theme]` never overrides.
 *
 * @param page - Top-level HTML file to print.
 * @returns The scenario.
 */
function autoPrintScenario(page: string): InteractionScenario {
  const printed = printScenario(page, PRINT_PAGE, '-auto');
  const root = (p: Page): Locator => p.locator('html');
  return {
    ...printed,
    variants: [
      { palette: 'furo', polarity: 'dark' },
      { palette: 'modus', polarity: 'dark' }
    ],
    engines: AUTO_PRINT_ENGINES,
    setup: async (p) => {
      // The theme menu's "Auto" option runs theme.ts's own switch. It is hidden at the paper's
      // width, so the click is dispatched rather than performed.
      await p.locator('[data-supa-theme-option="auto"]').first().dispatchEvent('click');
      await printed.setup(p);
    },
    assertState: async (p) => {
      await expectAttribute(root(p), 'data-supa-theme-mode', 'auto', '<html>');
      await expectAttribute(root(p), 'data-bs-theme', null, '<html>');
      await expectAttribute(root(p), 'data-supa-resolved-theme', 'dark', '<html>');
      await printed.assertState(p);
    }
  };
}

/** A component state that only a fill shows, which `_print.scss` keeps on paper. */
interface PrintedFill {
  /** Elements in the state, inside the article; at least one must match. */
  selector: string;
  /**
   * What paints the fill: the element (`''`) or a pseudo-element. `null` stands for a range
   * input's `::-webkit-slider-*` track and thumb, whose styles Chromium does not compute; they
   * inherit `print-color-adjust` from the input, so only that is checked.
   */
  paint: string | null;
  /**
   * Markup of the state, added to the article only while it is measured, for a state the
   * showcase does not render: it has no radio, and an active item of its list group would put
   * that item's secondary text on the fill.
   */
  probe?: string;
}

/**
 * The component states on `components.html` that a print without background graphics would lose
 * with their fill: white text on a dropped fill prints white on white (the current page, the
 * active pill), and a mark or a meter drawn by a fill vanishes. `_print.scss` gives each
 * `print-color-adjust: exact`, which keeps the light polarity's fill. Tabs and underlines, drawn
 * with borders, print without it. Every selector must match, so a renamed class or a changed
 * demo fails the run instead of passing unseen.
 */
const PRINTED_FILLS: readonly PrintedFill[] = [
  { selector: '.nav-pills .nav-link.active', paint: '' },
  { selector: '.page-item.active > .page-link', paint: '' },
  { selector: '.page-item.disabled > .page-link', paint: '' },
  { selector: '.breadcrumb-divider', paint: '::before' },
  { selector: '.switch:has(input:checked)', paint: '' },
  { selector: '.check:checked', paint: '' },
  { selector: '.radio:checked', paint: '', probe: '<input class="radio" type="radio" checked>' },
  {
    selector: '.list-group-item.active',
    paint: '',
    probe: '<div class="list-group"><span class="list-group-item active">Item</span></div>'
  },
  ...['header', 'footer'].map((cap): PrintedFill => ({
    selector: `.card.theme-primary .card-${cap}`,
    paint: '',
    probe: `<div class="card theme-primary"><div class="card-${cap}">Printed cap</div></div>`
  })),
  { selector: '.form-range-input', paint: null },
  { selector: '.strength-segment.active', paint: '' },
  { selector: '.placeholder', paint: '' },
  { selector: '.supa-playground-pill.active', paint: '' }
];

/**
 * Throws unless every `PRINTED_FILLS` state computes `print-color-adjust: exact` and still has a
 * background after `dropPrintBackgrounds`, and an in-flow toast container still prints.
 *
 * @param page - Page under test, emulating print media with backgrounds dropped.
 */
async function expectPrintedFills(page: Page): Promise<void> {
  const problems = await page.evaluate((fills: readonly PrintedFill[]) => {
    const found = new Set<string>();
    const article = document.querySelector('#supa-main-content');
    // Toasts shown in the flow of the article are content: only floating containers are hidden.
    const inFlow = document.createElement('div');
    inFlow.className = 'toast-container position-static';
    article?.append(inFlow);
    if (getComputedStyle(inFlow).display === 'none') {
      found.add('a .toast-container.position-static in the article is not printed');
    }
    inFlow.remove();
    for (const { selector, paint, probe } of fills) {
      const host = document.createElement('div');
      if (probe !== undefined) {
        host.innerHTML = probe;
        article?.append(host);
      }
      const matches = Array.from(article?.querySelectorAll(selector) ?? []);
      if (matches.length === 0) {
        found.add(`nothing matches ${selector}`);
      }
      for (const el of matches) {
        const style = getComputedStyle(el, paint || null);
        // Chromium writes a transparent color with a zero alpha last: `rgba(0, 0, 0, 0)`, `oklch(… / 0)`.
        const bare = style.backgroundImage === 'none' && /^rgba\(.*, 0\)$|\/ 0\)$/.test(style.backgroundColor);
        if (getComputedStyle(el).getPropertyValue('print-color-adjust') !== 'exact') {
          found.add(`${selector} prints without its fill (print-color-adjust is not exact)`);
        } else if (paint !== null && bare) {
          found.add(`${selector}${paint} has no background on paper`);
        }
      }
      host.remove();
    }
    return [...found];
  }, PRINTED_FILLS);
  if (problems.length > 0) {
    throw new Error(`expected component states to keep their fills on paper, but ${problems.join('; ')}`);
  }
}

/**
 * Builds the scenario that prints `components.html` and checks that its `PRINTED_FILLS` states
 * keep their fills, on top of the print layout.
 *
 * @returns The scenario.
 */
function printComponentsScenario(): InteractionScenario {
  const printed = printScenario('components.html', PRINT_PAGE);
  return {
    ...printed,
    variants: ALL_VARIANTS,
    assertState: async (p) => {
      await printed.assertState(p);
      await expectPrintedFills(p);
      await p.locator('#supa-main-content').evaluate((el, html) => el.insertAdjacentHTML('beforeend', html), INLINE_CODE_FILLS);
      await expectInlineCodeOnFills(p);
      await p.locator('#supaInlineCodeFills').evaluate((el) => el.remove());
      if (await p.locator('.documentation-channels').isVisible()) {
        throw new Error('Documentation navigation is rendered in print');
      }
    }
  };
}

/** Every palette in both polarities, for a widget that draws its own colors. */
const ALL_VARIANTS: readonly Variant[] = PALETTES.flatMap((palette) =>
  (['light', 'dark'] as const).map((polarity): Variant => ({ palette, polarity }))
);

/** The Datepicker field on `components.html`, whose value is 2026-10-20. */
const DATEPICKER_FIELD = '.supa-article [data-bs-toggle="datepicker"]';

/** The shown calendar that vanilla-calendar-pro appends to `<body>` for a field. */
const OPEN_CALENDAR = '[data-vc="calendar"][data-vc-input]:not([data-vc-calendar-hidden])';

/** The Datepicker plugin's static methods, on `window.bootstrap` once its chunk has loaded. */
interface DatepickerStatics {
  getInstance: (element: Element) => { dispose: () => void } | null;
  getOrCreateInstance: (element: Element, config: Record<string, unknown>) => unknown;
}

/** The page the deep-link scenarios open from a link to one of its headings. */
const DEEP_LINK_PAGE = 'kitchen-sink.html';

/**
 * A heading far down `DEEP_LINK_PAGE`. Above it, the Bootstrap component examples, the Mermaid
 * diagram, and the KaTeX math reshape the page after the skin first scrolls to the heading.
 */
const DEEP_LINK_TARGET = 'definition-lists';

/**
 * The page's first heading. Nothing above it reshapes, so where a link to it lands is the gap
 * under the headers that a link to any heading should get.
 */
const DEEP_LINK_REFERENCE = 'admonitions';

/** How far a heading may land from the reference gap, for sub-pixel layout. */
const LANDING_TOLERANCE_PX = 2;

/** How far the reader scrolls back up before the page is ready in `deep-link-reader-scrolled`. */
const READER_SCROLL_PX = 600;

/** How far the reader scrolls up from the heading before reloading in `deep-link-reader-reloaded`. */
const RELOAD_SCROLL_PX = 1500;

/**
 * Reloading a page at a fragment after scrolling away from it. WebKit scrolls to the fragment again
 * on a reload whose load event a subresource holds, even on a page with no skin markup, CSS, or
 * script whose HTML holds the target's `id` (register entry R-53), so it cannot keep the reader's
 * place on the kitchen sink.
 */
const RELOAD_ENGINES: EngineSupport = {
  supported: ['chromium', 'firefox'],
  reason:
    'WebKit scrolls to the fragment again on a reload whose load event a subresource holds, ' +
    'even on a plain page with a static id and no skin (R-53)'
};

/**
 * Animation frames the scroll position must hold before a landing counts as finished. A smooth
 * scroll moves it on every frame.
 */
const SCROLL_IDLE_FRAMES = 30;

/**
 * The CDN that `optional.ts` loads Mermaid and KaTeX from. The page is not ready until they have
 * run, and they reshape the page above `DEEP_LINK_TARGET` when they do.
 */
const CDN_REQUEST = /^https:\/\/cdn\.jsdelivr\.net\//;

/**
 * Where each deep-link job's heading should be measured from: the reference gap, or where the
 * heading landed before the reader scrolled. Keyed by page, because jobs run concurrently.
 */
const deepLinkExpectations = new WeakMap<Page, number>();

/**
 * Opens `DEEP_LINK_PAGE` at a fragment as a new document, as a link from another page does. The
 * query string, which differs per fragment, makes it a new document: a URL that differs from the
 * open one only in its fragment would scroll the open page instead.
 *
 * @param page - Page under test.
 * @param fragment - Heading id, without `#`.
 * @param waitUntil - Load state to wait for.
 */
async function openAtFragment(
  page: Page,
  fragment: string,
  waitUntil: 'load' | 'domcontentloaded' = 'load'
): Promise<void> {
  const url = new URL(`${DEEP_LINK_PAGE}?deep-link=${fragment}#${fragment}`, page.url());
  await page.goto(url.href, { waitUntil, timeout: READY_TIMEOUT_MS });
}

/**
 * Waits until the scroll position has held for `SCROLL_IDLE_FRAMES` frames, so a smooth scroll
 * has ended. Gives up after 10 seconds, leaving the caller's assertion to report the position.
 *
 * @param page - Page under test.
 */
async function waitForScrollIdle(page: Page): Promise<void> {
  await page.evaluate(
    (frames: number) =>
      new Promise<void>((resolveIdle) => {
        const deadline = performance.now() + 10_000;
        let last = window.scrollY;
        let still = 0;
        const tick = (): void => {
          still = window.scrollY === last ? still + 1 : 0;
          last = window.scrollY;
          if (still >= frames || performance.now() > deadline) {
            resolveIdle();
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }),
    SCROLL_IDLE_FRAMES
  );
}

/**
 * Waits until the page has done all of its own scrolling to the URL fragment: the skin is ready,
 * the load event has fired, the fonts are loaded, and the scroll position has stopped moving.
 * These are the conditions under which the skin scrolls to the fragment a second time.
 *
 * @param page - Page under test.
 */
async function waitForLanding(page: Page): Promise<void> {
  await page.waitForSelector('html[data-supa-ready="true"]', {
    state: 'attached',
    timeout: READY_TIMEOUT_MS
  });
  await page.waitForFunction(() => document.readyState === 'complete', undefined, {
    timeout: READY_TIMEOUT_MS
  });
  await page.evaluate(async () => {
    // Lay the page out so fonts that a late stylesheet (KaTeX's) uses have started loading.
    document.body.getBoundingClientRect();
    await document.fonts.ready;
  });
  await waitForScrollIdle(page);
}

/**
 * Holds the page's CDN requests until the returned function is called. Routing also turns off the
 * HTTP cache, so every later load fetches Mermaid and KaTeX again, as a first visit does.
 *
 * @param page - Page under test.
 * @returns Function that lets the held requests through.
 */
async function holdCdnRequests(page: Page): Promise<() => void> {
  let release = (): void => undefined;
  const held = new Promise<void>((resolveHeld) => {
    release = resolveHeld;
  });
  await page.route(CDN_REQUEST, async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

/**
 * Opens `DEEP_LINK_PAGE` at a fragment as a first visit does, and waits until it has landed. Mermaid
 * and KaTeX arrive only after the skin has begun scrolling to the fragment, as on any network
 * slower than a frame. With a warm cache they would reshape the page before the scroll began, and
 * hide the problem.
 *
 * @param page - Page under test.
 * @param fragment - Heading id, without `#`.
 */
async function openDeepLink(page: Page, fragment: string): Promise<void> {
  const release = await holdCdnRequests(page);
  try {
    await openAtFragment(page, fragment, 'domcontentloaded');
    try {
      await page.waitForFunction(() => window.scrollY > 0, undefined, { timeout: STATE_TIMEOUT_MS });
    } catch (error: unknown) {
      throw new Error(`the skin did not scroll to #${fragment} when the page opened`, { cause: error });
    }
  } finally {
    release();
  }
  await waitForLanding(page);
}

/**
 * Measures how far below the top of the viewport an element is.
 *
 * @param page - Page under test.
 * @param id - Element id.
 * @returns The element's top edge in CSS pixels, relative to the viewport.
 */
async function topOf(page: Page, id: string): Promise<number> {
  const top = await page.evaluate(
    (elementId: string) => document.getElementById(elementId)?.getBoundingClientRect().top ?? null,
    id
  );
  if (top === null) {
    throw new Error(`expected an element with id "${id}" on ${DEEP_LINK_PAGE}`);
  }
  return Math.round(top);
}

/**
 * Builds the scenario that opens `DEEP_LINK_PAGE` from a link to a heading far down it. The heading
 * must land with the gap under the headers that a link to the page's first heading gets, though
 * code highlighting, the widget chunks, Mermaid, and KaTeX reshape the page above it after the
 * skin first scrolls to it. `<html>` must scroll smoothly only when the reader allows motion. The
 * scan sees the page scrolled deep, with the "Back to top" button shown and a deep TOC entry
 * active.
 *
 * @param name - Scenario name.
 * @param viewport - Viewport.
 * @param motion - The reader's motion preference: the run's `reduce`, or `no-preference`, under
 *     which the scrolls to the heading are smooth.
 * @returns The scenario.
 */
function deepLinkScenario(
  name: string,
  viewport: Viewport,
  motion: 'reduce' | 'no-preference'
): InteractionScenario {
  return {
    name,
    page: DEEP_LINK_PAGE,
    viewport,
    // The default variants cover the deep-scrolled state's colors; this one tests only scrolling.
    ...(motion === 'reduce' ? {} : { variants: [{ palette: 'furo', polarity: 'light' }] }),
    setup: async (page) => {
      await page.emulateMedia({ reducedMotion: motion });
      await openDeepLink(page, DEEP_LINK_REFERENCE);
      deepLinkExpectations.set(page, await topOf(page, DEEP_LINK_REFERENCE));
      await openDeepLink(page, DEEP_LINK_TARGET);
    },
    assertState: async (page) => {
      const gap = deepLinkExpectations.get(page);
      if (gap === undefined) {
        throw new Error(`setup did not measure where #${DEEP_LINK_REFERENCE} lands`);
      }
      const problems: string[] = [];
      const top = await topOf(page, DEEP_LINK_TARGET);
      if (Math.abs(top - gap) > LANDING_TOLERANCE_PX) {
        problems.push(
          `#${DEEP_LINK_TARGET} landed ${top}px from the top, ${top - gap}px off the ${gap}px ` +
            `that #${DEEP_LINK_REFERENCE} lands at`
        );
      }
      const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
      const expected = motion === 'reduce' ? 'auto' : 'smooth';
      if (behavior !== expected) {
        problems.push(`<html> has scroll-behavior "${behavior}" under prefers-reduced-motion: ${motion}`);
      }
      if (problems.length > 0) {
        throw new Error(`expected the deep link to land under the headers: ${problems.join('; ')}`);
      }
    }
  };
}

/** Color and pixel math that `installColorHelper` gives every page, for `page.evaluate` callbacks. */
interface ColorHelper {
  /** Converts a browser-resolved CSS color to straight sRGB and alpha, each channel in [0, 1]. */
  rgba: (color: string) => number[];
  /** Composites a color over an opaque one. */
  over: (top: number[], bottom: number[]) => number[];
  /** Resolves the opaque fill under an element through its translucent ancestors, over white. */
  background: (element: Element | null) => number[];
  /** Computes the WCAG contrast ratio of two opaque colors, channels in [0, 1]. */
  contrast: (first: number[], second: number[]) => number;
  /** Looks up the `WCAG_MINIMUMS` entry for the page palette's `--supa-wcag-level` and a role. */
  minimumFor: (role: ContrastRole) => number;
  /** Resolves a CSS system color, such as `CanvasText`, to its computed color. */
  system: (name: string) => string;
  /** Decodes a base64 PNG screenshot into its pixels. */
  decode: (base64: string) => Promise<ImageData>;
}

/** The part of the page's `window` that `installColorHelper` adds. */
type ColorWindow = { a11yColor: ColorHelper };

/**
 * Installs one `ColorHelper` as `window.a11yColor` in every page of a scan's context, before the
 * page's own scripts run. Playwright sends this function's source into the page, so it closes over
 * nothing and takes the contrast thresholds as an argument. A canvas converts the browser's
 * resolved colors, in any color space, to the sRGB bytes a screenshot holds.
 *
 * @param minimums - `WCAG_MINIMUMS` from `contrast-audit.ts`, which the SCSS audit also uses.
 */
function installColorHelper(minimums: typeof WCAG_MINIMUMS): void {
  let context: CanvasRenderingContext2D | null = null;
  /**
   * Converts a browser-resolved color to straight sRGB and alpha.
   * @param color - Computed CSS color.
   * @returns RGBA channels in [0, 1].
   */
  function rgba(color: string): number[] {
    if (!context) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('Canvas color conversion is unavailable');
      }
    }
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data, (channel) => channel / 255);
  }
  /**
   * Composites a color over an opaque background.
   * @param top - Foreground RGBA.
   * @param bottom - Opaque background RGBA.
   * @returns Composited opaque RGBA.
   */
  function over(top: number[], bottom: number[]): number[] {
    return [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
  }
  /**
   * Resolves the actual fill through all transparent ancestors.
   * @param element - Element whose background is needed.
   * @returns Opaque composited sRGB background.
   */
  function background(element: Element | null): number[] {
    if (!element) {
      return [1, 1, 1, 1];
    }
    return over(rgba(getComputedStyle(element).backgroundColor), background(element.parentElement));
  }
  /**
   * Calculates WCAG relative luminance.
   * @param color - Opaque sRGB color.
   * @returns Relative luminance.
   */
  function luminance(color: number[]): number {
    return color.slice(0, 3).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  }
  /**
   * Calculates the WCAG contrast ratio.
   * @param first - Opaque sRGB color.
   * @param second - The other opaque sRGB color.
   * @returns Contrast ratio in [1, 21].
   */
  function contrast(first: number[], second: number[]): number {
    const [a, b] = [luminance(first), luminance(second)];
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  /**
   * Reads the page palette's minimum contrast for a role.
   * @param role - Text or non-text.
   * @returns Minimum ratio for the palette's declared `--supa-wcag-level`.
   */
  function minimumFor(role: ContrastRole): number {
    const level = getComputedStyle(document.documentElement).getPropertyValue('--supa-wcag-level');
    return minimums[level.includes('AAA') ? 'AAA' : 'AA'][role];
  }
  /**
   * Resolves a system color on a probe in the page.
   * @param name - CSS system color keyword.
   * @returns Its computed color.
   */
  function system(name: string): string {
    const probe = document.createElement('span');
    probe.style.color = name;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }
  /**
   * Decodes a screenshot into RGBA bytes.
   * @param base64 - PNG screenshot.
   * @returns Its pixels.
   */
  async function decode(base64: string): Promise<ImageData> {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const pixels = canvas.getContext('2d', { willReadFrequently: true })!;
    pixels.drawImage(image, 0, 0);
    return pixels.getImageData(0, 0, image.width, image.height);
  }
  (window as unknown as ColorWindow).a11yColor = { rgba, over, background, contrast, minimumFor, system, decode };
}

/**
 * Measures the painted form edges and inactive pill outline on their actual ancestor fills, and
 * the unchecked switch's knob on its track: the knob's position is what shows the off state.
 * Translucent ancestor fills are composited before measuring WCAG luminance. axe does not check
 * non-text contrast.
 *
 * @param page - Components page with unchecked controls and a keyboard-focused inactive pill.
 */
async function expectControlContrast(page: Page): Promise<void> {
  await settleTransitions(page);
  const failures = await page.evaluate(() => {
    const { rgba, over, background, contrast, minimumFor } = (window as unknown as ColorWindow).a11yColor;
    const found: string[] = [];
    const minimum = minimumFor('non-text');
    for (const selector of ['#checkMermaid', '#switchCopyBtn', '#demoDatepickerInput',
      '#supaBoundaryRadio', '.chip-input', '[data-bs-target="#bsTabGradle"]']) {
      const input = document.querySelector<HTMLElement>(selector);
      if (!input) {
        throw new Error(`Missing control ${selector}`);
      }
      const focus = selector.includes('bsTabGradle');
      if (input instanceof HTMLInputElement && input.checked) {
        found.push(`${selector} is checked`);
      }
      if (focus && (!input.matches(':focus-visible') || input.classList.contains('active'))) {
        found.push('The inactive nav pill does not have keyboard-visible focus');
      }
      const element = selector === '#switchCopyBtn' ? input.closest('.switch')! : input;
      const style = getComputedStyle(element);
      if (focus ? style.outlineStyle !== 'solid' || parseFloat(style.outlineWidth) < 2
        : style.borderTopStyle !== 'solid' || parseFloat(style.borderTopWidth) < 1) {
        found.push(`${selector} has no painted ${focus ? 'outline' : 'border'}`);
      }
      const beneath = background(element.parentElement);
      const ratio = contrast(over(rgba(focus ? style.outlineColor : style.borderTopColor), beneath), beneath);
      if (ratio < minimum) {
        found.push(`${selector}: ${ratio.toFixed(3)}:1, minimum ${minimum}:1`);
      }
      if (selector === '#switchCopyBtn') {
        const track = over(rgba(style.backgroundColor), beneath);
        const knobRatio = contrast(over(rgba(getComputedStyle(element, '::before').backgroundColor), track), track);
        if (knobRatio < minimum) {
          found.push(`${selector} knob on its track: ${knobRatio.toFixed(3)}:1, minimum ${minimum}:1`);
        }
      }
    }

    const range = document.querySelector('#demoRangeInput')!.closest('.form-range')!;
    const slot = document.querySelector('.otp-slot')!;
    const probe = document.createElement('span');
    range.append(probe);
    /**
     * Resolves a component token to its painted opaque color.
     * @param token - Range custom property.
     * @returns Resolved sRGB color.
     */
    function rangeColor(token: string): number[] {
      probe.style.backgroundColor = `var(${token})`;
      return background(probe);
    }
    const track = rangeColor('--range-track-bg');
    const thumb = rangeColor('--range-thumb-bg');
    const fill = rangeColor('--range-track-fill-bg');
    const pageFill = background(range.parentElement);
    // Chromium does not expose native track computed styles. Resolve Bootstrap's shared
    // track shadow token on a probe; both WebKit and Gecko consume it in range-track().
    probe.style.boxShadow = 'var(--range-track-box-shadow, none)';
    const shadow = getComputedStyle(probe).boxShadow;
    const boundaryColor = shadow.match(/(?:rgba?|color)\([^)]*\)/)?.[0];
    const boundary = boundaryColor ? rgba(boundaryColor) : track;
    if (!shadow.includes('inset') || !shadow.includes('1px')) {
      found.push(`Range track has no painted inset boundary: ${shadow}`);
    }
    const secondary = rangeColor('--color-background-secondary');
    const pairs: Array<[string, number[], number[]]> = [
      ['range track boundary/page', boundary, pageFill],
      ['range track boundary/secondary', boundary, secondary],
      ['OTP slot/secondary', rgba(getComputedStyle(slot).borderTopColor), secondary],
      ['range thumb/track', thumb, track],
      ['range thumb/page', thumb, pageFill],
      ['range fill/track', fill, track],
      ['OTP slot/surface', rgba(getComputedStyle(slot).borderTopColor), background(slot)]
    ];
    range.classList.add('theme-inverse');
    const inverse = rangeColor('--theme-bg');
    const inverseThumb = rangeColor('--range-thumb-bg');
    const inverseFill = rangeColor('--range-track-fill-bg');
    if (inverseThumb.join() !== inverse.join() || inverseFill.join() !== inverse.join()) {
      found.push('inverse range must preserve its theme fill');
    }
    pairs.push(['inverse thumb/track', inverseThumb, track],
      ['inverse thumb/page', inverseThumb, pageFill], ['inverse fill/track', inverseFill, track]);
    range.classList.remove('theme-inverse');
    for (const [label, ink, surface] of pairs) {
      const ratio = contrast(ink, surface);
      if (ratio < minimum) {
        found.push(`${label}: ${ratio.toFixed(3)}:1, minimum ${minimum}:1`);
      }
    }
    const slots = document.querySelectorAll('.otp-slot');
    if (slots.length !== 6) {
      throw new Error(`Expected six rendered OTP slots, found ${slots.length}`);
    }
    for (const cell of slots) {
      if (getComputedStyle(cell).borderTopColor !== getComputedStyle(slot).borderTopColor) {
        found.push('OTP slots have inconsistent boundaries');
      }
    }
    const otpInput = document.querySelector<HTMLInputElement>('.otp-input')!;
    const rangeInput = document.querySelector<HTMLInputElement>('#demoRangeInput')!;
    // Disabled native paint stays Bootstrap-owned; the enabled range tokens must disappear.
    rangeInput.disabled = true;
    probe.style.boxShadow = 'var(--range-track-box-shadow, none)';
    if (getComputedStyle(probe).boxShadow !== 'none') {
      found.push('Disabled range inherited the enabled track boundary');
    }
    const disabledThumb = rangeColor('--range-thumb-bg');
    probe.style.backgroundColor = 'var(--theme-bg, var(--primary-base))';
    if (JSON.stringify(disabledThumb) !== JSON.stringify(background(probe))) {
      found.push('Disabled range inherited the enabled thumb override');
    }
    rangeInput.disabled = false;
    otpInput.disabled = true;
    probe.style.backgroundColor = 'var(--bg-2)';
    if (JSON.stringify(rgba(getComputedStyle(slot).backgroundColor)) !==
        JSON.stringify(background(probe))) {
      found.push('Disabled OTP lost its Bootstrap background');
    }
    otpInput.disabled = false;
    probe.remove();
    const switches = document.querySelectorAll<HTMLElement>('#supaThemedSwitches .switch');
    if (switches.length !== 32) {
      throw new Error(`Expected 32 themed switch states, found ${switches.length}`);
    }
    for (const element of switches) {
      const input = element.querySelector('input')!;
      const style = getComputedStyle(element);
      const indicator = getComputedStyle(element, '::before');
      const track = background(element);
      const ratio = contrast(over(rgba(indicator.backgroundColor), track), track);
      if (!input.disabled && ratio < minimum) {
        found.push(`${input.id} knob on its track: ${ratio.toFixed(3)}:1, minimum ${minimum}:1`);
      }
      // Disabled controls are exempt; preserve Bootstrap's existing themed ink and fading.
      const probe = document.createElement('span');
      probe.style.color = input.checked || input.disabled ? 'var(--theme-contrast)' :
        'var(--color-foreground-primary)';
      element.append(probe);
      if (JSON.stringify(rgba(getComputedStyle(probe).color)) !==
        JSON.stringify(rgba(indicator.backgroundColor))) {
        found.push(`${input.id} has unexpected knob ink`);
      }
      probe.remove();
      if (indicator.opacity !== (input.disabled && !input.checked ? '0.4' : '1') ||
        style.opacity !== (input.disabled && input.checked ? '0.65' : '1')) {
        found.push(`${input.id} has unexpected disabled fading`);
      }
    }
    return found;
  });
  if (failures.length) {
    throw new Error(failures.join('; '));
  }
}

/**
 * Fills a themed card cap with `--theme-bg` and an active list-group item with `--primary-bg`;
 * `.card-subtle` and `.card-translucent` caps, and unthemed ones, paint their own fills. Inline
 * code over the solid fills lies on the page color (`_content.scss`), which the contrast audit
 * assumes but cannot see, so these fixtures render it.
 */
const INLINE_CODE_FILLS = `
  <div id="supaInlineCodeFills">
    ${['primary', 'accent', 'success', 'info', 'warning', 'danger', 'secondary', 'inverse'].map((theme) => `
    <div class="card theme-${theme}">
      <div class="card-header"><span data-supa-footer>Header</span> <a href="#supaInlineCodeFills" data-supa-footer>Header link</a> <code data-supa-fill="solid">${theme}</code></div>
      <div class="card-footer"><span data-supa-footer>Footer ${theme}</span> <a href="#supaInlineCodeFills" data-supa-footer>Footer link</a> <code data-supa-fill="solid">${theme}</code></div>
    </div>`).join('')}
    <div class="theme-danger"><div class="card">
      <div class="card-header"><span data-supa-footer>Inherited header</span><code data-supa-fill="solid">inherited</code></div><div class="card-footer"><span data-supa-footer>Inherited theme</span></div>
    </div></div>
    <div class="theme-danger"><div class="theme-reset">
      <div class="card">
        <div class="card-header"><code data-supa-fill="plain">reset header</code></div>
        <div class="card-footer"><code data-supa-fill="plain">reset footer</code></div>
      </div>
      <div class="theme-danger"><div class="card">
        <div class="card-header"><code data-supa-fill="solid">re-themed header</code></div>
        <div class="card-footer"><code data-supa-fill="solid">re-themed footer</code></div>
      </div></div>
    </div></div>
    <ul class="list-group"><li class="list-group-item active"><code data-supa-fill="solid">active</code></li></ul>
    <div class="card"><div class="card-header"><code data-supa-fill="plain" data-supa-ordinary>unthemed</code></div></div>
    <div class="card card-subtle theme-success"><div class="card-header"><code data-supa-fill="plain">subtle</code></div></div>
    <div class="card card-translucent theme-primary"><div class="card-header"><code data-supa-fill="plain">translucent</code></div></div>
    ${['subtle', 'translucent'].flatMap((kind) =>
      ['primary', 'accent', 'success', 'info', 'warning', 'danger', 'secondary', 'inverse'].map((theme) => `
      <div class="card card-${kind} theme-${theme}"><div class="card-header"><span data-supa-footer>${kind} header</span><a href="#supaInlineCodeFills" data-supa-footer>Header link</a></div><div class="card-footer"><span data-supa-footer>${kind} ${theme}</span><a href="#supaInlineCodeFills" data-supa-footer>Footer link</a></div></div>`)).join('')}
  </div>`;

/**
 * Checks card-cap text and links against their composited fill in `INLINE_CODE_FILLS`.
 * For inline code on a solid fill, the chip's text meets the palette's
 * contrast target over the chip as painted (its background color and image, composited over the
 * fill); on every other cap, the chip keeps the plain background, with no image. axe leaves a chip
 * with a background image incomplete rather than measuring it, so this is the check that holds.
 *
 * @param page - Components page with `INLINE_CODE_FILLS` in its article.
 */
async function expectInlineCodeOnFills(page: Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const { rgba, over, background, contrast, minimumFor } = (window as unknown as ColorWindow).a11yColor;
    const found: string[] = [];
    const minimum = minimumFor('text');
    const chips = document.querySelectorAll<HTMLElement>('#supaInlineCodeFills code');
    if (chips.length !== 25) {
      found.push(`expected 25 inline code fixtures, found ${chips.length}`);
    }
    for (const code of chips) {
      const style = getComputedStyle(code);
      const where = `${code.dataset.supaFill} chip "${code.textContent}"`;
      if (code.dataset.supaFill === 'plain') {
        if (style.backgroundImage !== 'none') {
          found.push(`${where}: painted ${style.backgroundImage}, expected the plain background`);
        }
        const ordinary = document.querySelector<HTMLElement>('#supaInlineCodeFills [data-supa-ordinary]')!;
        if (style.backgroundColor !== getComputedStyle(ordinary).backgroundColor) {
          found.push(`${where}: expected the ordinary inline-code background color`);
        }
        continue;
      }
      if (style.backgroundImage === 'none') {
        found.push(`${where}: expected the solid-fill chip background image`);
      }
      // The override paints the inline-code token as a one-color gradient over the page color.
      const image = /(?:rgba?|color|oklch|oklab|lab|lch|hsla?|hwb)\([^)]*\)/.exec(style.backgroundImage);
      let chip = over(rgba(style.backgroundColor), background(code.parentElement));
      if (image) {
        chip = over(rgba(image[0]), chip);
      }
      const ratio = contrast(over(rgba(style.color), chip), chip);
      if (ratio < minimum) {
        found.push(`${where}: ${ratio.toFixed(2)}:1, minimum ${minimum}:1`);
      }
    }
    const footerText = document.querySelectorAll<HTMLElement>('#supaInlineCodeFills [data-supa-footer]');
    if (footerText.length !== 98) {
      found.push(`expected 98 cap text fixtures, found ${footerText.length}`);
    }
    for (const text of footerText) {
      const fill = background(text);
      const ratio = contrast(over(rgba(getComputedStyle(text).color), fill), fill);
      if (ratio < minimum) {
        found.push(`${text.parentElement!.parentElement!.className} ${text.textContent}: ${ratio.toFixed(2)}:1, minimum ${minimum}:1`);
      }
    }
    return found;
  });
  if (failures.length) {
    throw new Error(failures.join('; '));
  }
}

/** A control whose border `control-boundaries-focus` checks in normal and validation states. */
interface ValidatedControl {
  /** The element that takes the validation class. */
  target: string;
  /** The element that draws the border: the switch and chip input paint their wrappers. */
  painted: string;
}

/** The controls whose normal and validation borders `control-boundaries-focus` checks. */
const VALIDATED_CONTROLS: readonly ValidatedControl[] = [
  { target: '#demoDatepickerInput', painted: '#demoDatepickerInput' },
  { target: '.otp', painted: '.otp-slot' },
  { target: '#checkMermaid', painted: '#checkMermaid' },
  { target: '#switchCopyBtn', painted: '.switch:has(#switchCopyBtn)' },
  { target: '#supaBoundaryRadio', painted: '#supaBoundaryRadio' },
  { target: '.chip-input .form-ghost', painted: '.chip-input' }
];

/**
 * Checks normal and validation borders without leaving validation classes on the fixture.
 *
 * @param page - Components page with unchecked controls and a focused inactive pill.
 */
async function expectControlValidationBorders(page: Page): Promise<void> {
  for (const state of ['normal', 'invalid', 'valid']) {
    await page.evaluate(([validationState, controls]) => {
      for (const { target } of controls) {
        const control = document.querySelector(target);
        if (!control || control.matches('.is-valid, .is-invalid')) {
          throw new Error(`Expected an unvalidated fixture: ${target}`);
        }
        if (validationState !== 'normal') {
          control.classList.add(`is-${validationState}`);
        }
      }
    }, [state, VALIDATED_CONTROLS] as const);
    try {
      await settleTransitions(page);
      const problems = await page.evaluate(([validationState, controls]) => {
        const failures: string[] = [];
        for (const { target, painted: paintedSelector } of controls) {
          const painted = document.querySelector(paintedSelector);
          if (!painted) {
            throw new Error(`Missing painted control: ${paintedSelector}`);
          }
          // Resolve each token through the browser in the component's own inherited context.
          const probe = document.createElement('span');
          painted.after(probe);
          const token = validationState === 'normal' ? '--supa-control-border'
            : validationState === 'invalid' ? '--danger-border' : '--success-border';
          probe.style.borderColor = getComputedStyle(painted).getPropertyValue(token);
          const expected = getComputedStyle(probe).borderTopColor;
          probe.style.borderColor = getComputedStyle(painted).getPropertyValue('--supa-control-border');
          const normal = getComputedStyle(probe).borderTopColor;
          probe.remove();
          const style = getComputedStyle(painted);
          if (style.borderTopColor !== expected || style.borderTopStyle !== 'solid' ||
              Number.parseFloat(style.borderTopWidth) <= 0 ||
              (validationState !== 'normal' && style.borderTopColor === normal)) {
            failures.push(`${target} ${validationState}: border ${style.borderTopColor}, ` +
              `expected ${token} (${expected}); normal boundary ${normal}`);
          }
        }
        return failures;
      }, [state, VALIDATED_CONTROLS] as const);
      if (problems.length > 0) {
        throw new Error(`Control validation borders: ${problems.join('; ')}`);
      }
    } finally {
      await page.evaluate((controls) => {
        for (const { target } of controls) {
          document.querySelector(target)?.classList.remove('is-valid', 'is-invalid');
        }
      }, VALIDATED_CONTROLS);
      await settleTransitions(page);
    }
  }
}

/**
 * Exercises keyboard continuation after Bootstrap restores a closed drawer's opener focus, and
 * checks that the element the reader tabbed to keeps focus once the TOC navigation settles.
 *
 * @param name - CLI scenario name.
 * @param viewport - Drawer viewport.
 * @param motion - Reader motion preference.
 * @returns Scenario that tabs immediately after the drawer has closed.
 */
function tocLinkFocusScenario(
  name: string,
  viewport: Viewport,
  motion: 'reduce' | 'no-preference'
): InteractionScenario {
  return {
    name,
    page: 'configuration.html',
    viewport,
    variants: [{ palette: 'furo', polarity: 'light' }],
    setup: async (page) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.evaluate(() => {
        document.getElementById('supaTocDrawer')!.addEventListener('shown.bs.drawer', () => {
          document.documentElement.setAttribute('data-test-toc-shown', 'true');
        }, { once: true });
      });
      await page.locator('.supa-toc-drawer-trigger:visible').first().click();
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-toc-shown'));
      await expectVisible(page.locator('#supaTocDrawer[open]'), 'the open TOC drawer');
      await page.locator('#supaTocNav a[href="#theme-branding"]').focus();
      // Observe the lifecycle itself, not scrollend: waiting for smooth scrolling would hide R-04.
      await page.evaluate(() => {
        document.getElementById('supaTocDrawer')!.addEventListener('hidden.bs.drawer', () => {
          document.documentElement.setAttribute('data-test-toc-hidden', 'true');
        }, { once: true });
      });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-toc-hidden'));
      const focused = await page.evaluate(() => document.activeElement?.id);
      if (focused !== 'theme-branding') {
        throw new Error(`expected heading focus after drawer close, got ${focused}`);
      }
      // With motion allowed, the page is still scrolling: this Tab lands before ScrollSpy settles.
      await page.keyboard.press('Tab');
      await page.evaluate(() => document.activeElement?.setAttribute('data-test-tabbed-to', 'true'));
      // The navigation settles by writing the fragment (at the click under reduced motion), and
      // ScrollSpy's focus call comes after that in the same task; then let the scroll stop.
      await page.waitForFunction(() => window.location.hash === '#theme-branding');
      await settleTransitions(page);
    },
    assertState: async (page) => {
      const problem = await page.evaluate(() => {
        const heading = document.getElementById('theme-branding')!;
        const tabbed = document.querySelector('[data-test-tabbed-to]');
        const active = document.activeElement;
        if (document.getElementById('supaTocDrawer')!.hasAttribute('open')) {
          return 'the TOC drawer is still open';
        }
        if (!tabbed || tabbed === heading || !(heading.contains(tabbed) ||
            heading.compareDocumentPosition(tabbed) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          return 'Tab must continue inside or after the destination section';
        }
        if (active !== tabbed) {
          const name = active ? `${active.tagName.toLowerCase()}#${active.id}.${active.className}` : 'none';
          return `the element Tab reached lost focus to ${name} once the page settled`;
        }
        return '';
      });
      if (problem) {
        throw new Error(problem);
      }
    }
  };
}

/** The `<details>` of the self-site's third-level sidebar group, under Configuration Options. */
const DEPTH_THREE_GROUP =
  '.supa-sidebar-tree li[data-depth="2"]:has(> a.supa-nav-link[href$="#configuration-options"]) > details.supa-nav-details';

/** A query no page of the self-site contains, for the zero-result search state. */
const NO_RESULTS_QUERY = 'qzxvjkw';

/** Page, sidebar link, and destination heading that the sidebar destination-focus scenarios follow. */
const SIDEBAR_LINK_PAGE = 'customizing.html';
const SIDEBAR_LINK_TARGET = 'injecting-extra-head-content';

/**
 * Follows a sidebar link to a section of the same page from the keyboard and checks that focus
 * lands on the destination heading, that Tab continues inside or after that section, and that the
 * element Tab reached keeps focus once the page has settled. Below `lg` the link is in the
 * navigation drawer, which closes; from `lg` up it is in the inline sidebar.
 *
 * @param name - CLI scenario name.
 * @param viewport - `MOBILE` for the drawer, `DESKTOP` for the inline sidebar.
 * @param motion - Reader motion preference.
 * @returns Scenario that presses Enter on the link and Tab once focus has landed.
 */
function sidebarLinkFocusScenario(
  name: string,
  viewport: Viewport,
  motion: 'reduce' | 'no-preference'
): InteractionScenario {
  const drawer = viewport.width < 1024;
  return {
    name,
    page: SIDEBAR_LINK_PAGE,
    viewport,
    variants: [{ palette: 'furo', polarity: 'light' }],
    setup: async (page) => {
      await page.emulateMedia({ reducedMotion: motion });
      if (drawer) {
        // Bootstrap ignores a hide() while the drawer is still sliding in, so wait for shown.
        await page.evaluate(() => {
          const drawerEl = document.getElementById('supaSidebarDrawer')!;
          drawerEl.addEventListener('shown.bs.drawer', () => {
            document.documentElement.setAttribute('data-test-sidebar-shown', 'true');
          }, { once: true });
          drawerEl.addEventListener('hidden.bs.drawer', () => {
            document.documentElement.setAttribute('data-test-sidebar-hidden', 'true');
          }, { once: true });
        });
        await openSidebarDrawer(page);
        await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-sidebar-shown'));
      }
      const link = page.locator(`#supaSidebarDrawer a.supa-nav-link[href="${SIDEBAR_LINK_PAGE}#${SIDEBAR_LINK_TARGET}"]`);
      await link.focus();
      await page.keyboard.press('Enter');
      if (drawer) {
        await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-sidebar-hidden'));
      }
      await page.waitForFunction((id) => window.location.hash === `#${id}`, SIDEBAR_LINK_TARGET);
      // Focus lands on the heading at once; a Tab before the scroll stops must stay where it went.
      const landed = await page.waitForFunction(
        (id) => document.activeElement?.id === id, SIDEBAR_LINK_TARGET, { timeout: STATE_TIMEOUT_MS }
      ).then(() => '', async () => page.evaluate(() => {
        const active = document.activeElement;
        return active ? `${active.tagName.toLowerCase()}#${active.id}.${active.className}` : 'none';
      }));
      if (landed) {
        throw new Error(`expected focus on #${SIDEBAR_LINK_TARGET} after following the sidebar link, got ${landed}`);
      }
      await page.keyboard.press('Tab');
      await page.evaluate(() => document.activeElement?.setAttribute('data-test-tabbed-to', 'true'));
      await settleTransitions(page);
    },
    assertState: async (page) => {
      const problem = await page.evaluate(([id, inDrawer]: [string, boolean]) => {
        const heading = document.getElementById(id);
        const tabbed = document.querySelector('[data-test-tabbed-to]');
        const active = document.activeElement;
        if (!heading) {
          return `no #${id} on the page`;
        }
        if (inDrawer && document.getElementById('supaSidebarDrawer')!.hasAttribute('open')) {
          return 'the sidebar drawer is still open';
        }
        if (!tabbed || tabbed === heading || !(heading.contains(tabbed) ||
            heading.compareDocumentPosition(tabbed) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          return 'Tab must continue inside or after the destination section';
        }
        if (active !== tabbed) {
          const named = active ? `${active.tagName.toLowerCase()}#${active.id}.${active.className}` : 'none';
          return `the element Tab reached lost focus to ${named} once the page settled`;
        }
        return '';
      }, [SIDEBAR_LINK_TARGET, drawer] as [string, boolean]);
      if (problem) {
        throw new Error(problem);
      }
    }
  };
}

/**
 * Scenarios that read the browser's computed accessibility tree. Playwright exposes no engine's
 * tree (its `ariaSnapshot()` computes names itself); only Chromium's DevTools protocol does
 * (`Accessibility.getPartialAXTree`).
 */
const AX_TREE_ENGINES: EngineSupport = {
  supported: ['chromium'],
  reason: "only Chromium's DevTools protocol exposes the computed accessibility tree"
};

/** Page whose headings `heading-names` reads: it has headings with code, `&`, and every level. */
const HEADING_NAMES_PAGE = 'configuration.html';

/** What Chromium's accessibility tree exposes for one element. */
interface AxSummary {
  role: string;
  name: string;
  focusable: boolean;
  /** Whether the element is left out of the tree that assistive technology reads. */
  ignored: boolean;
  /** Whether a dialog is exposed as modal, which a `<dialog>` is after `showModal()`. */
  modal: boolean;
}

/**
 * Reads the name, role, focusability, and modality Chromium computes for each element a selector
 * matches.
 *
 * @param page - Chromium page.
 * @param selector - CSS selector.
 * @returns One entry per matching element, in document order.
 */
async function axNodes(page: Page, selector: string): Promise<AxSummary[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
    const found: AxSummary[] = [];
    for (const nodeId of nodeIds) {
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      // The first node is the one for the element itself
      const node = nodes[0];
      found.push({
        role: String(node?.role?.value ?? ''),
        name: String(node?.name?.value ?? ''),
        focusable: node?.properties?.some((p) => p.name === 'focusable' && p.value.value === true) ?? false,
        ignored: node?.ignored ?? true,
        modal: node?.properties?.some((p) => p.name === 'modal' && p.value.value === true) ?? false
      });
    }
    return found;
  } finally {
    await cdp.detach();
  }
}

/**
 * Checks that each article heading's accessible name is its own text, without its permalink's
 * label, and that each permalink is still a focusable link named "Permalink to" the heading.
 * Chromium named a heading "Documentation Guide Permalink to Documentation Guide" while the
 * permalink sat in the heading's name, which screen readers read in their heading lists.
 */
const HEADING_NAMES: InteractionScenario = {
  name: 'heading-names',
  page: HEADING_NAMES_PAGE,
  viewport: DESKTOP,
  variants: [{ palette: 'furo', polarity: 'light' }],
  engines: AX_TREE_ENGINES,
  setup: async () => {},
  assertState: async (page) => {
    const selector = '#supa-main-content :is(h2, h3, h4, h5, h6):has(> .supa-headerlink)';
    const texts = await page.$$eval(selector, (headings) => headings.map((heading) => {
      const clone = heading.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.supa-headerlink').forEach((el) => el.remove());
      return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    }));
    if (texts.length < 10) {
      throw new Error(`expected the article's headings to have permalinks, found ${texts.length}`);
    }
    const headings = await axNodes(page, selector);
    const links = await axNodes(page, `${selector} > .supa-headerlink`);
    const problems: string[] = [];
    texts.forEach((text, idx) => {
      const heading = headings[idx];
      const link = links[idx];
      if (heading?.role !== 'heading' || heading.name !== text) {
        problems.push(`heading "${text}" is exposed as ${heading?.role} "${heading?.name}"`);
      }
      if (link?.role !== 'link' || link.ignored || !link.focusable ||
          link.name !== `Permalink to ${text}`) {
        problems.push(`the permalink of "${text}" is exposed as ${link?.role} "${link?.name}"` +
          `${link?.ignored ? ', ignored' : ''}${link?.focusable ? '' : ', not focusable'}`);
      }
    });
    if (problems.length > 0) {
      const more = problems.length > 4 ? `; and ${problems.length - 4} more` : '';
      throw new Error(`${problems.slice(0, 4).join('; ')}${more}`);
    }
  }
};

/**
 * Default font sizes the larger-font scenarios set, in CSS px: Chrome's "Very large" font setting
 * (24 px), and twice the 16 px default (32 px), the text size WCAG 1.4.4 Resize Text asks for.
 */
const LARGE_DEFAULT_FONTS = [24, 32] as const;

/**
 * Viewport widths the larger-font scenarios load at: 1280, where all three columns first show at
 * the default font, and the 1440 the desktop scans use.
 */
const LARGE_FONT_WIDTHS = [1280, 1440] as const;

/** Pages the larger-font scenarios load: the longest page of components, and the widest tables. */
const LARGE_FONT_PAGES = ['kitchen-sink.html', 'configuration.html'] as const;

/**
 * The narrowest article content box the larger-font scenarios accept, in em of the reader's default
 * font. 20em is 320 CSS px at the 16 px default, the viewport width that WCAG 1.4.10 Reflow asks
 * content to work in, and so the whole width of the narrowest phone layout the skin supports. A
 * reader who raised the font on a wide screen must not get a column narrower than that phone
 * screen, scaled to their font.
 */
const MIN_ARTICLE_EM = 20;

/**
 * Scenarios that set the browser's default font size. Playwright has no such option; only
 * Chromium's DevTools protocol does (`Page.setFontSizes`).
 */
const FONT_SETTING_ENGINES: EngineSupport = {
  supported: ['chromium'],
  reason: "only Chromium's DevTools protocol sets the default font size (Page.setFontSizes)"
};

/**
 * Lists what a larger default font broke in the article: a content box narrower than `minEm` of
 * the default font, and text clipped by a box that hides its overflow. A box clips text when its
 * content is wider than the box (`scrollWidth > clientWidth`) and a text node whose nearest
 * ancestor with non-visible overflow is that box extends past its padding box. Overflow that is not
 * text, a decorative shape or an icon, does not count, and text inside a scrolling descendant, a
 * table or code block the reader can scroll, belongs to that descendant. Boxes 1 px wide or less
 * are visually hidden text for screen readers, which is meant to be clipped. Runs in the page.
 *
 * @param minEm - Narrowest acceptable content box, in em of the root font size.
 * @returns One message per problem; empty when the article holds up.
 */
function largeFontArticleProblems(minEm: number): string[] {
  const problems: string[] = [];
  const article = document.querySelector<HTMLElement>('.supa-article');
  if (!article) {
    return ['no .supa-article on the page'];
  }
  const rootPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  const articleStyle = getComputedStyle(article);
  const contentWidth =
    article.clientWidth -
    Number.parseFloat(articleStyle.paddingLeft) -
    Number.parseFloat(articleStyle.paddingRight);
  if (contentWidth < minEm * rootPx) {
    problems.push(
      `the article is ${Math.round(contentWidth)}px wide (${(contentWidth / rootPx).toFixed(1)}em), ` +
        `narrower than ${minEm}em (${minEm * rootPx}px)`
    );
  }
  /**
   * Names an element for a message.
   *
   * @param el - Element to name.
   * @returns Tag and classes, such as `div.supa-admonition.admonition-note`.
   */
  const nameOf = (el: Element): string =>
    [el.tagName.toLowerCase(), ...[...el.classList].filter((name) => !name.includes(':'))].join('.');
  for (const box of [article, ...article.querySelectorAll<HTMLElement>('*')]) {
    const overflow = getComputedStyle(box).overflowX;
    if ((overflow !== 'hidden' && overflow !== 'clip') || box.clientWidth <= 1 ||
        box.scrollWidth <= box.clientWidth + 1) {
      continue;
    }
    const rect = box.getBoundingClientRect();
    const left = rect.left + box.clientLeft;
    const right = left + box.clientWidth;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      let clipper = node.parentElement;
      while (clipper && clipper !== box && getComputedStyle(clipper).overflowX === 'visible') {
        clipper = clipper.parentElement;
      }
      if (clipper !== box || !node.textContent?.trim()) {
        continue;
      }
      const range = document.createRange();
      range.selectNodeContents(node);
      const past = [...range.getClientRects()].find(
        (r) => r.width > 0 && (r.right > right + 1 || r.left < left - 1)
      );
      if (past) {
        const text = node.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
        problems.push(
          `${nameOf(box)} (${box.clientWidth}px wide, content ${box.scrollWidth}px) clips "${text}"`
        );
        break;
      }
    }
  }
  return problems;
}

/**
 * Checks that a navigation column works at the current layout: inline beside the article, or,
 * where its trigger shows, as a drawer that opens inside the viewport and closes again. A section
 * link closes the drawer only where `index.ts` also takes the layout for a drawer, so following
 * one proves the script and the stylesheet agree on the breakpoint. The sidebar follows a link to
 * a section of the same page when one is showing, and is otherwise dismissed with Escape.
 *
 * @param page - Page under test, with reduced motion.
 * @param file - Page's file name, which the sidebar's same-page links start with.
 * @param column - `sidebar` (`#supaSidebarDrawer`, `lg`) or `toc` (`#supaTocDrawer`, `xl`).
 */
async function expectNavigationColumnWorks(page: Page, file: string, column: 'sidebar' | 'toc'): Promise<void> {
  const id = column === 'sidebar' ? 'supaSidebarDrawer' : 'supaTocDrawer';
  const trigger = page
    .locator(column === 'sidebar'
      ? '.supa-mobile-header [data-bs-target="#supaSidebarDrawer"]'
      : '.supa-toc-drawer-trigger')
    .filter({ visible: true })
    .first();
  if (!(await trigger.isVisible())) {
    const beside = await page.evaluate(([drawerId, side]: [string, string]) => {
      const drawer = document.getElementById(drawerId)!.getBoundingClientRect();
      const article = document.querySelector('.supa-article')!.getBoundingClientRect();
      if (drawer.width === 0 || drawer.height === 0) {
        return `the inline #${drawerId} is not rendered, and no trigger opens it`;
      }
      const clear = side === 'left' ? drawer.right <= article.left + 1 : drawer.left >= article.right - 1;
      return clear ? '' : `the inline #${drawerId} overlaps the article`;
    }, [id, column === 'sidebar' ? 'left' : 'right'] as [string, string]);
    if (beside) {
      throw new Error(beside);
    }
    return;
  }
  // Bootstrap ignores a hide() while the drawer is still sliding in, so wait for shown.
  await page.evaluate((drawerId) => {
    const drawer = document.getElementById(drawerId)!;
    document.documentElement.removeAttribute('data-test-drawer-shown');
    document.documentElement.removeAttribute('data-test-drawer-hidden');
    drawer.addEventListener('shown.bs.drawer', () => {
      document.documentElement.setAttribute('data-test-drawer-shown', 'true');
    }, { once: true });
    drawer.addEventListener('hidden.bs.drawer', () => {
      document.documentElement.setAttribute('data-test-drawer-hidden', 'true');
    }, { once: true });
  }, id);
  await trigger.click();
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-drawer-shown'));
  const fits = await page.evaluate((drawerId) => {
    const rect = document.getElementById(drawerId)!.getBoundingClientRect();
    return rect.width > 0 && rect.left >= -1 && rect.right <= window.innerWidth + 1
      ? ''
      : `the open #${drawerId} spans ${Math.round(rect.left)}..${Math.round(rect.right)}px ` +
        `in a ${window.innerWidth}px viewport`;
  }, id);
  if (fits) {
    throw new Error(fits);
  }
  const link = page
    .locator(column === 'sidebar' ? `#${id} a.supa-nav-link[href^="${file}#"]` : `#${id} #supaTocNav a.nav-link`)
    .filter({ visible: true })
    .first();
  const href = (await link.isVisible()) ? await link.getAttribute('href') : null;
  if (href) {
    await link.focus();
    await page.keyboard.press('Enter');
  } else {
    await page.keyboard.press('Escape');
  }
  try {
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-drawer-hidden'));
  } catch {
    throw new Error(
      `the open #${id} did not close after ${href ? `following ${href}` : 'Escape'}: ` +
        'the script and the stylesheet disagree on whether it is a drawer'
    );
  }
  if (href) {
    const target = decodeURIComponent(href.slice(href.indexOf('#') + 1));
    await expectFocused(page, page.locator(`[id="${target}"]`), `the section ${href} leads to`);
  } else {
    await expectFocused(page, trigger, `the trigger of #${id}`);
  }
}

/**
 * Loads `file` with the browser's default font size raised to `fontPx`, as a reader does with the
 * browser's font setting. Unlike page zoom, that leaves the viewport as many CSS px wide, so a
 * layout that switches at px widths keeps all three columns while `rem` widths and text grow.
 * Checks that the article keeps a readable column and clips no text, and that the sidebar and the
 * TOC each work, inline or as a drawer.
 *
 * @param file - Page to load.
 * @param fontPx - Default font size, in CSS px.
 * @param width - Viewport width, in CSS px.
 * @returns Scenario that checks the layout at the larger font.
 */
function largeDefaultFontScenario(file: string, fontPx: number, width: number): InteractionScenario {
  return {
    name: `large-default-font-${file.replace(/\.html$/, '')}-${fontPx}-${width}`,
    page: file,
    viewport: { width, height: 900 },
    variants: [{ palette: 'furo', polarity: 'light' }],
    engines: FONT_SETTING_ENGINES,
    prepare: async (page) => {
      const cdp = await page.context().newCDPSession(page);
      // Chrome's font-size setting keeps the fixed-width font 3 px smaller, 13 px at the 16 px default.
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: fontPx, fixed: fontPx - 3 } });
    },
    setup: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expectNavigationColumnWorks(page, file, 'sidebar');
      await expectNavigationColumnWorks(page, file, 'toc');
      await settleTransitions(page);
    },
    assertState: async (page) => {
      const rootPx = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
      if (rootPx !== `${fontPx}px`) {
        throw new Error(`expected a ${fontPx}px default font, but <html> computes ${rootPx}`);
      }
      const problems = await page.evaluate(largeFontArticleProblems, MIN_ARTICLE_EM);
      if (problems.length > 0) {
        const more = problems.length > 5 ? `; and ${problems.length - 5} more` : '';
        throw new Error(
          `at a ${fontPx}px default font and ${width}px: ${problems.slice(0, 5).join('; ')}${more}`
        );
      }
    }
  };
}

/**
 * Default font sizes, in CSS px, and viewports the `drawer-roles-*` scenarios load: both columns
 * inline, the sidebar inline beside a TOC drawer, and both drawers, at the 16 px default; then a
 * 1440 px window at 20 px (72em: the sidebar inline, the TOC a drawer) and at 24 px (60em: both
 * drawers), where a px breakpoint would keep both columns inline.
 */
const DRAWER_ROLE_LAYOUTS: ReadonlyArray<{ fontPx: number; viewport: Viewport }> = [
  { fontPx: 16, viewport: DESKTOP },
  { fontPx: 16, viewport: TABLET },
  { fontPx: 16, viewport: MOBILE },
  { fontPx: 20, viewport: DESKTOP },
  { fontPx: 24, viewport: DESKTOP }
];

/**
 * Checks what Chromium's accessibility tree exposes for a navigation column. Inline, the column is
 * its `<aside>` landmark, named as before, and its `<dialog>` is not exposed as a dialog, so a
 * screen reader does not announce a dialog that never opened. As a drawer, the closed `<dialog>`
 * is left out of the tree, and once its trigger opens it, it is a modal dialog named by its title;
 * Escape closes it again.
 *
 * @param page - Page under test, with reduced motion.
 * @param column - `sidebar` (`#supaSidebarDrawer`, `lg`) or `toc` (`#supaTocDrawer`, `xl`).
 * @returns Problems found; empty when the column is exposed as it should be.
 */
async function navigationColumnSemanticsProblems(page: Page, column: 'sidebar' | 'toc'): Promise<string[]> {
  const id = column === 'sidebar' ? 'supaSidebarDrawer' : 'supaTocDrawer';
  const aside = column === 'sidebar' ? '.supa-sidebar-column' : '.supa-toc-column';
  const trigger = page
    .locator(column === 'sidebar'
      ? '.supa-mobile-header [data-bs-target="#supaSidebarDrawer"]'
      : '.supa-toc-drawer-trigger')
    .filter({ visible: true })
    .first();
  const [label, title] = await page.evaluate(([drawerId, asideSelector]: [string, string]) => [
    document.querySelector(asideSelector)?.getAttribute('aria-label') ?? '',
    document.getElementById(`${drawerId}Title`)?.textContent?.trim() ?? ''
  ], [id, aside] as [string, string]);
  const show = (node: AxSummary | undefined): string =>
    node ? `${node.ignored ? 'ignored ' : ''}${node.modal ? 'modal ' : ''}${node.role} "${node.name}"` : 'missing';
  const problems: string[] = [];
  if (!(await trigger.isVisible())) {
    const [landmark] = await axNodes(page, aside);
    const [drawer] = await axNodes(page, `#${id}`);
    if (landmark?.role !== 'complementary' || landmark.ignored || landmark.name !== label) {
      problems.push(`the inline ${column}'s <aside> is ${show(landmark)}, not complementary "${label}"`);
    }
    if (!drawer || drawer.ignored || drawer.role === 'dialog' || drawer.role !== 'group') {
      problems.push(`the inline #${id} is exposed as ${show(drawer)}, not as a group`);
    }
    return problems;
  }
  const [closed] = await axNodes(page, `#${id}`);
  if (!closed?.ignored) {
    problems.push(`the closed #${id} drawer is exposed as ${show(closed)}`);
  }
  await page.evaluate((drawerId) => {
    const drawer = document.getElementById(drawerId)!;
    document.documentElement.removeAttribute('data-test-drawer-shown');
    document.documentElement.removeAttribute('data-test-drawer-hidden');
    drawer.addEventListener('shown.bs.drawer', () => {
      document.documentElement.setAttribute('data-test-drawer-shown', 'true');
    }, { once: true });
    drawer.addEventListener('hidden.bs.drawer', () => {
      document.documentElement.setAttribute('data-test-drawer-hidden', 'true');
    }, { once: true });
  }, id);
  await trigger.click();
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-drawer-shown'));
  const [open] = await axNodes(page, `#${id}`);
  if (!open || open.ignored || open.role !== 'dialog' || !open.modal || open.name !== title) {
    problems.push(`the open #${id} drawer is exposed as ${show(open)}, not as modal dialog "${title}"`);
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-test-drawer-hidden'));
  return problems;
}

/**
 * Checks the accessibility-tree role and name of the sidebar and the TOC at one default font and
 * viewport, inline and as drawers (see `navigationColumnSemanticsProblems()`). Each column is
 * inline or a drawer by the skin's em breakpoints, which the larger fonts move.
 *
 * @param fontPx - Browser's default font size, in CSS px.
 * @param viewport - Viewport to load the page at.
 * @returns Scenario that checks both columns, leaving both drawers closed for the scan.
 */
function drawerRolesScenario(fontPx: number, viewport: Viewport): InteractionScenario {
  /**
   * Lists the problems with both columns.
   *
   * @param page - Page under test.
   * @returns Problems found in either column.
   */
  const problemsOf = async (page: Page): Promise<string[]> => [
    ...await navigationColumnSemanticsProblems(page, 'sidebar'),
    ...await navigationColumnSemanticsProblems(page, 'toc')
  ];
  return {
    name: `drawer-roles-${fontPx}-${viewport.width}`,
    page: 'getting-started.html',
    viewport,
    variants: [{ palette: 'furo', polarity: 'light' }],
    engines: AX_TREE_ENGINES,
    prepare: async (page) => {
      const cdp = await page.context().newCDPSession(page);
      // Chrome's font-size setting keeps the fixed-width font 3 px smaller, 13 px at the 16 px default.
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: fontPx, fixed: fontPx - 3 } });
    },
    setup: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const problems = await problemsOf(page);
      if (problems.length > 0) {
        throw new Error(`at a ${fontPx}px default font and ${viewport.width}px: ${problems.join('; ')}`);
      }
      await settleTransitions(page);
    },
    assertState: async (page) => {
      const open = await page.locator('dialog.drawer[open]').count();
      if (open !== 0) {
        throw new Error(`expected both drawers closed after the check, found ${open} open`);
      }
      const problems = await problemsOf(page);
      if (problems.length > 0) {
        throw new Error(`at a ${fontPx}px default font and ${viewport.width}px: ${problems.join('; ')}`);
      }
    }
  };
}

/**
 * Audits selected and unselected picker outlines through real keyboard navigation.
 *
 * @param page - Configuration page with the header palette menu open.
 */
async function expectPaletteFocus(page: Page): Promise<void> {
  for (const [selector, attribute] of [
    ['.supa-palette-card', 'aria-pressed'],
    ['.supa-content-header [data-supa-palette-option]', 'aria-checked']
  ]) {
    for (const selected of ['true', 'false']) {
      const item = page.locator(`${selector}[${attribute}="${selected}"]:visible`).first();
      const menu = selector.includes('palette-option');
      if (menu) {
        const trigger = page.locator('.supa-content-header .supa-palette-btn');
        if (await trigger.getAttribute('aria-expanded') !== 'true') {
          await trigger.focus();
          await page.keyboard.press('ArrowDown');
        }
      }
      await item.blur();
      const resting = await item.evaluate((el) => {
        const style = getComputedStyle(el);
        return `${style.outlineStyle}/${style.outlineWidth}/${style.outlineColor}/${style.outlineOffset}`;
      });
      if (menu) {
        await page.locator('.supa-content-header .supa-palette-btn').focus();
        for (let step = 0; step < 7; step++) {
          await page.keyboard.press('ArrowDown');
          if (await item.evaluate((el) => el === document.activeElement)) {
            break;
          }
        }
      } else {
        await item.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
      }
      await expectFocused(page, item, `${selector} selected=${selected}`);
      await settleTransitions(page);
      const failures = await item.evaluate((element, rest) => {
        const { rgba, over, background, contrast, minimumFor } = (window as unknown as ColorWindow).a11yColor;
        const found: string[] = [];
        const style = getComputedStyle(element);
        const focused = `${style.outlineStyle}/${style.outlineWidth}/${style.outlineColor}/${style.outlineOffset}`;
        if (!element.matches(':focus-visible') || style.outlineStyle !== 'solid' ||
            parseFloat(style.outlineWidth) < 2 || focused === rest) {
          found.push('keyboard outline must be visible and distinct from rest');
        }
        const minimum = minimumFor('non-text');
        for (const [name, fill] of [
          ['item', background(element)], ['surround', background(element.parentElement)]
        ] as Array<[string, number[]]>) {
          const ratio = contrast(over(rgba(style.outlineColor), fill), fill);
          if (ratio < minimum) {
            found.push(`${name}: ${ratio.toFixed(3)}:1, minimum ${minimum}:1`);
          }
        }
        return found;
      }, resting);
      if (failures.length) {
        throw new Error(`${selector} selected=${selected}: ${failures.join('; ')}`);
      }
      await item.blur();
    }
  }
  // Card navigation closes the menu; restore it for the scenario's axe scan.
  const trigger = page.locator('.supa-content-header .supa-palette-btn');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await page.mouse.move(0, 0);
}

/**
 * Checks the range slider's painted pixels in forced colors: CanvasText thumb ink, both track
 * edges beyond the thumb, and the Highlight progress fill before it. Each region is sampled away
 * from the others, so one cannot stand in for another. Edges and progress are classified by the
 * nearest system color and judged by column coverage, so antialiasing, fractional placement, and
 * small rasterization shifts do not fail them while a missing edge or fill does.
 *
 * @param page - Components page with forced colors active.
 */
async function expectForcedRangePixels(page: Page): Promise<void> {
  await settleTransitions(page);
  const range = page.locator('#demoRangeInput');
  const geometry = await range.evaluate((el) => {
    const input = el as HTMLInputElement;
    // Resolve rem/calc tokens as rendered lengths, not parseFloat("1rem").
    const probe = document.createElement('span');
    input.parentElement!.append(probe);
    probe.style.cssText = 'position: absolute; height: 0; pointer-events: none';
    probe.style.width = getComputedStyle(input).getPropertyValue('--range-thumb-width');
    const thumbWidth = probe.getBoundingClientRect().width;
    probe.style.width = getComputedStyle(input).getPropertyValue('--range-thumb-height');
    const thumbHeight = probe.getBoundingClientRect().width;
    probe.style.width = getComputedStyle(input).getPropertyValue('--range-track-height');
    const trackHeight = probe.getBoundingClientRect().width;
    probe.remove();
    const { system } = (window as unknown as ColorWindow).a11yColor;
    const { width, height } = input.getBoundingClientRect();
    const fraction = (input.valueAsNumber - Number(input.min || 0)) /
      (Number(input.max || 100) - Number(input.min || 0));
    return { width, height, thumbWidth, thumbHeight, trackHeight, fraction,
      ink: system('CanvasText'), fill: system('Highlight'), paper: system('Canvas') };
  });
  const pixels = await range.screenshot({ animations: 'disabled' });
  const visible = await page.evaluate(async ({ base64, geometry: g }) => {
    const { rgba, over, decode } = (window as unknown as ColorWindow).a11yColor;
    const { data, width, height } = await decode(base64);
    // Convert resolved system colors to the same RGB bytes as the screenshot.
    const bytes = (color: number[]): number[] => color.slice(0, 3).map((channel) => Math.round(channel * 255));
    const ink = bytes(rgba(g.ink));
    const paper = bytes(rgba(g.paper));
    // Highlight may be translucent; progress is composited over Canvas.
    const fill = bytes(over(rgba(g.fill), rgba(g.paper)));
    const distance = (offset: number, color: number[]): number =>
      color.reduce((sum, channel, i) => sum + (data[offset + i] - channel) ** 2, 0);
    const thumbLeft = (g.width - g.thumbWidth) * g.fraction;
    const thumbRight = thumbLeft + g.thumbWidth;
    const trackTop = (g.height - g.trackHeight) / 2;
    const trackBottom = trackTop + g.trackHeight;
    const thumbTop = (g.height - g.thumbHeight) / 2;
    // Only the thumb protrusions can contribute thumb ink. Track samples are
    // at least one thumb-width away, excluding the rounded ends as well.
    const filledStart = g.thumbWidth;
    const filledEnd = thumbLeft - g.thumbWidth;
    const emptyStart = thumbRight + g.thumbWidth;
    const emptyEnd = g.width - g.thumbWidth;
    if (g.thumbHeight <= g.trackHeight + 4 || filledEnd <= filledStart ||
        emptyEnd <= emptyStart || !Number.isFinite(thumbLeft)) {
      throw new Error(`forced-colors range invalid sampling geometry: ${JSON.stringify(g)}`);
    }
    let thumb = 0;
    const topBorder = new Uint8Array(width);
    const bottomBorder = new Uint8Array(width);
    // Per column: pixels inside the track's border, and those nearer the fill than paper or ink.
    const progressBand = new Uint16Array(width);
    const progressFill = new Uint16Array(width);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cssX = (x + .5) * g.width / width;
        const cssY = (y + .5) * g.height / height;
        const offset = (y * width + x) * 4;
        if (cssX > thumbLeft + g.thumbWidth / 4 &&
            cssX < thumbRight - g.thumbWidth / 4 &&
            cssY > thumbTop + 1 && cssY < thumbTop + g.thumbHeight - 1 &&
            (cssY < trackTop - 1 || cssY > trackBottom + 1) &&
            // Bootstrap overlays a white gradient (up to 15%) on thumb ink.
            ink.every((channel, i) => Math.abs(data[offset + i] - channel) <= 40)) {
          thumb++;
        }
        // Squared RGB distances admit partially blended border ink while
        // excluding Canvas and near-Canvas pixels that are closer to paper.
        if (cssX > emptyStart && cssX < emptyEnd && distance(offset, ink) < distance(offset, paper)) {
          // Compare pixel centers in CSS coordinates so these edge bands
          // tolerate fractional placement at any device pixel ratio.
          if (Math.abs(cssY - trackTop) <= 1.5) { topBorder[x] = 1; }
          if (Math.abs(cssY - trackBottom) <= 1.5) { bottomBorder[x] = 1; }
        }
        if (cssX > filledStart && cssX < filledEnd &&
            Math.abs(cssY - g.height / 2) <= g.trackHeight / 2 - 1) {
          progressBand[x]++;
          const toFill = distance(offset, fill);
          if (toFill < distance(offset, paper) && toFill < distance(offset, ink)) { progressFill[x]++; }
        }
      }
    }
    let border = 0;
    let borderSpan = 0;
    let progress = 0;
    let progressSpan = 0;
    for (let x = 0; x < width; x++) {
      const cssX = (x + .5) * g.width / width;
      if (cssX > emptyStart && cssX < emptyEnd) {
        borderSpan++;
        if (topBorder[x] && bottomBorder[x]) { border++; }
      }
      if (cssX > filledStart && cssX < filledEnd) {
        progressSpan++;
        // Most of the column inside the border must be fill: a blended edge row alone is not.
        if (progressFill[x] * 2 > progressBand[x]) { progress++; }
      }
    }
    // Five columns give the 80% coverage threshold at least four samples.
    if (borderSpan < 5 || progressSpan < 5) {
      throw new Error(`forced-colors range invalid sampling geometry: ${JSON.stringify(g)}`);
    }
    // Require both edges, and the fill, in 80% of columns: allow antialiasing gaps without
    // accepting stray pixels, independently of how many device rows an edge or the fill spans.
    // Require substantial thumb ink, not stray edge pixels.
    const scale = width / g.width * height / g.height;
    return { thumb, border, borderSpan, progress, progressSpan, thumbMinimum: 8 * scale,
      borderMinimum: borderSpan * .8, progressMinimum: progressSpan * .8 };
  }, { base64: pixels.toString('base64'), geometry });
  const missing: string[] = [];
  if (visible.thumb < visible.thumbMinimum) { missing.push('thumb'); }
  if (visible.border < visible.borderMinimum) { missing.push('track border'); }
  if (visible.progress < visible.progressMinimum) { missing.push('track progress fill'); }
  if (missing.length) {
    throw new Error(`forced-colors range missing ${missing.join(', ')} pixels: ` +
      JSON.stringify(visible));
  }
}

/** A state family `forcedColorsScenario` exercises; the scenario is named `forced-colors-<kind>`. */
type ForcedColorsKind = 'controls-tabs' | 'palettes' | 'search';

/**
 * Verifies forced-color ink and selection cues against browser-resolved system colors.
 *
 * @param page - Page with forced colors active and the scenario's selected states visible.
 * @param kind - State family to inspect.
 */
async function expectForcedColorCues(page: Page, kind: ForcedColorsKind): Promise<void> {
  await settleTransitions(page);
  const failures = await page.evaluate((family) => {
    const problems: string[] = [];
    if (!matchMedia('(forced-colors: active)').matches) {
      throw new Error('Forced colors must be active');
    }
    const { system } = (window as unknown as ColorWindow).a11yColor;
    const ink = system('CanvasText');
    const highlight = system('Highlight');
    if (family === 'controls-tabs') {
      for (const selector of ['#checkMermaid', '#switchCopyBtn']) {
        const input = document.querySelector<HTMLInputElement>(selector)!;
        const painted = selector === '#switchCopyBtn' ? input.closest('.switch')! : input;
        const cue = getComputedStyle(painted, '::before');
        if (!input.checked || cue.backgroundColor !== ink || cue.opacity !== '1' ||
            cue.backgroundColor === getComputedStyle(painted).backgroundColor) {
          problems.push(`${selector}: missing contrasting system-color mark/knob`);
        }
        const on = `${cue.opacity}/${cue.transform}/${cue.insetInlineStart}`;
        input.checked = false;
        const off = getComputedStyle(painted, '::before');
        if (on === `${off.opacity}/${off.transform}/${off.insetInlineStart}`) {
          problems.push(`${selector}: checked and unchecked cues are identical`);
        }
        input.checked = true;
      }
    }
    const pairs = family === 'controls-tabs'
      ? [['.supa-tab-btn', 'aria-selected']]
      : family === 'palettes'
        ? [['.supa-palette-card', 'aria-pressed'], ['[data-supa-palette-option]', 'aria-checked']]
        : [['.supa-search-result-item', 'aria-selected']];
    for (const [selector, attribute] of pairs) {
      const selected = [...document.querySelectorAll(`${selector}[${attribute}="true"]`)]
        .find((el) => el.getBoundingClientRect().height > 0);
      const other = [...document.querySelectorAll(`${selector}[${attribute}="false"]`)]
        .find((el) => el.getBoundingClientRect().height > 0);
      if (!selected || !other) {
        problems.push(`${selector}: missing visible selected/unselected pair`);
        continue;
      }
      if (selector === '.supa-tab-btn' &&
          !getComputedStyle(selected).textDecorationLine.includes('underline')) {
        problems.push(`${selector}: selected tab must be underlined`);
      }
      const on = getComputedStyle(selected);
      const off = getComputedStyle(other);
      if (on.outlineStyle !== 'solid' || Number.parseFloat(on.outlineWidth) < 2 ||
          on.outlineColor !== highlight ||
          `${on.outlineStyle}/${on.outlineWidth}/${on.outlineColor}` ===
            `${off.outlineStyle}/${off.outlineWidth}/${off.outlineColor}`) {
        problems.push(`${selector}: selected outline must differ and resolve to Highlight`);
      }
    }
    return problems;
  }, kind);
  if (failures.length) {
    throw new Error(failures.join('; '));
  }
  // Selection must remain visible at rest and gain a separate cue on keyboard focus.
  const selector = kind === 'controls-tabs' ? '.supa-tab-btn[aria-selected="true"]'
    : kind === 'palettes' ? '.supa-palette-card[aria-pressed="true"]'
      : '.supa-search-result-item[aria-selected="true"]';
  const selected = page.locator(`${selector}:visible`).first();
  await selected.blur();
  const resting = await selected.evaluate((el) => {
    const style = getComputedStyle(el);
    return `${style.outlineStyle}/${style.outlineWidth}/${style.outlineColor}/${style.outlineOffset}`;
  });
  await selected.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expectFocused(page, selected, 'selected forced-color item');
  const focused = await selected.evaluate((el) => {
    if (!el.matches(':focus-visible')) {
      throw new Error('Selected item must have keyboard-visible focus');
    }
    const style = getComputedStyle(el);
    return `${style.outlineStyle}/${style.outlineWidth}/${style.outlineColor}/${style.outlineOffset}`;
  });
  if (focused === resting) {
    throw new Error(`${selector}: keyboard focus must differ from resting selection`);
  }
  await selected.blur();
  if (kind === 'palettes') {
    // Tabbing to the article card dismisses the header menu; restore its scan state.
    const trigger = page.locator('.supa-palette-btn:visible').first();
    if (await trigger.getAttribute('aria-expanded') !== 'true') {
      await trigger.click();
    }
    await trigger.blur();
    await page.mouse.move(0, 0);
    await page.locator('.tooltip.show').waitFor({ state: 'hidden' });
  }
}

/**
 * Builds a forced-colors regression scenario in both OS color schemes.
 *
 * @param kind - State family to exercise.
 * @returns Scenario checking system-color cues before and after axe.
 */
function forcedColorsScenario(kind: ForcedColorsKind): InteractionScenario {
  return {
    name: `forced-colors-${kind}`,
    page: kind === 'palettes' ? 'configuration.html' : 'components.html',
    viewport: DESKTOP,
    // Unscoped forced-colors-pages scans cover text and ARIA; axe has no non-text
    // contrast rule, so scoped computed-style and pixel assertions cover control cues.
    scope: kind === 'controls-tabs' ? ['#checkMermaid', '.switch', '.form-range', '.supa-tabs'] : undefined,
    variants: [{ palette: 'furo', polarity: 'light' }, { palette: 'furo', polarity: 'dark' }],
    engines: FORCED_COLORS_ENGINES,
    setup: async (page) => {
      await page.emulateMedia({ forcedColors: 'active' });
      if (kind === 'controls-tabs') {
        await page.locator('#checkMermaid').check();
        await page.locator('#switchCopyBtn').check();
        // Remove focus as a confounder: the selection cue must survive blur.
        await page.locator('#switchCopyBtn').blur();
      } else if (kind === 'palettes') {
        await page.locator('.supa-palette-btn:visible').first().click();
      } else {
        await page.keyboard.press('ControlOrMeta+k');
        await page.waitForFunction(
          () => Object.keys(sessionStorage).some((key) => key.startsWith('supa-search-index-'))
        );
        await page.locator('#supaSearchInput').fill('configuration');
        await expectVisible(page.locator('.supa-search-result-item').nth(1), 'second result');
        await page.keyboard.press('ArrowDown');
      }
      // Scrolling to controls can leave the pointer over an unrelated range tooltip.
      // Keep this scan on the requested selection states, with no incidental hover.
      await page.mouse.move(0, 0);
      if (kind === 'palettes') {
        await page.locator('.supa-palette-btn:visible').first().blur();
        await page.locator('.tooltip.show').waitFor({ state: 'hidden' });
      }
    },
    assertState: async (page) => {
      await expectForcedColorCues(page, kind);
      if (kind === 'controls-tabs') {
        await expectForcedRangePixels(page);
      }
      if (kind === 'palettes') {
        await expectPaletteFocus(page);
      }
    }
  };
}

/** The OS supplies the colors, so repeating all six palettes adds no coverage. */
const FORCED_VARIANTS: readonly Variant[] = [
  { palette: 'furo', polarity: 'light' }, { palette: 'furo', polarity: 'dark' }
];

/** Shared filter name for every unscoped forced-colors page scan. */
const FORCED_COLORS_PAGES = 'forced-colors-pages';

/**
 * Builds an unscoped forced-colors page scan.
 *
 * @param file - Top-level self-site page.
 * @returns Scenario scanned in both OS color schemes without exclusions.
 */
function forcedColorsPageScenario(file: string): InteractionScenario {
  return {
    name: FORCED_COLORS_PAGES, page: file, viewport: DESKTOP, variants: FORCED_VARIANTS,
    engines: FORCED_COLORS_ENGINES,
    setup: async (page) => { await page.emulateMedia({ forcedColors: 'active' }); },
    assertState: async (page) => {
      if (!await page.evaluate(() => matchMedia('(forced-colors: active)').matches)) {
        throw new Error('expected forced colors on the whole page');
      }
    }
  };
}

/** Open popover text, box, and the arrow that connects it to its trigger. */
const FORCED_POPOVER: InteractionScenario = {
  name: 'forced-colors-popover', page: 'components.html', viewport: DESKTOP,
  variants: FORCED_VARIANTS,
  engines: FORCED_COLORS_ENGINES,
  setup: async (page) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.locator('[data-bs-toggle="popover"]').first().click();
    await expectVisible(page.locator('.popover.show'), 'the open popover');
    await page.mouse.move(0, 0);
  },
  assertState: async (page) => {
    await expectVisible(page.locator('.popover.show'), 'the open popover');
    const problems = await page.locator('.popover.show').evaluate((el) => {
      const found: string[] = [];
      const { system } = (window as unknown as ColorWindow).a11yColor;
      const ink = system('CanvasText');
      const paper = system('Canvas');
      for (const text of el.querySelectorAll('.popover-header, .popover-body')) {
        if (getComputedStyle(text).color !== ink || !text.textContent?.trim()) {
          found.push('popover text must retain system ink and content');
        }
      }
      const box = getComputedStyle(el);
      if (box.borderTopColor !== ink || Number.parseFloat(box.borderTopWidth) < 1) {
        found.push('popover box must have a system-ink border');
      }
      // Chromium forces transparent triangle borders to ink as well, turning the arrow
      // into a rectangle (before crops: 145 ink pixels, only 8 background pixels).
      // Preserve transparency on both triangles; only the outline and fill use system colors.
      const arrow = el.querySelector('.popover-arrow')!;
      for (const pseudo of ['::before', '::after']) {
        const style = getComputedStyle(arrow, pseudo);
        const colors = [style.borderTopColor, style.borderRightColor,
          style.borderBottomColor, style.borderLeftColor];
        if (colors.filter((color) => color === 'rgba(0, 0, 0, 0)').length !== 3) {
          found.push(`${pseudo} must keep three transparent triangle borders`);
        }
        const widths = [style.borderTopWidth, style.borderRightWidth,
          style.borderBottomWidth, style.borderLeftWidth];
        const expected = pseudo === '::before' ? ink : paper;
        if (!colors.some((color, index) => color === expected && Number.parseFloat(widths[index]) > 0)) {
          found.push(`${pseudo} must have a nonzero visible system-color triangle side`);
        }
      }
      return found;
    });
    if (problems.length) {
      throw new Error(`forced-colors popover: ${problems.join('; ')}`);
    }
  }
};

/** A viewport rectangle, in CSS pixels, where a forced-colors state cue must paint. */
interface CueRegion {
  /** What the region shows, for failure messages. */
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Smallest share of the region's pixels that entering the state must visibly change. */
  share: number;
}

/** A selected, current, pressed, checked, or disabled state that forced colors must keep visible. */
interface ForcedStateCue {
  /** Name used in failure messages; it also tags the element while it is measured. */
  name: string;
  /** The element whose state is toggled: the first match on `components.html`. */
  selector: string;
  /** Matches that element while it is in the state, as Bootstrap or the skin marks it. */
  state: string;
  /** Puts the element into the state (`on`) or takes it out, as its widget does. Runs in the page. */
  toggle: (element: Element, on: boolean) => void;
  /**
   * Smallest share of the element's box that the state must visibly change. The default, `.1`, is
   * met by the inset 3px selection ring on the largest box here, a list-group item (about 13%).
   */
  share?: number;
  /** Regions the state paints, for a cue drawn outside the element's own box. Runs in the page. */
  regions?: (element: Element) => CueRegion[];
  /** System color the element's text must compute to in the state, and not out of it. */
  ink?: string;
  /** Descendant that takes keyboard focus for the element, when the element itself does not. */
  focus?: string;
}

/**
 * Smallest change, in 8-bit levels on any channel, that counts a pixel as visibly changed.
 * Bootstrap's transitions and antialiasing leave small differences in a state that forced colors
 * flattens, so exact pixel identity is too strict a test of a lost cue.
 */
const VISIBLE_CHANGE = 48;

/** The showcase's toggle button; the playground's preview renders another one. */
const TOGGLE_BUTTON = '.btn[data-bs-toggle="button"]:not(.supa-playground *)';

/**
 * Toggles a class and the ARIA attribute that mirrors it, as Bootstrap's tab and button plugins do.
 *
 * @param element - Element to toggle.
 * @param on - Whether to enter the state.
 */
function toggleActive(element: Element, on: boolean): void {
  element.classList.toggle('active', on);
  for (const attribute of ['aria-selected', 'aria-pressed']) {
    if (element.hasAttribute(attribute)) {
      element.setAttribute(attribute, String(on));
    }
  }
}

/**
 * Toggles a disabled class and the `aria-disabled` that mirrors it on a link-like item.
 *
 * @param element - Element to toggle.
 * @param on - Whether to disable it.
 */
function toggleDisabled(element: Element, on: boolean): void {
  element.classList.toggle('disabled', on);
  if (on) {
    element.setAttribute('aria-disabled', 'true');
  } else {
    element.removeAttribute('aria-disabled');
  }
}

/**
 * Finds the box of an element's text, where a disabled state changes only the ink. Runs in the
 * page.
 *
 * @param element - Element whose text to box.
 * @returns One region around the text.
 */
function textBox(element: Element): CueRegion[] {
  const range = document.createRange();
  range.selectNodeContents(element);
  const { x, y, width, height } = range.getBoundingClientRect();
  // GrayText repaints only the glyphs, about a quarter of their box.
  return [{ name: 'label', x, y, width, height, share: .05 }];
}

/**
 * States Bootstrap and the skin draw only with author colors, which forced colors replaces with
 * the same system colors in and out of the state. The showcase has no radio, no toggle button
 * group (`.btn-check`), no active list-group item, and no disabled list-group item or nav link,
 * so `forced-colors-states` adds them (`#supaForcedStates`).
 */
const FORCED_STATE_CUES: readonly ForcedStateCue[] = [
  ...['#supaForcedRadio', '#supaForcedRadioDisabled'].map((selector): ForcedStateCue => ({
    name: selector === '#supaForcedRadio' ? 'checked radio' : 'checked disabled radio',
    selector,
    state: ':checked',
    toggle: (element, on) => {
      (element as HTMLInputElement).checked = on;
    },
    // Measure only the dot, inset a quarter of the radio's size: a disabled radio also fades its
    // ring when checked, which would otherwise count as a cue.
    regions: (element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return [{
        name: 'dot', x: x + width / 4, y: y + height / 4, width: width / 2, height: height / 2, share: .4
      }];
    }
  })),
  { name: 'active nav pill', selector: '.nav-pills .nav-link.active', state: '.active', toggle: toggleActive },
  {
    // Doxia drops the authored `aria-current`; the toggle restores it with the class.
    name: 'current page', selector: '.page-item.active', state: '.active',
    toggle: (element, on) => {
      element.classList.toggle('active', on);
      if (on) {
        element.setAttribute('aria-current', 'page');
      } else {
        element.removeAttribute('aria-current');
      }
    }
  },
  {
    name: 'disabled page', selector: '.page-item.disabled', state: '.disabled',
    // Only the label's ink changes, about an eighth of the link's pixels.
    share: .05,
    toggle: (element, on) => {
      element.classList.toggle('disabled', on);
    }
  },
  { name: 'active button', selector: '.btn-group .btn.active', state: '.active', toggle: toggleActive },
  {
    name: 'pressed toggle button', selector: TOGGLE_BUTTON,
    state: '.active[aria-pressed="true"]',
    // Bootstrap's button plugin toggles both the class and `aria-pressed` on click.
    toggle: (element, on) => {
      if (element.classList.contains('active') !== on) {
        (element as HTMLElement).click();
      }
    }
  },
  // Bootstrap 6 nests the input in its label button and clips it, so only the label shows the state.
  ...['checkbox', 'radio'].map((type): ForcedStateCue => ({
    name: `checked ${type} toggle button`, selector: `#supaForcedStates .btn-check:has(input[type="${type}"])`,
    state: ':has(input:checked)', focus: 'input',
    toggle: (element, on) => {
      element.querySelector('input')!.checked = on;
    }
  })),
  {
    name: 'disabled list-group item', selector: '#supaForcedStates a.list-group-item', state: '.disabled',
    ink: 'GrayText', regions: textBox, toggle: toggleDisabled
  },
  {
    name: 'disabled nav link', selector: '#supaForcedStates .nav-link', state: '.disabled',
    ink: 'GrayText', regions: textBox, toggle: toggleDisabled
  },
  { name: 'active chip', selector: '.chip.active', state: '.active', toggle: toggleActive },
  {
    name: 'active list-group item', selector: '#supaForcedStates .list-group-item.active',
    state: '.active', toggle: toggleActive
  },
  {
    // A link, secondary text, and a badge keep their own forced colors unless the rule reaches them.
    name: 'rich active list-group item', selector: '#supaForcedStates .list-group-item.active:has(a)',
    state: '.active', toggle: toggleActive
  },
  {
    name: 'active stepper item', selector: '.stepper-item.active:has(+ .stepper-item.active)',
    state: '.active', toggle: toggleActive,
    // The counter is the item's ::before; its ::after connects it to the next active item.
    regions: (element) => {
      const size = Number.parseFloat(getComputedStyle(element, '::before').width);
      const item = element.getBoundingClientRect();
      const next = element.nextElementSibling!.getBoundingClientRect();
      const center = item.left + item.width / 2;
      const nextCenter = next.left + next.width / 2;
      if (Math.abs(next.top - item.top) > 1 || nextCenter - center < size + 8) {
        throw new Error(`forced-colors stepper must be horizontal: ${JSON.stringify({item, next})}`);
      }
      return [
        { name: 'counter', x: center - size / 2, y: item.top, width: size, height: size, share: .2 },
        {
          name: 'connector', x: center + size / 2 + 2, y: item.top + size / 2 - 3,
          width: nextCenter - center - size - 4, height: 6, share: .2
        }
      ];
    }
  },
  {
    name: 'pressed playground pill', selector: '.supa-playground-pill[aria-pressed="true"]',
    state: '.active[aria-pressed="true"]', toggle: toggleActive
  }
];

/**
 * Photographs regions of the page once running transitions settle.
 *
 * @param page - Page to photograph.
 * @param regions - Viewport regions in CSS pixels.
 * @returns Each region's screenshot as base64 PNG.
 */
async function shootRegions(page: Page, regions: readonly CueRegion[]): Promise<string[]> {
  await settleTransitions(page);
  const shots: string[] = [];
  for (const { x, y, width, height } of regions) {
    const shot = await page.screenshot({ clip: { x, y, width, height }, animations: 'disabled' });
    shots.push(shot.toString('base64'));
  }
  return shots;
}

/**
 * Measures how much of each region visibly changes between two sets of screenshots.
 *
 * @param page - Page to decode the screenshots in.
 * @param before - Each region's first screenshot as base64 PNG.
 * @param after - The same regions' second screenshots.
 * @returns For each region, the share of pixels whose largest channel change exceeds
 *     `VISIBLE_CHANGE`.
 */
async function visibleChange(page: Page, before: readonly string[], after: readonly string[]):
    Promise<number[]> {
  return page.evaluate(async ({ first, second, threshold }) => {
    const { decode } = (window as unknown as ColorWindow).a11yColor;
    const shares: number[] = [];
    for (let index = 0; index < first.length; index++) {
      const a = (await decode(first[index])).data;
      const b = (await decode(second[index])).data;
      let changed = 0;
      for (let offset = 0; offset < a.length; offset += 4) {
        if ([0, 1, 2].some((channel) => Math.abs(a[offset + channel] - b[offset + channel]) > threshold)) {
          changed++;
        }
      }
      shares.push(changed / (a.length / 4));
    }
    return shares;
  }, { first: [...before], second: [...after], threshold: VISIBLE_CHANGE });
}

/** A link inside a selected list-group item, which forced colors paints on the selection fill. */
const SELECTED_LINK = '#supaForcedStates .list-group-item.active a';

/** A line box of text inside a selected element, with the color its text computes to. */
interface TextRegion extends CueRegion {
  /** Computed text color, as `getComputedStyle` reports it. */
  ink: string;
}

/**
 * Finds the line boxes of an element's text, or the digit of a stepper item's ::before counter.
 * Runs in the page.
 *
 * @param element - Element in its selected state.
 * @returns One region per line box, each with its computed text color.
 */
function selectedTextRegions(element: Element): TextRegion[] {
  if (element.matches('.stepper-item')) {
    // The counter's digit sits centered in the circle, at the top of the item.
    const item = element.getBoundingClientRect();
    const size = Number.parseFloat(getComputedStyle(element, '::before').width);
    return [{
      name: 'counter digit', x: item.left + item.width / 2 - 6, y: item.top + size / 2 - 6,
      width: 12, height: 12, share: 0, ink: getComputedStyle(element, '::before').color
    }];
  }
  const regions: TextRegion[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent!.trim();
    if (!text) {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.width > 2 && rect.height > 2) {
        regions.push({
          name: `"${text.slice(0, 24)}"`, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          share: 0, ink: getComputedStyle(node.parentElement!).color
        });
      }
    }
  }
  return regions;
}

/**
 * Measures text against the pixels actually painted under it: the most common pixel of each line
 * box is its fill, including the Canvas backplate Chromium draws behind forced text, and the
 * computed text color must reach 4.5:1 against it and appear in the box.
 *
 * @param page - Page to photograph.
 * @param regions - Line boxes from `selectedTextRegions`.
 * @returns Failure messages, empty when every line box reads.
 */
async function expectPaintedTextContrast(page: Page, regions: readonly TextRegion[]): Promise<string[]> {
  const shots = await shootRegions(page, regions);
  return page.evaluate(async ({ boxes, images, minimum }) => {
    const { rgba, contrast, decode } = (window as unknown as ColorWindow).a11yColor;
    const found: string[] = [];
    for (const [index, box] of boxes.entries()) {
      const { data } = await decode(images[index]);
      // Resolve the computed color to the screenshot's 8-bit sRGB.
      const ink = rgba(box.ink).slice(0, 3).map((channel) => Math.round(channel * 255));
      const counts = new Map<number, number>();
      for (let offset = 0; offset < data.length; offset += 4) {
        const key = (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const mode = [...counts].reduce((best, entry) => entry[1] > best[1] ? entry : best)[0];
      const paper = [mode >> 16, (mode >> 8) & 255, mode & 255];
      // Thin antialiased glyphs rarely reach the exact ink, so count pixels nearer ink than paper.
      let inked = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        const distance = (color: number[]): number =>
          color.reduce((sum, channel, i) => sum + (data[offset + i] - channel) ** 2, 0);
        if (distance(ink) < distance(paper)) {
          inked++;
        }
      }
      const ratio = contrast(ink.map((channel) => channel / 255), paper.map((channel) => channel / 255));
      if (ratio < minimum) {
        found.push(`${box.name}: rgb(${ink.join(', ')}) text on painted rgb(${paper.join(', ')}) is ` +
          `${ratio.toFixed(2)}:1, need ${minimum}:1`);
      } else if (inked < data.length / 4 * .03) {
        // A computed color the screenshot does not show would make the ratio meaningless.
        found.push(`${box.name}: the computed text color rgb(${ink.join(', ')}) is not painted`);
      }
    }
    return found;
  }, { boxes: [...regions], images: shots, minimum: WCAG_MINIMUMS.AA.text });
}

/**
 * Checks that the link inside a selected list-group item stays identifiable without its color, by
 * its underline, and shows keyboard focus on the selection fill.
 *
 * @param page - `components.html` with forced colors active and `#supaForcedStates` added.
 * @returns Failure messages, empty when the link is underlined and its focus visible.
 */
async function expectSelectedLinkIdentified(page: Page): Promise<string[]> {
  const failures: string[] = [];
  const link = page.locator(SELECTED_LINK);
  await link.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.mouse.move(0, 0);
  await link.blur();
  if (await link.evaluate((el) => el.matches(':focus'))) {
    throw new Error('forced-colors selected link: the resting link must not have focus');
  }
  if (!(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).includes('underline')) {
    failures.push('selected link: must stay underlined, since it shares the item\'s text color');
  }
  const regions = await link.evaluate((el) => {
    const { x, y, width, height } = el.getBoundingClientRect();
    return [{ name: 'focus', x: x - 4, y: y - 4, width: width + 8, height: height + 8, share: .05 }];
  });
  const resting = await shootRegions(page, regions);
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expectFocused(page, link, 'the selected item\'s link');
  if (!await link.evaluate((el) => el.matches(':focus-visible'))) {
    throw new Error('forced-colors selected link: keyboard focus must match :focus-visible');
  }
  const focused = await shootRegions(page, regions);
  await link.blur();
  const [change] = await visibleChange(page, resting, focused);
  if (change < regions[0].share) {
    failures.push(`selected link: keyboard focus changes ${(change * 100).toFixed(1)}% of pixels, ` +
      `need ${regions[0].share * 100}%`);
  }
  return failures;
}

/**
 * Finds where an inactive stepper item draws its structure: the left quarter of its counter circle,
 * clear of the centered digit, and the connector to the next item. Runs in the page.
 *
 * @param element - A `.stepper-item` in a horizontal stepper.
 * @returns The counter's edge, and the connector unless the item is the last.
 */
function inactiveStepperRegions(element: Element): CueRegion[] {
  const size = Number.parseFloat(getComputedStyle(element, '::before').width);
  const item = element.getBoundingClientRect();
  const center = item.left + item.width / 2;
  const label = `item ${[...element.parentElement!.children].indexOf(element) + 1}`;
  const regions = [{
    name: `${label} counter edge`, x: center - size / 2, y: item.top, width: size / 4, height: size, share: .05
  }];
  const next = element.nextElementSibling?.getBoundingClientRect();
  if (next) {
    const nextCenter = next.left + next.width / 2;
    if (Math.abs(next.top - item.top) > 1 || nextCenter - center < size + 8) {
      throw new Error(`forced-colors stepper must be horizontal: ${JSON.stringify({item, next})}`);
    }
    regions.push({
      name: `${label} connector`, x: center + size / 2 + 2, y: item.top + size / 2 - 3,
      width: nextCenter - center - size - 4, height: 6, share: .2
    });
  }
  return regions;
}

/**
 * Checks that an inactive stepper keeps its structure: forced colors repaints Bootstrap's counter
 * circles and connectors as `Canvas`, leaving bare digits. Only the first item stays active, so the
 * stepper shows a connector from the last active item and one between two inactive items; each
 * region is photographed with the stepper shown and hidden, and the inactive digit must read.
 *
 * @param page - `components.html` with forced colors active.
 * @returns Failure messages, empty when every counter edge and connector stands out from the page.
 */
async function expectInactiveStepper(page: Page): Promise<string[]> {
  // Tag the stepper: deactivating its items stops the selector from matching it.
  await page.locator('.stepper:has(> .stepper-item.active + .stepper-item.active)').first()
    .evaluate((el) => el.setAttribute('data-supa-forced-stepper', ''));
  const stepper = page.locator('[data-supa-forced-stepper]');
  await stepper.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.mouse.move(0, 0);
  const active = await stepper.evaluate((el) => [...el.children].map((item) => item.classList.contains('active')));
  await stepper.evaluate((el) => {
    [...el.children].forEach((item, index) => item.classList.toggle('active', index === 0));
  });
  const items = stepper.locator(':scope > .stepper-item');
  const regions: CueRegion[] = [];
  for (let index = 0; index < await items.count(); index++) {
    const found = await items.nth(index).evaluate(inactiveStepperRegions);
    // The first item is active; keep only its connector, which leads to an inactive item.
    regions.push(...(index === 0 ? found.slice(1) : found));
  }
  const shown = await shootRegions(page, regions);
  const failures = (await expectPaintedTextContrast(page, await items.nth(1).evaluate(selectedTextRegions)))
    .map((problem) => `inactive stepper ${problem}`);
  await stepper.evaluate((el) => {
    (el as HTMLElement).style.visibility = 'hidden';
  });
  const hidden = await shootRegions(page, regions);
  await stepper.evaluate((el, states) => {
    (el as HTMLElement).style.visibility = '';
    [...el.children].forEach((item, index) => item.classList.toggle('active', states[index]));
  }, active);
  const shares = await visibleChange(page, hidden, shown);
  regions.forEach((region, index) => {
    if (shares[index] < region.share) {
      failures.push(`inactive stepper ${region.name}: ${(shares[index] * 100).toFixed(1)}% of pixels ` +
        `differ from the page, need ${region.share * 100}%`);
    }
  });
  return failures;
}

/**
 * Asserts that every `FORCED_STATE_CUES` state visibly changes its element in forced colors, that a
 * disabled page link, list-group item, and nav link read as `GrayText`, that an inactive stepper
 * keeps its counters and connectors, and that keyboard focus on a nav pill, a playground pill, and
 * a checkbox and radio toggle button looks different from their resting selection, unselected or
 * selected.
 *
 * @param page - `components.html` with forced colors active and `#supaForcedStates` added.
 */
async function expectForcedStateCues(page: Page): Promise<void> {
  if (!await page.evaluate(() => matchMedia('(forced-colors: active)').matches)) {
    throw new Error('Forced colors must be active');
  }
  const failures: string[] = [];
  for (const cue of FORCED_STATE_CUES) {
    // Tag the element once: toggling its state can make `cue.selector` match another one.
    const element = page.locator(`[data-supa-forced-cue="${cue.name}"]`);
    if (!await element.count()) {
      await page.locator(cue.selector).first().evaluate((el, name) => {
        el.setAttribute('data-supa-forced-cue', name);
      }, cue.name, { timeout: STATE_TIMEOUT_MS });
    }
    await element.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.mouse.move(0, 0);
    const initial = await element.evaluate((el, state) => el.matches(state), cue.state);
    const regions = cue.regions ? await element.evaluate(cue.regions)
      : await element.evaluate((el, share) => {
        const { x, y, width, height } = el.getBoundingClientRect();
        return [{ name: 'box', x, y, width, height, share }];
      }, cue.share ?? .1);
    const shots: string[][] = [];
    for (const on of [true, false]) {
      await element.evaluate(cue.toggle, on);
      if (await element.evaluate((el, state) => el.matches(state), cue.state) !== on) {
        throw new Error(`forced-colors ${cue.name}: could not ${on ? 'enter' : 'leave'} ${cue.state}`);
      }
      shots.push(await shootRegions(page, regions));
      if (cue.ink) {
        const ink = await element.evaluate((el, name) => ({
          system: (window as unknown as ColorWindow).a11yColor.system(name), text: getComputedStyle(el).color
        }), cue.ink);
        if ((ink.text === ink.system) !== on) {
          failures.push(`${cue.name}: text must compute ${on ? '' : 'other than '}${cue.ink} ` +
            `${on ? 'in' : 'out of'} ${cue.state}: ${JSON.stringify(ink)}`);
        }
      }
      if (on) {
        const text = await element.evaluate(selectedTextRegions);
        failures.push(...(await expectPaintedTextContrast(page, text)).map((problem) => `${cue.name} ${problem}`));
      }
    }
    await element.evaluate(cue.toggle, initial);
    if (await element.evaluate((el, state) => el.matches(state), cue.state) !== initial) {
      throw new Error(`forced-colors ${cue.name}: could not restore ${cue.state}`);
    }
    const shares = await visibleChange(page, shots[0], shots[1]);
    regions.forEach((region, index) => {
      if (shares[index] < region.share) {
        failures.push(`${cue.name} ${region.name}: ${(shares[index] * 100).toFixed(1)}% of pixels ` +
          `change, need ${region.share * 100}%`);
      }
    });
  }
  const ink = await page.locator('.page-item.disabled > .page-link').first().evaluate((el) => {
    const gray = (window as unknown as ColorWindow).a11yColor.system('GrayText');
    const enabled = document.querySelector('.page-item:not(.disabled, .active) > .page-link')!;
    return { gray, disabled: getComputedStyle(el).color, enabled: getComputedStyle(enabled).color };
  });
  if (ink.disabled !== ink.gray || ink.enabled === ink.gray) {
    failures.push(`disabled page link must read as GrayText against enabled links: ${JSON.stringify(ink)}`);
  }
  failures.push(...await expectSelectedLinkIdentified(page));
  failures.push(...await expectInactiveStepper(page));
  // A resting outline must not stand in for the focus ring: compare a selected, unfocused item with
  // the same item focused by keyboard, both unselected and selected.
  for (const name of ['active nav pill', 'pressed playground pill', 'checked checkbox toggle button',
    'checked radio toggle button']) {
    const cue = FORCED_STATE_CUES.find((candidate) => candidate.name === name)!;
    const element = page.locator(`[data-supa-forced-cue="${name}"]`);
    const target = cue.focus ? element.locator(cue.focus) : element;
    await element.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.mouse.move(0, 0);
    // Pad the box so an outline drawn outside it counts.
    const regions = await element.evaluate((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return [{ name: 'box', x: x - 6, y: y - 6, width: width + 12, height: height + 12, share: .05 }];
    });
    await target.blur();
    if (await target.evaluate((el) => el.matches(':focus'))) {
      throw new Error(`forced-colors ${name}: the resting item must not have focus`);
    }
    const resting = await shootRegions(page, regions);
    await element.evaluate(cue.toggle, false);
    await target.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expectFocused(page, target, name);
    if (!await target.evaluate((el) => el.matches(':focus-visible'))) {
      throw new Error(`forced-colors ${name}: keyboard focus must match :focus-visible`);
    }
    const focusedOff = await shootRegions(page, regions);
    await element.evaluate(cue.toggle, true);
    const focusedOn = await shootRegions(page, regions);
    await target.blur();
    const [unselected] = await visibleChange(page, resting, focusedOff);
    const [selected] = await visibleChange(page, resting, focusedOn);
    if (unselected < regions[0].share || selected < regions[0].share) {
      failures.push(`${name}: keyboard focus must look different from resting selection ` +
        `(unselected ${(unselected * 100).toFixed(1)}%, selected ${(selected * 100).toFixed(1)}% ` +
        `of pixels change, need ${regions[0].share * 100}%)`);
    }
  }
  await page.mouse.move(0, 0);
  if (failures.length) {
    throw new Error(`forced-colors states: ${failures.join('; ')}`);
  }
}

/** Selected, current, pressed, checked, and disabled component states in forced colors. */
const FORCED_STATES: InteractionScenario = {
  name: 'forced-colors-states', page: 'components.html', viewport: DESKTOP,
  variants: FORCED_VARIANTS,
  engines: FORCED_COLORS_ENGINES,
  setup: async (page) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.locator('#checkMermaid').evaluate((check) => {
      check.closest('.form-field')!.insertAdjacentHTML('afterend', '<div id="supaForcedStates">' +
        '<div class="form-field"><input class="radio" type="radio" id="supaForcedRadio" ' +
        'name="supaForcedRadio" checked /><label for="supaForcedRadio">Checked radio</label></div>' +
        '<div class="form-field"><input class="radio" type="radio" id="supaForcedRadioDisabled" ' +
        'name="supaForcedRadioDisabled" checked disabled />' +
        '<label for="supaForcedRadioDisabled">Disabled checked radio</label></div>' +
        '<div class="list-group"><span class="list-group-item">Item</span>' +
        '<span class="list-group-item active" aria-current="true">Active item</span>' +
        '<div class="list-group-item active">Rich item <a href="#supaForcedStates">Read details</a> ' +
        '<small class="text-body-secondary">Secondary</small> <span class="badge theme-primary">Badge</span>' +
        '</div><a class="list-group-item list-group-item-action" href="#supaForcedStates">Linked item</a>' +
        '</div><nav class="nav"><a class="nav-link" href="#supaForcedStates">Nav link</a></nav>' +
        '<div class="btn-group" role="group" aria-label="Checkbox toggle buttons">' +
        '<label class="btn-check btn-outline theme-primary"><input type="checkbox" checked />Checked</label>' +
        '<label class="btn-check btn-outline theme-primary"><input type="checkbox" />Unchecked</label></div> ' +
        '<div class="btn-group" role="group" aria-label="Radio toggle buttons">' +
        '<label class="btn-check btn-solid theme-primary"><input type="radio" name="supaForcedToggle" checked />' +
        'Checked</label><label class="btn-check btn-solid theme-primary">' +
        '<input type="radio" name="supaForcedToggle" />Unchecked</label></div></div>');
    });
    await page.locator(TOGGLE_BUTTON).evaluate((el) => (el as HTMLElement).click());
    await page.mouse.move(0, 0);
  },
  assertState: async (page) => {
    if (await page.locator(TOGGLE_BUTTON).getAttribute('aria-pressed') !== 'true') {
      throw new Error('forced-colors states: the toggle button must be pressed');
    }
    await expectForcedStateCues(page);
  }
};

/** The range slider's value bubble on `components.html`, which reuses Bootstrap's tooltip markup. */
const RANGE_TOOLTIP = '.supa-article .form-range-bubble.tooltip.show';

/**
 * Builds a scan of the range slider's always-shown value bubble, the tooltip axe reported in dark
 * forced colors. In forced colors it also asserts the system-color text fill and border.
 *
 * @param forced - Whether to emulate forced colors.
 * @returns Scenario scoped to the bubble.
 */
function rangeTooltipScenario(forced: boolean): InteractionScenario {
  return {
    name: forced ? 'forced-colors-tooltip' : 'range-tooltip',
    page: 'components.html',
    viewport: DESKTOP,
    variants: forced
      ? [{ palette: 'furo', polarity: 'light' }, { palette: 'furo', polarity: 'dark' }]
      : ALL_VARIANTS,
    engines: forced ? FORCED_COLORS_ENGINES : undefined,
    scope: [RANGE_TOOLTIP],
    setup: async (page) => {
      if (forced) {
        await page.emulateMedia({ forcedColors: 'active' });
      }
      // axe measures text only inside the viewport.
      await page.locator(RANGE_TOOLTIP).scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
    },
    assertState: async (page) => {
      const inner = page.locator(`${RANGE_TOOLTIP} .tooltip-inner`);
      await expectVisible(inner, 'the range slider value bubble');
      if (!forced) {
        return;
      }
      const problems = await inner.evaluate((el) => {
        if (!matchMedia('(forced-colors: active)').matches) {
          return ['forced colors must be active'];
        }
        const ink = (window as unknown as ColorWindow).a11yColor.system('CanvasText');
        const style = getComputedStyle(el);
        const found: string[] = [];
        // axe reads the text fill before `color`, so it must resolve to the forced ink too.
        if (style.color !== ink || style.webkitTextFillColor !== ink) {
          found.push(`text ${style.color} filled ${style.webkitTextFillColor}, expected ${ink}`);
        }
        if (style.borderTopStyle !== 'solid' || Number.parseFloat(style.borderTopWidth) < 1 ||
            style.borderTopColor !== ink) {
          found.push(`border ${style.borderTopStyle} ${style.borderTopWidth} ${style.borderTopColor}`);
        }
        return found;
      });
      if (problems.length) {
        throw new Error(`forced-colors tooltip: ${problems.join('; ')}`);
      }
    }
  };
}

/**
 * Interactive states scanned on top of the load-time matrix, each in its
 * `variants` (by default every `SCENARIO_VARIANTS` entry). Selectors target the
 * skin's own markup from `site.vm`, `site-macros.vm`, and the TypeScript
 * enhancers, and each `assertState` pins the exact element its `setup`
 * toggled, so a state left open elsewhere on the page cannot stand in for it.
 */
const SCENARIOS: readonly InteractionScenario[] = [
  FORCED_POPOVER,
  ...(['controls-tabs', 'palettes', 'search'] as const).map(forcedColorsScenario),
  FORCED_STATES,
  ...[false, true].map(rangeTooltipScenario),
  tocLinkFocusScenario('toc-link-focus-mobile', MOBILE, 'reduce'),
  tocLinkFocusScenario('toc-link-focus-tablet', TABLET_LANDSCAPE, 'reduce'),
  tocLinkFocusScenario('toc-link-focus-smooth-mobile', MOBILE, 'no-preference'),
  tocLinkFocusScenario('toc-link-focus-smooth-tablet', TABLET_LANDSCAPE, 'no-preference'),
  sidebarLinkFocusScenario('sidebar-link-focus-mobile', MOBILE, 'reduce'),
  sidebarLinkFocusScenario('sidebar-link-focus-desktop', DESKTOP, 'reduce'),
  sidebarLinkFocusScenario('sidebar-link-focus-smooth-mobile', MOBILE, 'no-preference'),
  sidebarLinkFocusScenario('sidebar-link-focus-smooth-desktop', DESKTOP, 'no-preference'),
  HEADING_NAMES,
  ...DRAWER_ROLE_LAYOUTS.map(({ fontPx, viewport }) => drawerRolesScenario(fontPx, viewport)),
  ...LARGE_FONT_PAGES.flatMap((file) => LARGE_DEFAULT_FONTS.flatMap((fontPx) =>
    LARGE_FONT_WIDTHS.map((width) => largeDefaultFontScenario(file, fontPx, width)))),
  {
    name: 'control-boundaries-focus',
    page: 'components.html',
    viewport: DESKTOP,
    variants: ALL_VARIANTS,
    setup: async (page) => {
      await page.locator('.otp-slot').first().waitFor();
      await page.locator('.otp-input').fill('');
      await page.locator('#checkMermaid').uncheck();
      await page.locator('#switchCopyBtn').uncheck();
      // The showcase has no radio, so add an unchecked one beside the checkbox it mirrors.
      await page.locator('#checkMermaid').evaluate((check) => {
        check.closest('.form-field')!.insertAdjacentHTML('afterend', '<div class="form-field">' +
          '<input class="radio" type="radio" id="supaBoundaryRadio" name="supaBoundaryRadio" />' +
          '<label for="supaBoundaryRadio">Unchecked radio</label></div>');
      });
      // The showcase's switch is unthemed. Mirror it in every Bootstrap theme and state.
      await page.locator('#switchCopyBtn').evaluate((switchInput) => {
        const fixture = document.createElement('div');
        fixture.id = 'supaThemedSwitches';
        for (const theme of ['primary', 'accent', 'success', 'info', 'warning', 'danger',
          'secondary', 'inverse']) {
          for (const state of ['unchecked', 'checked', 'disabled', 'checked-disabled']) {
            const id = `supaSwitch-${theme}-${state}`;
            fixture.insertAdjacentHTML('beforeend', `<div class="form-field"><div class="switch theme-${theme}">` +
              `<input type="checkbox" role="switch" id="${id}"` +
              `${state === 'checked' || state === 'checked-disabled' ? ' checked' : ''}` +
              `${state.includes('disabled') ? ' disabled' : ''} /></div>` +
              `<label for="${id}">${theme} ${state}</label></div>`);
          }
        }
        switchInput.closest('.form-field')!.after(fixture);
      });
      // Bootstrap's roving tabs skip inactive pills. Make this one reachable for a
      // keyboard-only focus probe without the arrow key also activating its panel.
      await page.locator('[data-bs-target="#bsTabGradle"]').evaluate((el) => {
        el.setAttribute('tabindex', '0');
      });
      await page.locator('[data-bs-target="#bsTabMaven"]').focus();
      await page.keyboard.press('Tab');
      await page.mouse.move(0, 0);
      await settleTransitions(page);
    },
    assertState: async (page) => {
      await expectControlValidationBorders(page);
      await expectControlContrast(page);
    }
  },
  ...[1440, 390, 320].flatMap((width): InteractionScenario[] =>
    [false, true].map((open): InteractionScenario => ({
      name: `documentation-channels-${width}-${open ? 'open' : 'closed'}`,
      page: 'components.html',
      viewport: { width, height: 900 },
      variants: ALL_VARIANTS,
      // The open scans Tab from the summary into the version links.
      engines: open ? TAB_ORDER_ENGINES : undefined,
      scope: ['.documentation-channels'],
      setup: async (page) => {
        // Closed scans follow the OS; open scans retain explicit polarity against the OS.
        const polarity = await page.locator('html').getAttribute('data-bs-theme');
        if (open) {
          await page.emulateMedia({ colorScheme: polarity === 'dark' ? 'light' : 'dark' });
        } else {
          await page.locator('html').evaluate((el) => el.removeAttribute('data-bs-theme'));
        }
        // Exercise a placement outside the article and the canonical class name too.
        if (width === 1440) {
          await page.locator('.documentation-channels').evaluate((el) => {
            document.querySelector('main')?.before(el);
            el.classList.add('supa-documentation-channels');
          });
        }
        const summary = page.locator('.documentation-version-picker > summary');
        await summary.focus();
        if (open) {
          await page.keyboard.press('Enter');
          await page.keyboard.press('Tab');
          // Firefox makes a scrolling element a tab stop even when it holds links, and the version
          // list scrolls at this height, so its first Tab stops on the list, with a visible focus
          // ring; the next one reaches the first link, where the other engines stop at once.
          if (await page.evaluate(() => document.activeElement?.matches('.documentation-version-picker ul'))) {
            await page.keyboard.press('Tab');
          }
          await page.locator('.documentation-version-picker li a').last().hover();
        }
      },
      assertState: async (page) => {
        const picker = page.locator('.documentation-version-picker');
        if (await picker.evaluate((el) => el.hasAttribute('open')) !== open) {
          throw new Error('Version disclosure did not reach the expected state');
        }
        await expectFocused(page, page.locator(open
          ? '.documentation-version-picker li a:first-child'
          : '.documentation-version-picker > summary').first(), 'version navigation');
        const fits = await page.locator('.documentation-channels').evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= window.innerWidth && el.scrollWidth <= el.clientWidth;
        });
        if (!fits) {
          throw new Error('Documentation channels overflow the viewport');
        }
        await expectChannelSemantics(page);
      }
    }))
  ),
  {
    name: 'search-dialog-empty',
    page: 'index.html',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.keyboard.press('ControlOrMeta+k');
    },
    assertState: async (page) => {
      await expectVisible(page.locator('dialog#supaSearchDialog[open]'), 'the search dialog');
      // Named by the `search` label, not by an id that no element has (R-28)
      await expectVisible(page.getByRole('dialog', { name: 'Search', exact: true }), 'the search dialog by its name');
      await expectFocused(page, page.locator('#supaSearchInput'), 'the search input');
      await expectVisible(
        page.locator('#supaSearchStatus:has-text("Type to search")'),
        'the empty-query search status'
      );
    }
  },
  {
    name: 'search-dialog-results',
    page: 'index.html',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.locator('.supa-sidebar-search .supa-search-trigger').click();
      await expectFocused(page, page.locator('#supaSearchInput'), 'the search input');
      // Opening the dialog starts crawling sibling pages; when that finishes it re-renders
      // the results and resets the active option, so wait for the crawl before typing.
      // fetchSiteIndex caches the crawl in sessionStorage as it finishes, and each scan
      // starts in a fresh context, so the key appears only once this crawl is done.
      // (`waitForLoadState('networkidle')` cannot gate this: it returns at once when the
      // page went idle before the click, with the crawl still in flight.)
      await page.waitForFunction(
        () => Object.keys(window.sessionStorage).some((key) => key.startsWith('supa-search-index-')),
        undefined,
        { timeout: STATE_TIMEOUT_MS }
      );
      // A query that page titles contain, so the scan sees highlighted matches (`<mark>`) in
      // result titles as well as snippets, at rest and in the active result.
      await page.keyboard.type('configuration');
      await expectVisible(
        page.locator('#supaSearchResults > .supa-search-result-item').nth(1),
        'a second search result'
      );
      await page.keyboard.press('ArrowDown');
    },
    assertState: async (page) => {
      await expectVisible(page.locator('dialog#supaSearchDialog[open]'), 'the search dialog');
      // Strict locators: exactly one active option, and it is the second result.
      await expectVisible(
        page.locator('#supaSearchResults > .supa-search-result-item.is-active'),
        'the single active search option'
      );
      await expectVisible(
        page.locator('#supaSearchResults > .supa-search-result-item.is-active:nth-child(2)'),
        'the second search result as the active option'
      );
      const active = page.locator('#supaSearchResults > .is-active');
      const activeId = await active.getAttribute('id');
      if (!activeId) {
        throw new Error('Active search option must have an id');
      }
      await expectAttribute(active, 'aria-selected', 'true', 'the active search option');
      await expectVisible(
        page.locator('#supaSearchResults > [aria-selected="true"]'),
        'the single selected search option'
      );
      await expectAttribute(
        page.locator('#supaSearchInput'), 'aria-activedescendant', activeId, 'the search input'
      );
      await expectVisible(
        page.locator('#supaSearchResults > .is-active .supa-search-result-title mark').first(),
        'a highlighted match in the active result title'
      );
      await expectFocused(page, page.locator('#supaSearchInput'), 'the search input');
    }
  },
  {
    name: 'search-dialog-no-results',
    page: 'index.html',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.locator('.supa-sidebar-search .supa-search-trigger').click();
      await expectFocused(page, page.locator('#supaSearchInput'), 'the search input');
      // Search the whole crawled index, as in search-dialog-results, so "no results" is final.
      await page.waitForFunction(
        () => Object.keys(window.sessionStorage).some((key) => key.startsWith('supa-search-index-')),
        undefined,
        { timeout: STATE_TIMEOUT_MS }
      );
      await page.keyboard.type(NO_RESULTS_QUERY);
    },
    assertState: async (page) => {
      await expectVisible(page.locator('dialog#supaSearchDialog[open]'), 'the search dialog');
      // The status is a polite live region whose text changes to the no-results message, so a
      // screen reader announces it without moving focus from the field.
      const status = page.locator('#supaSearchStatus');
      await expectAttribute(status, 'aria-live', 'polite', 'the search status');
      await expectVisible(
        status.filter({ hasText: new RegExp(`^\\s*No results for “${NO_RESULTS_QUERY}”\\s*$`) }),
        'the no-results message in the search status'
      );
      const options = await page.locator('#supaSearchResults > *').count();
      if (options !== 0) {
        throw new Error(`expected no search results, found ${options}`);
      }
      await expectAttribute(page.locator('#supaSearchInput'), 'aria-expanded', 'false', 'the search input');
      await expectAttribute(
        page.locator('#supaSearchInput'), 'aria-activedescendant', null, 'the search input'
      );
      await expectFocused(page, page.locator('#supaSearchInput'), 'the search input');
    }
  },
  {
    name: 'sidebar-drawer',
    page: 'index.html',
    viewport: MOBILE,
    setup: openSidebarDrawer,
    assertState: async (page) => {
      await expectVisible(page.locator('dialog#supaSidebarDrawer[open]'), 'the sidebar drawer');
      // Named by its drawer title, which renders even when <sidebarHideName> hides the brand name
      await expectVisible(
        page.getByRole('dialog', { name: 'Navigation', exact: true }), 'the sidebar drawer by its name'
      );
      await expectVisible(
        page.locator('#supaSidebarDrawer .supa-drawer-header .btn-close'),
        'the sidebar drawer close button'
      );
      // The drawer footer's native color-scheme select, synced to the seeded palette by theme.ts.
      const select = page.locator('#supaSidebarDrawer .supa-sidebar-footer select[data-supa-palette-select]');
      await expectVisible(select, "the drawer's color-scheme select");
      const palette = await page.locator('html').getAttribute('data-supa-palette');
      const selected = await select.inputValue();
      if (selected !== palette) {
        throw new Error(`expected the drawer's color-scheme select to show ${palette}, got ${selected}`);
      }
    }
  },
  {
    name: 'toc-drawer',
    page: 'getting-started.html',
    viewport: TABLET,
    setup: async (page) => {
      await page.locator('.supa-content-header .supa-toc-drawer-trigger').click();
    },
    assertState: async (page) => {
      await expectVisible(page.locator('dialog#supaTocDrawer[open]'), 'the TOC drawer');
      await expectVisible(
        page.locator('#supaTocDrawer .supa-drawer-header .btn-close'),
        'the TOC drawer close button'
      );
      await expectVisible(page.locator('#supaTocNav a.nav-link').first(), 'a TOC entry');
    }
  },
  ...MENU_PLACEMENTS.flatMap((placement) => placement.kinds.map((kind) => menuScenario(placement, kind))),
  {
    name: 'copy-button-tooltip',
    page: 'index.html',
    viewport: DESKTOP,
    variants: ALL_VARIANTS,
    setup: async (page) => {
      await page.locator('#supa-main-content .supa-copy-btn').first().focus();
    },
    assertState: async (page) => {
      await expectFocused(
        page,
        page.locator('#supa-main-content .supa-copy-btn').first(),
        'the first copy button'
      );
      await expectVisible(
        page.locator('.tooltip.show[role="tooltip"]:has-text("Copy code")'),
        'the copy button tooltip'
      );
    }
  },
  {
    name: 'copy-button-copied',
    page: 'index.html',
    viewport: DESKTOP,
    engines: CLIPBOARD_ENGINES,
    permissions: ['clipboard-read', 'clipboard-write'],
    // The code blocks, plus the "Copied!" tooltip that Bootstrap appends to <body>.
    scope: ['#supa-main-content .supa-code-block', '.tooltip.show'],
    setup: async (page) => {
      await page.locator('#supa-main-content .supa-copy-btn').first().click();
    },
    assertState: async (page) => {
      const button = page.locator('#supa-main-content .supa-copy-btn').first();
      await expectAttribute(button, 'aria-label', 'Copied!', 'the first copy button');
      await expectVisible(button, 'the first copy button');
      await expectVisible(
        page.locator('.tooltip.show[role="tooltip"]:has-text("Copied!")'),
        'the "Copied!" tooltip'
      );
    }
  },
  {
    name: 'sidebar-group-expanded',
    page: 'index.html',
    viewport: DESKTOP,
    setup: async (page) => {
      // Every self-site group renders open, so collapse one from the keyboard and
      // expand it again to scan the state a reader's own toggle produces.
      const group = page.locator('.supa-sidebar-tree details.supa-nav-details').first();
      await group.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      await expectAttribute(group, 'open', null, 'the collapsed sidebar group');
      await page.keyboard.press('Enter');
    },
    assertState: async (page) => {
      const group = page.locator('.supa-sidebar-tree details.supa-nav-details').first();
      await expectVisible(group.locator(':scope > .supa-nav-sublist'), 'the re-expanded sidebar group');
      await expectFocused(page, group.locator(':scope > summary'), 'the group toggle');
    }
  },
  {
    // The self-site's only three-level branch: Reference > Configuration Reference >
    // Configuration Options > its sections. The group is collapsed and re-expanded from the
    // keyboard, as in sidebar-group-expanded.
    name: 'sidebar-depth-three',
    page: 'configuration.html',
    viewport: DESKTOP,
    setup: async (page) => {
      const group = page.locator(DEPTH_THREE_GROUP);
      await group.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      await expectAttribute(group, 'open', null, 'the collapsed third-level group');
      await page.keyboard.press('Enter');
    },
    assertState: async (page) => {
      const group = page.locator(DEPTH_THREE_GROUP);
      await expectVisible(group.locator(':scope > .supa-nav-sublist > li[data-depth="3"] a.supa-nav-link').first(),
        'a third-level sidebar link');
      await expectFocused(page, group.locator(':scope > summary'), 'the third-level group toggle');
      const problem = await page.evaluate((selector) => {
        const details = document.querySelector(selector)!;
        const item = details.parentElement!;
        // A linked parent: its link, then the <details> whose summary is named after it
        const link = item.querySelector(':scope > a.supa-nav-link');
        if (!item.matches('li.supa-nav-item.supa-nav-has-children.has-link[data-depth="2"]') ||
            link?.textContent?.trim() !== 'Configuration Options' || link.nextElementSibling !== details) {
          return `unexpected third-level parent: ${item.outerHTML.slice(0, 160)}`;
        }
        const summary = details.querySelector(':scope > summary');
        if (summary?.getAttribute('aria-label') !== 'Configuration Options section' ||
            summary.querySelector('a, button, input, select, textarea, [tabindex]')) {
          return `the third-level toggle must be named after its parent and hold no other control: ${summary?.outerHTML.slice(0, 160)}`;
        }
        const children = details.querySelectorAll(':scope > ul.supa-nav-sublist > li');
        if (children.length < 2 || [...children].some((li) => li.getAttribute('data-depth') !== '3')) {
          return `expected the third-level items at data-depth 3, got ${[...children].map((li) => li.getAttribute('data-depth')).join(', ')}`;
        }
        // Every item sits one level below the item whose sublist holds it, siblings after a
        // nested group included, and a top-level item is at depth 1.
        for (const li of document.querySelectorAll<HTMLElement>('.supa-sidebar-tree li[data-depth]')) {
          const parent = li.parentElement!.closest<HTMLElement>('li[data-depth]');
          const expected = parent ? Number(parent.dataset.depth) + 1 : 1;
          if (Number(li.dataset.depth) !== expected) {
            return `"${li.textContent?.trim().split('\n')[0]}" has data-depth ${li.dataset.depth}, expected ${expected}`;
          }
        }
        return '';
      }, DEPTH_THREE_GROUP);
      if (problem) {
        throw new Error(problem);
      }
    }
  },
  {
    name: 'accordion-expanded',
    page: 'components.html',
    viewport: DESKTOP,
    setup: async (page) => {
      // The first item starts open; open the second so the shared `name` closes the first.
      const item = page.locator('.supa-accordion').first().locator('details.accordion-item').nth(1);
      await item.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
    },
    assertState: async (page) => {
      const item = page.locator('.supa-accordion').first().locator('details.accordion-item').nth(1);
      await expectVisible(item.locator(':scope > .accordion-body'), 'the second accordion body');
      await expectFocused(page, item.locator(':scope > summary'), 'the second accordion header');
    }
  },
  {
    name: 'content-tab-switched',
    page: 'components.html',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.locator('.supa-tabs').first().locator('[role="tab"]').first().focus();
      // Arrow keys move between tabs and select them (doxia.ts initContentTabs).
      await page.keyboard.press('ArrowRight');
    },
    assertState: async (page) => {
      const tab = page.locator('.supa-tabs').first().locator('[role="tab"]').nth(1);
      await expectAttribute(tab, 'aria-selected', 'true', 'the second tab');
      await expectFocused(page, tab, 'the second tab');
      const panelId = await tab.getAttribute('aria-controls');
      await expectVisible(page.locator(`[id="${panelId}"][role="tabpanel"]`), 'the second tab panel');
    }
  },
  {
    // Doxia rewrites `href="#"` in raw HTML to `#null`, a fragment no element has, so the
    // pagination demo uses inert `span.page-link` items (R-26). The scan itself repeats the page's
    // load-time scan, so it runs in one variant.
    name: 'pagination-demo',
    page: 'components.html',
    viewport: DESKTOP,
    variants: [{ palette: 'furo', polarity: 'light' }],
    setup: async (page) => {
      await page.locator('.supa-article .pagination').first().scrollIntoViewIfNeeded();
    },
    assertState: async (page) => {
      const demo = await page.locator('.supa-article').evaluate((article) => {
        const pagination = article.querySelector('.pagination');
        const previous = pagination?.querySelector<HTMLElement>('.page-item.disabled > .page-link');
        return {
          nullLinks: article.querySelectorAll('a[href="#null"]').length,
          previous: previous?.textContent?.trim(),
          previousDisabled: previous?.getAttribute('aria-disabled'),
          previousFocusable: previous ? previous.tabIndex >= 0 : null,
          current: Array.from(pagination?.querySelectorAll('[aria-current="page"]') ?? [],
            (el) => el.textContent?.trim()).join()
        };
      });
      if (demo.nullLinks !== 0 || demo.previous !== 'Previous' || demo.previousDisabled !== 'true'
        || demo.previousFocusable !== false || demo.current !== '1') {
        throw new Error('pagination demo must link nowhere dead, disable "Previous", and mark page 1 ' +
          `current: ${JSON.stringify(demo)}`);
      }
    }
  },
  {
    // Doxia rewrites a Markdown link to a heading id that starts with a digit, such as
    // [..](#3-alerts-overlays-dialogs-drawers-toasts) in components.md, to #a3-alerts-..., the id of
    // the anchor prepareHeadings() adds before the heading. The scan itself repeats the page's
    // load-time scan, so it runs in one variant.
    name: 'numbered-heading-link',
    page: 'components.html',
    viewport: DESKTOP,
    variants: [{ palette: 'furo', polarity: 'light' }],
    setup: async (page) => {
      await page.locator('.supa-article a[href="#a3-alerts-overlays-dialogs-drawers-toasts"]').click();
    },
    assertState: async (page) => {
      await expectLandedOnHeading(
        page,
        'a3-alerts-overlays-dialogs-drawers-toasts',
        '3-alerts-overlays-dialogs-drawers-toasts'
      );
    }
  },
  // Hover fills that Bootstrap 6 derives from the theme tokens (`--<theme>-bg-muted`, darkened
  // `oklch(from ...)` text) or falls back to without a theme (`--bg-3`).
  hoverScenario('chip-hovered', '.supa-article .chip.theme-success', 'the success chip'),
  hoverScenario('unthemed-chip-hovered', '.supa-article .chip-input .chip', 'a chip-input chip'),
  hoverScenario('text-button-hovered', '.supa-article .btn-text.theme-primary', 'the text button'),
  {
    // Inline code on the solid fills of themed card caps and an active list-group item, and on
    // caps that keep the plain chip. components.html has no inline code there, so the setup adds
    // `INLINE_CODE_FILLS`. Footer text and links also cover solid, subtle, and translucent fills.
    name: 'inline-code-solid-fills',
    page: 'components.html',
    viewport: DESKTOP,
    variants: ALL_VARIANTS,
    scope: ['#supaInlineCodeFills code[data-supa-fill="solid"]', '#supaInlineCodeFills :is(.card-header, .card-footer)'],
    setup: async (page) => {
      await page.locator('.supa-article').evaluate((article, html) => {
        article.insertAdjacentHTML('beforeend', html);
      }, INLINE_CODE_FILLS);
    },
    assertState: async (page) => {
      await expectInlineCodeOnFills(page);
    }
  },
  {
    // Combobox is not in the main bundle: bootstrap-components.ts imports its chunk only because
    // components.html contains a [data-bs-toggle="combobox"] toggle. The menu opening proves the
    // chunk loaded and initialized in a real browser before data-supa-ready, with the Menu it
    // creates on the same toggle coming from the main bundle.
    name: 'combobox-open',
    page: 'components.html',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.locator('.supa-article [data-bs-toggle="combobox"]').click();
    },
    assertState: async (page) => {
      const toggle = page.locator('.supa-article [data-bs-toggle="combobox"]');
      // The plugin joins window.bootstrap only once its chunk has loaded.
      const initialized = await toggle.evaluate(
        (el) => {
          const plugins = (window as unknown as {
            bootstrap?: Record<string, { getInstance: (element: Element) => unknown } | undefined>;
          }).bootstrap;
          return Boolean(plugins?.Combobox?.getInstance(el) && plugins.Menu?.getInstance(el));
        },
        undefined,
        { timeout: STATE_TIMEOUT_MS }
      );
      if (!initialized) {
        throw new Error('expected the lazily loaded Combobox and its Menu on the combobox toggle');
      }
      await expectAttribute(toggle, 'aria-expanded', 'true', 'the combobox toggle');
      await expectVisible(page.locator('.supa-article .combobox-toggle + .menu.show'), 'the open combobox menu');
    }
  },
  {
    // The Datepicker calendar is vanilla-calendar-pro drawn by Bootstrap 6's `[data-vc]` rules, not
    // by the skin's components, so it is scanned in every variant, and only it and its field are
    // scanned, which keeps those variants cheap. Its script is an on-demand chunk like the
    // Combobox's. It opens on today's month, so the clock is fixed in the month of the field's date:
    // the scan sees the weekday names, days in and outside the month, today, the selected day, and a
    // day outside the month under the pointer (a two-digit one: axe leaves single-character text
    // unmeasured).
    name: 'datepicker-open',
    page: 'components.html',
    viewport: DESKTOP,
    variants: ALL_VARIANTS,
    now: '2026-10-14T12:00:00',
    scope: [OPEN_CALENDAR, DATEPICKER_FIELD],
    setup: async (page) => {
      await page.locator(DATEPICKER_FIELD).click();
      await page.locator(`${OPEN_CALENDAR} [data-vc-date="2026-09-30"] [data-vc-date-btn]`).hover();
    },
    assertState: async (page) => {
      // The plugin joins window.bootstrap only once its chunk has loaded.
      const bound = await page.locator(DATEPICKER_FIELD).evaluate(
        (el) => {
          const plugins = (window as unknown as {
            bootstrap?: Record<string, { getInstance: (element: Element) => unknown } | undefined>;
          }).bootstrap;
          return Boolean(plugins?.Datepicker?.getInstance(el));
        },
        undefined,
        { timeout: STATE_TIMEOUT_MS }
      );
      if (!bound) {
        throw new Error('expected the lazily loaded Datepicker on the datepicker field');
      }
      const calendar = page.locator(OPEN_CALENDAR);
      await expectVisible(calendar, 'the open calendar');
      await expectVisible(calendar.locator('[data-vc-date="2026-10-14"][data-vc-date-today]'), 'today');
      await expectVisible(
        calendar.locator('[data-vc-date="2026-10-20"][data-vc-date-selected]'),
        'the selected day'
      );
      await expectHovered(
        calendar.locator('[data-vc-date="2026-09-30"][data-vc-date-month="prev"] [data-vc-date-btn]'),
        'a day outside the month'
      );
      // The picker was created under the seeded theme, so Bootstrap copied it onto the calendar and
      // its `[data-bs-theme]` token rules apply there; `datepicker-range-switched` scans the
      // calendar without that copy.
      const theme = await page.locator('html').getAttribute('data-bs-theme');
      await expectAttribute(calendar, 'data-bs-theme', theme, 'the calendar');
    }
  },
  {
    // What the demo field never shows. Bootstrap copies `data-bs-theme` onto the calendar only from
    // an ancestor the field had when the picker was created, and `auto` mode leaves <html> without
    // one, so the picker is re-created in `auto` mode, as on a page loaded in it, then the theme is
    // switched to the variant's polarity with the OS preferring the other: the calendar's
    // `color-scheme` follows the page only through the skin's rule. It is re-created as a range
    // picker with a latest date, so the scan sees the days inside a range, which Bootstrap fades
    // and the skin keeps opaque (the token audit measures them opaque, so only this scan guards
    // that), and disabled days, exempt from contrast but drawn unlike the enabled days outside the
    // month.
    name: 'datepicker-range-switched',
    page: 'components.html',
    viewport: DESKTOP,
    now: '2026-10-14T12:00:00',
    scope: [OPEN_CALENDAR],
    setup: async (page) => {
      const root = page.locator('html');
      const polarity = await root.getAttribute('data-bs-theme');
      // The theme menu's options run theme.ts's own switch. They are hidden until the menu opens,
      // so the clicks are dispatched rather than performed.
      await page.locator('[data-supa-theme-option="auto"]').first().dispatchEvent('click');
      await expectAttribute(root, 'data-bs-theme', null, '<html> in auto mode');
      const recreated = await page.evaluate((field: string) => {
        const plugin = (window as unknown as { bootstrap?: { Datepicker?: DatepickerStatics } }).bootstrap
          ?.Datepicker;
        const instance = plugin?.getInstance(document.querySelector(field) as Element);
        if (!plugin || !instance) {
          return false;
        }
        instance.dispose();
        // Disposing puts back a copy of the field as the page loaded it, so it is looked up again.
        const el = document.querySelector<HTMLInputElement>(field);
        if (!el) {
          return false;
        }
        // The picker would parse the field's single date and select it instead of the range.
        el.value = '';
        plugin.getOrCreateInstance(el, {
          selectionMode: 'multiple-ranged',
          // Every day of the range, as plain dates: Bootstrap reads the first to pick the month.
          selectedDates: Array.from({ length: 9 }, (_, i) => `2026-10-${12 + i}`),
          dateMax: '2026-10-25'
        });
        return true;
      }, DATEPICKER_FIELD);
      if (!recreated) {
        throw new Error('expected the lazily loaded Datepicker on the datepicker field');
      }
      await page.locator(`[data-supa-theme-option="${polarity}"]`).first().dispatchEvent('click');
      await expectAttribute(root, 'data-bs-theme', polarity, '<html>');
      await page.emulateMedia({ colorScheme: polarity === 'dark' ? 'light' : 'dark' });
      await page.locator(DATEPICKER_FIELD).click();
    },
    assertState: async (page) => {
      const calendar = page.locator(OPEN_CALENDAR);
      await expectVisible(calendar, 'the open calendar');
      await expectAttribute(calendar, 'data-bs-theme', null, 'the calendar, which has no copied theme');
      await expectVisible(
        calendar.locator('[data-vc-date="2026-10-16"][data-vc-date-selected="middle"]'),
        'a day inside the selected range'
      );
      const problems = await calendar.evaluate((el) => {
        const found: string[] = [];
        const html = document.documentElement;
        const theme = html.getAttribute('data-bs-theme');
        if (theme === null || html.getAttribute('data-supa-theme-mode') !== theme) {
          found.push(`<html> is not in an explicit theme (data-bs-theme=${theme})`);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches === (theme === 'dark')) {
          found.push(`the OS prefers the page's ${theme} theme`);
        }
        const [own, inherited] = [el, html].map((node) => getComputedStyle(node).colorScheme);
        if (own !== inherited) {
          found.push(`the calendar has color-scheme "${own}", the page "${inherited}"`);
        }
        const look = (selector: string): string | null => {
          const button = el.querySelector(`${selector} [data-vc-date-btn]`);
          const style = button ? getComputedStyle(button) : null;
          return style ? `${style.color} at opacity ${style.opacity}` : null;
        };
        const disabled = look('[data-vc-date="2026-10-28"][data-vc-date-disabled]');
        const outside = look('[data-vc-date="2026-09-30"][data-vc-date-month="prev"]:not([data-vc-date-disabled])');
        if (disabled === null || outside === null) {
          found.push('no disabled day on 2026-10-28, or no enabled day outside the month on 2026-09-30');
        } else if (disabled === outside) {
          found.push(`a disabled day looks like an enabled day outside the month (${disabled})`);
        }
        return found;
      });
      if (problems.length > 0) {
        throw new Error(`expected a calendar on the page's scheme with distinct disabled days: ${problems.join('; ')}`);
      }
    }
  },
  {
    // The month view, opened from the month name in the calendar's header. vanilla-calendar-pro
    // shows each month's short name but labels the button with the long one ("Jan", named
    // "January"), which axe's `label-content-name-mismatch` (WCAG 2.5.3 Label in Name) flags; the
    // skin names each button by its text. The calendar draws a new month view each time it is
    // shown, so the scan sees one drawn after a trip through the year view. The clock is fixed as
    // in `datepicker-open`, so October 2026 is the selected month.
    name: 'datepicker-months',
    page: 'components.html',
    viewport: DESKTOP,
    now: '2026-10-14T12:00:00',
    scope: [OPEN_CALENDAR],
    setup: async (page) => {
      await page.locator(DATEPICKER_FIELD).click();
      const calendar = page.locator(OPEN_CALENDAR);
      await calendar.locator('[data-vc="month"]').click();
      await expectAttribute(calendar, 'data-vc-type', 'month', 'the calendar in its month view');
      await calendar.locator('[data-vc="year"]').click();
      await expectAttribute(calendar, 'data-vc-type', 'year', 'the calendar in its year view');
      await calendar.locator('[data-vc="month"]').click();
    },
    assertState: async (page) => {
      const calendar = page.locator(OPEN_CALENDAR);
      await expectVisible(calendar, 'the open calendar');
      await expectAttribute(calendar, 'data-vc-type', 'month', 'the calendar in its month view');
      const months = calendar.locator('[data-vc-months-month]');
      const count = await months.count();
      if (count !== 12) {
        throw new Error(`expected 12 month buttons in the month view, got ${count}`);
      }
      await expectVisible(months.last(), 'the last month button');
      await expectVisible(
        calendar.locator('[data-vc-months-month="9"][data-vc-months-month-selected]'),
        'the selected month'
      );
    }
  },
  // Printed pages at the paper's width, and once from a wide window, whose screen layout has the
  // sticky inline sidebar and TOC that print must drop.
  printScenario('index.html', PRINT_PAGE),
  printScenario('kitchen-sink.html', PRINT_PAGE),
  printScenario('index.html', DESKTOP, '-wide'),
  // The same pages printed in the default `auto` mode while the OS prefers dark.
  autoPrintScenario('index.html'),
  autoPrintScenario('kitchen-sink.html'),
  // A link to a heading far down a page, on a desktop and a phone, under the run's reduced motion,
  // and once with motion allowed, where both of the skin's scrolls to the heading are smooth.
  deepLinkScenario('deep-link', DESKTOP, 'reduce'),
  deepLinkScenario('deep-link-mobile', MOBILE, 'reduce'),
  deepLinkScenario('deep-link-smooth', DESKTOP, 'no-preference'),
  deepLinkScenario('deep-link-smooth-mobile', MOBILE, 'no-preference'),
  {
    // A reader who scrolls before the page is ready keeps their place: the skin's second scroll to
    // the heading must not pull them back. The page is ready only once Mermaid and KaTeX have run,
    // so holding them keeps the page short of ready while the reader scrolls back up with the wheel.
    name: 'deep-link-reader-scrolled',
    page: DEEP_LINK_PAGE,
    viewport: DESKTOP,
    variants: [{ palette: 'furo', polarity: 'light' }],
    setup: async (page) => {
      const release = await holdCdnRequests(page);
      try {
        await openAtFragment(page, DEEP_LINK_TARGET, 'domcontentloaded');
        await waitForScrollIdle(page);
        const landed = await topOf(page, DEEP_LINK_TARGET);
        if ((await page.locator('html[data-supa-ready]').count()) > 0) {
          throw new Error('the page was ready before the reader scrolled: Mermaid was not held');
        }
        await page.mouse.move(DESKTOP.width / 2, DESKTOP.height / 2);
        await page.mouse.wheel(0, -READER_SCROLL_PX);
        await page.waitForFunction(
          ([id, from, by]: [string, number, number]) =>
            (document.getElementById(id)?.getBoundingClientRect().top ?? from) - from > by / 2,
          [DEEP_LINK_TARGET, landed, READER_SCROLL_PX] as [string, number, number],
          { timeout: STATE_TIMEOUT_MS }
        );
        deepLinkExpectations.set(page, landed);
      } finally {
        release();
      }
      await waitForLanding(page);
    },
    assertState: async (page) => {
      const landed = deepLinkExpectations.get(page);
      if (landed === undefined) {
        throw new Error(`setup did not measure where #${DEEP_LINK_TARGET} landed`);
      }
      await expectAttribute(page.locator('html'), 'data-supa-ready', 'true', '<html>');
      const top = await topOf(page, DEEP_LINK_TARGET);
      if (top - landed < READER_SCROLL_PX / 2) {
        throw new Error(
          `expected the page to stay where the reader scrolled, about ${READER_SCROLL_PX}px above ` +
            `where #${DEEP_LINK_TARGET} landed (${landed}px from the top), but it is ${top}px from the top`
        );
      }
    }
  },
  {
    // A reader who scrolls away from the linked heading and reloads keeps their place: the browser
    // restores it, and neither of the skin's scrolls to the heading may take it back. With motion
    // allowed, the smooth first scroll is still under way when the browser restores the position.
    name: 'deep-link-reader-reloaded',
    page: DEEP_LINK_PAGE,
    viewport: DESKTOP,
    variants: [{ palette: 'furo', polarity: 'light' }],
    engines: RELOAD_ENGINES,
    setup: async (page) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await openDeepLink(page, DEEP_LINK_TARGET);
      await page.mouse.move(DESKTOP.width / 2, DESKTOP.height / 2);
      await page.mouse.wheel(0, -RELOAD_SCROLL_PX);
      await waitForScrollIdle(page);
      deepLinkExpectations.set(page, await page.evaluate(() => window.scrollY));
      const release = await holdCdnRequests(page);
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: READY_TIMEOUT_MS });
      } finally {
        release();
      }
      await waitForLanding(page);
    },
    assertState: async (page) => {
      const kept = deepLinkExpectations.get(page);
      if (kept === undefined) {
        throw new Error('setup did not measure where the reader scrolled to');
      }
      await expectAttribute(page.locator('html'), 'data-supa-ready', 'true', '<html>');
      const scrollY = await page.evaluate(() => Math.round(window.scrollY));
      if (Math.abs(scrollY - kept) > RELOAD_SCROLL_PX / 2) {
        throw new Error(
          `expected the reloaded page to stay where the reader scrolled (scrollY ${kept}), ` +
            `but it is at scrollY ${scrollY}, with #${DEEP_LINK_TARGET} ${await topOf(page, DEEP_LINK_TARGET)}px from the top`
        );
      }
    }
  },
  // The component showcase printed: the states only a fill shows keep it (`PRINTED_FILLS`).
  printComponentsScenario()
];

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
 * Lists the HTML pages under a rendered site, including those in subdirectories.
 *
 * @param dir - Absolute site directory.
 * @returns Page paths relative to `dir`, with `/` separators, sorted.
 */
function listPagesDeep(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.html'))
    .map((path) => path.split(sep).join('/'))
    .sort();
}

/**
 * Finds the rendered site of every Invoker fixture project in `src/it/`.
 *
 * @returns The fixture sites Maven rendered, and the names of the projects it has not.
 */
function findFixtureSites(): { sites: SiteRoot[]; missing: string[] } {
  const sites: SiteRoot[] = [];
  const missing: string[] = [];
  const projects = readdirSync(FIXTURE_SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(FIXTURE_SOURCE_DIR, entry.name, 'pom.xml')))
    .map((entry) => entry.name)
    .sort();
  for (const name of projects) {
    const dir = join(FIXTURE_BUILD_DIR, name, 'target', 'site');
    if (existsSync(join(dir, 'index.html'))) {
      sites.push({ name, dir, pages: listPagesDeep(dir) });
    } else {
      missing.push(name);
    }
  }
  return { sites, missing };
}

/**
 * Builds the scan matrix required by the a11y lane.
 *
 * @param pages - Top-level HTML file names found in `target/site`.
 * @param fixtures - Rendered Invoker fixture sites to scan as further page sets.
 * @returns Every self-site page in furo light/dark at desktop size, `index.html` in all
 *     12 palette × polarity variants, `index.html` at a mobile viewport, and
 *     every interaction scenario in each of its variants (`SCENARIO_VARIANTS`
 *     unless the scenario lists its own); then every page of each fixture site, in
 *     subdirectories too, in furo light/dark at desktop size, and its `index.html` at the
 *     mobile viewport.
 */
function buildJobs(pages: string[], fixtures: readonly SiteRoot[]): ScanJob[] {
  const jobs: ScanJob[] = [];
  for (const page of pages) {
    for (const polarity of ['light', 'dark'] as const) {
      jobs.push({ site: '', page, palette: 'furo', polarity, ...DESKTOP });
    }
  }
  for (const palette of PALETTES) {
    if (palette === 'furo') {
      continue; // Already covered by the per-page furo light/dark pass above.
    }
    for (const polarity of ['light', 'dark'] as const) {
      jobs.push({ site: '', page: 'index.html', palette, polarity, ...DESKTOP });
    }
  }
  for (const polarity of ['light', 'dark'] as const) {
    jobs.push({ site: '', page: 'index.html', palette: 'furo', polarity, ...MOBILE });
  }
  for (const scenario of [...SCENARIOS, ...pages.map(forcedColorsPageScenario)]) {
    for (const variant of scenario.variants ?? SCENARIO_VARIANTS) {
      jobs.push({ site: '', page: scenario.page, ...variant, ...scenario.viewport, scenario });
    }
  }
  // The fixtures render the template branches the self-site's own configuration never takes
  // (a hidden brand name, footer icons, author colors, a second locale, the legacy furoSkin block).
  for (const fixture of fixtures) {
    for (const page of fixture.pages) {
      for (const polarity of ['light', 'dark'] as const) {
        jobs.push({ site: fixture.name, page, palette: 'furo', polarity, ...DESKTOP });
      }
    }
    for (const polarity of ['light', 'dark'] as const) {
      jobs.push({ site: fixture.name, page: 'index.html', palette: 'furo', polarity, ...MOBILE });
    }
  }
  return jobs;
}

/**
 * Names a job's page for the report and for narrowing the run.
 *
 * @param job - Scan job.
 * @returns The page path, prefixed with its fixture's name for a fixture page
 *     (`sample-site/guides/install.html`).
 */
function pageLabel(job: ScanJob): string {
  return job.site ? `${job.site}/${job.page}` : job.page;
}

/**
 * Formats a scan job's variant label for the report.
 *
 * @param job - Scan job.
 * @returns Human-readable variant such as `modus/dark @1440x900` or
 *     `furo/light @1440x900 +search-dialog-empty`.
 */
function variantLabel(job: ScanJob): string {
  const base = `${job.palette}/${job.polarity} @${job.width}x${job.height}`;
  return job.scenario ? `${base} +${job.scenario.name}` : base;
}

/**
 * Waits for a promise to settle, but no longer than `ms`, and ignores its outcome.
 *
 * @param promise - Cleanup that may never settle, such as closing a wedged browser context.
 * @param ms - Longest wait in milliseconds.
 */
async function settleWithin(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise<void>((resolveWait) => {
      timer = setTimeout(resolveWait, ms);
    })
  ]);
  clearTimeout(timer);
}

/**
 * Runs one scan job in a fresh browser context, failing it once it passes `JOB_DEADLINE_MS`.
 *
 * Several of `scan()`'s steps have no timeout of their own (`document.fonts.ready`, waiting
 * for transitions, axe's `analyze()`), and a wedged WebKit page once held three jobs, and so the
 * whole run, forever. An overrunning job is reported as not scanned and the run moves on; its
 * context is closed, waiting at most `CLOSE_DEADLINE_MS`, and otherwise abandoned to
 * `browser.close()`.
 *
 * @param browser - Shared browser of the selected engine.
 * @param engine - That browser's engine, for the timeout message.
 * @param baseUrl - Static server base URL.
 * @param job - Page/variant to scan.
 * @returns Flattened violation nodes for this job.
 */
async function scanWithDeadline(
  browser: Browser,
  engine: Engine,
  baseUrl: string,
  job: ScanJob
): Promise<Finding[]> {
  let context: BrowserContext | undefined;
  let expired = false;
  let timer: NodeJS.Timeout | undefined;
  const work = (async (): Promise<Finding[]> => {
    const opened = await browser.newContext({
      viewport: { width: job.width, height: job.height },
      colorScheme: job.polarity,
      reducedMotion: 'reduce',
      permissions: job.scenario?.permissions ?? []
    });
    context = opened;
    // The deadline passed while the context opened, after the cleanup below had already run.
    if (expired) {
      await settleWithin(opened.close(), CLOSE_DEADLINE_MS);
      return [];
    }
    return scan(opened, baseUrl, job);
  })();
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(
        new Error(
          `${pageLabel(job)} [${variantLabel(job)}] did not finish within the ` +
            `${JOB_DEADLINE_MS / 1000} s job deadline in ${engine}`
        )
      );
    }, JOB_DEADLINE_MS);
  });
  try {
    // A job that loses the race keeps running until its context closes; Promise.race has
    // already subscribed to it, so its late rejection is handled.
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
    if (context) {
      await settleWithin(context.close(), CLOSE_DEADLINE_MS);
    }
  }
}

/**
 * Matches the message Chromium logs for a request that failed or was blocked ("Failed to load
 * resource: ..."). Those say nothing about the skin's scripts: a scan may hold back or abort the
 * Mermaid and KaTeX CDN requests, and an unreachable CDN is a network matter.
 */
const RESOURCE_LOAD_ERROR = /^Failed to load resource\b/;

/**
 * Starts recording the script errors a page raises: an uncaught exception or unhandled rejection
 * (`pageerror`) and any `console.error`, other than a failed resource load. `initSupaSkin()` logs
 * `console.error("Supa Maven Skin: <enhancer> failed", error)` when one of its enhancers throws and
 * carries on, so `data-supa-ready` is set even then, and only this listener notices the failure.
 * The current site logs no `console.error` in a Chromium run, so the check takes them all: it also
 * catches errors from Bootstrap's plugins and the lazily loaded chunks. Its warnings, such as the
 * unknown-label notices the fixture sites trigger on purpose, are not errors and are not recorded.
 *
 * @param page - Page to listen to, before it navigates.
 * @returns The array the listeners append a description of each error to.
 */
function collectScriptErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(`uncaught ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !RESOURCE_LOAD_ERROR.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

/**
 * Opens one page variant, waits for the skin to finish initialising, drives it
 * into the job's interaction scenario (if any), and runs axe.
 *
 * @param context - Fresh browser context for this job, which the caller closes.
 * @param baseUrl - Static server base URL.
 * @param job - Page/variant to scan.
 * @returns Flattened violation nodes for this job.
 */
async function scan(context: BrowserContext, baseUrl: string, job: ScanJob): Promise<Finding[]> {
  const { scenario } = job;
  if (scenario?.now !== undefined) {
    await context.clock.setFixedTime(scenario.now);
  }
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
  await context.addInitScript(installColorHelper, WCAG_MINIMUMS);
  const page = await context.newPage();
  const scriptErrors = collectScriptErrors(page);
  await scenario?.prepare?.(page);
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
    palette: document.documentElement.getAttribute('data-supa-palette'),
    level: getComputedStyle(document.documentElement)
      .getPropertyValue('--supa-wcag-level')
      .replace(/["'\s]/g, '')
  }));
  if (applied.theme !== job.polarity || applied.palette !== job.palette) {
    throw new Error(
      `did not apply the requested variant ` +
        `(got data-bs-theme=${applied.theme}, data-supa-palette=${applied.palette}).`
    );
  }
  // The AAA rule follows AAA_PALETTES, so a palette whose declared level drifted from that
  // list would be scanned against the wrong target; fail instead.
  const aaa = AAA_PALETTES.has(job.palette);
  if (applied.level !== (aaa ? 'AAA' : 'AA')) {
    throw new Error(
      `palette ${job.palette} declares --supa-wcag-level ${applied.level || '(unset)'}, ` +
        `but the scan expects ${aaa ? 'AAA' : 'AA'}.`
    );
  }
  if (scenario) {
    // A mistyped setup locator should fail in seconds, not after Playwright's 30 s default.
    page.setDefaultTimeout(STATE_TIMEOUT_MS);
    try {
      await scenario.setup(page);
      await scenario.assertState(page);
    } catch (error: unknown) {
      throw new Error(`scenario state not reached: ${firstLine(error)}`, { cause: error });
    }
  }
  await settleTransitions(page);
  // A scoped scan covers only the regions its state changes; the load-time scans check the rest.
  const labelFindings = scenario?.scope ? [] : await checkLabelInName(page, job);
  const idFindings = scenario?.scope ? [] : await checkUniqueIds(page, job);
  // `options()` replaces axe's run options, so it carries the AA tags itself. axe runs a rule
  // enabled under `rules` even when its tags are outside `runOnly`.
  const builder = new AxeBuilder({ page }).options({
    runOnly: { type: 'tag', values: WCAG_TAGS },
    ...(aaa ? { rules: { [AAA_CONTRAST_RULE]: { enabled: true } } } : {})
  });
  for (const selector of scenario?.scope ?? []) {
    builder.include(selector);
  }
  const results = await builder.analyze();
  if (scenario) {
    try {
      await scenario.assertState(page);
    } catch (error: unknown) {
      throw new Error(`scenario state did not hold through the scan: ${firstLine(error)}`, {
        cause: error
      });
    }
  }
  const engine = page.context().browser()?.browserType().name() ?? 'unknown';
  const errorFindings = scriptErrors.map(
    (text): Finding => ({
      page: pageLabel(job),
      variant: variantLabel(job),
      ruleId: 'script-error',
      impact: 'critical',
      target: 'console',
      summary: `A page script failed in ${engine}: ${text.replace(/\s+/g, ' ').trim().slice(0, 300)}`,
      html: '',
      helpUrl: 'src/main/frontend/ts/index.ts'
    })
  );
  const findings: Finding[] = [...labelFindings, ...idFindings, ...errorFindings];
  // No rule exclusions: every violation is either fixed in the skin or in demo content.
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      findings.push({
        page: pageLabel(job),
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

/** Command-line flag that prints the scenario names instead of scanning. */
const LIST_FLAG = '--list';

/**
 * Lists every scenario name the runner accepts as a narrowing argument.
 *
 * @returns The names of `SCENARIOS` plus the per-page forced-colors scenario, in run order.
 */
function listScenarioNames(): string[] {
  return [...SCENARIOS.map((s) => s.name), FORCED_COLORS_PAGES];
}

/** What the command line asks the runner to do. */
interface RunOptions {
  /** Engine to scan in: `--engine`, else `A11Y_ENGINE`, else `chromium`. */
  engine: Engine;
  /** Palette × polarity variants `--variants` keeps, or null for every variant. */
  variants: readonly Variant[] | null;
  /** Page, scenario, and fixture names that narrow the matrix; empty for the whole matrix. */
  names: readonly string[];
  /** `--require-fixtures`: fail when a fixture project has no rendered site, instead of skipping it. */
  requireFixtures: boolean;
}

/**
 * Parses `--engine <name>`, `--variants <palette/polarity,...>`, `--require-fixtures`, and the
 * positional page, scenario, and fixture names.
 *
 * @param args - Command-line arguments after the script path.
 * @param env - Environment, for `A11Y_ENGINE`.
 * @returns The run options.
 */
function parseRunOptions(args: string[], env: NodeJS.ProcessEnv): RunOptions {
  const { values, positionals } = parseArgs({
    args,
    options: {
      engine: { type: 'string' },
      variants: { type: 'string' },
      [REQUIRE_FIXTURES_FLAG]: { type: 'boolean', default: false }
    },
    allowPositionals: true
  });
  const engine = values.engine ?? (env[ENGINE_ENV] || 'chromium');
  if (!(ENGINES as readonly string[]).includes(engine)) {
    throw new Error(`unknown engine "${engine}"; use one of ${ENGINES.join(', ')}`);
  }
  let variants: Variant[] | null = null;
  if (values.variants !== undefined) {
    variants = values.variants.split(',').map((label) => {
      const [palette, polarity, extra] = label.trim().split('/');
      if (
        !(PALETTES as readonly string[]).includes(palette) ||
        (polarity !== 'light' && polarity !== 'dark') ||
        extra !== undefined
      ) {
        throw new Error(
          `unknown variant "${label}"; use <palette>/<light|dark> with a palette of ${PALETTES.join(', ')}`
        );
      }
      return { palette: palette as Palette, polarity };
    });
  }
  return {
    engine: engine as Engine,
    variants,
    names: positionals,
    requireFixtures: values[REQUIRE_FIXTURES_FLAG] === true
  };
}

/**
 * Entry point: serves the site, scans every job, prints a report, and sets the exit code.
 *
 * @returns Process exit code (0 when no violations or errors, 1 otherwise).
 */
async function main(): Promise<number> {
  // `--list` prints every scenario name, whatever the engine, and exits, so `scripts/lint-docs.ts`
  // can check them against the `architecture.md` catalog without a built site or a browser.
  if (process.argv.slice(2).includes(LIST_FLAG)) {
    console.log(listScenarioNames().join('\n'));
    return 0;
  }
  let options: RunOptions;
  try {
    options = parseRunOptions(process.argv.slice(2), process.env);
  } catch (error: unknown) {
    console.error(`a11y: ${firstLine(error)}`);
    return 1;
  }
  const { engine } = options;
  if (!existsSync(join(SITE_DIR, 'index.html'))) {
    console.error(
      `a11y: ${SITE_DIR}/index.html not found. Build the self-site first: mvn -B -ntp clean verify site`
    );
    return 1;
  }
  const pages = readdirSync(SITE_DIR)
    .filter((name) => name.endsWith('.html'))
    .sort();
  // `mvn verify` renders each Invoker fixture's site under target/it/; scan the ones it rendered.
  const { sites: fixtures, missing: unbuilt } = findFixtureSites();
  if (unbuilt.length > 0) {
    if (options.requireFixtures) {
      console.error(
        `a11y: --${REQUIRE_FIXTURES_FLAG}: no rendered site for the fixture projects ` +
          `${unbuilt.join(', ')} under ${FIXTURE_BUILD_DIR}. Run mvn -B -ntp clean verify site first.`
      );
      return 1;
    }
    console.log(
      `a11y: skipping fixture projects with no rendered site under ${FIXTURE_BUILD_DIR}: ` +
        `${unbuilt.join(', ')} (mvn -B -ntp clean verify renders them)`
    );
  }
  const fixtureNames = fixtures.map((fixture) => fixture.name);
  const fixturePages = fixtures.flatMap((fixture) => fixture.pages.map((page) => `${fixture.name}/${page}`));
  // A scenario whose page is gone would otherwise fail every variant with a 404-shaped
  // "state not reached"; name the real cause up front.
  const missing = SCENARIOS.filter((s) => !pages.includes(s.page));
  if (missing.length > 0) {
    console.error(
      `a11y: scenario pages missing from ${SITE_DIR}: ` +
        missing.map((s) => `${s.name} -> ${s.page}`).join(', ')
    );
    return 1;
  }
  const scenarioNames = listScenarioNames();
  // Optional positional page, scenario, or fixture names (`npm run test:a11y -- team.html`,
  // `npm run test:a11y -- search-dialog-results`, `npm run test:a11y -- sample-site`, or
  // `npm run test:a11y -- localized-site/fr/index.html`) narrow the matrix while iterating
  // on a fix; CI always runs the full matrix.
  const only = new Set(options.names);
  // A mistyped name would otherwise scan nothing and report success, which
  // reads like a clean result; reject unknown names before starting a browser.
  const unknown = [...only].filter(
    (name) =>
      !pages.includes(name) &&
      !scenarioNames.includes(name) &&
      !fixtureNames.includes(name) &&
      !fixturePages.includes(name)
  );
  if (unknown.length > 0) {
    console.error(
      `a11y: no such page, scenario, or fixture: ${unknown.join(', ')}\n` +
        `a11y: available pages: ${pages.join(', ')}\n` +
        `a11y: available scenarios: ${scenarioNames.join(', ')}\n` +
        `a11y: available fixtures: ${fixtureNames.join(', ') || '(none rendered)'}\n` +
        `a11y: available fixture pages: ${fixturePages.join(', ') || '(none rendered)'}`
    );
    return 1;
  }
  const matched = buildJobs(pages, fixtures).filter(
    (job) =>
      (only.size === 0 ||
        only.has(pageLabel(job)) ||
        only.has(job.site) ||
        (job.scenario !== undefined && only.has(job.scenario.name))) &&
      (options.variants === null ||
        options.variants.some((v) => v.palette === job.palette && v.polarity === job.polarity))
  );
  if (matched.length === 0) {
    console.error('a11y: nothing to scan (no HTML pages matched).');
    return 1;
  }
  // A scenario the engine cannot run is skipped with its reason, printed once per name.
  const skipped = new Map<string, { reason: string; variants: number }>();
  const jobs = matched.filter((job) => {
    const support = job.scenario?.engines;
    if (!job.scenario || !support || support.supported.includes(engine)) {
      return true;
    }
    const entry = skipped.get(job.scenario.name) ?? { reason: support.reason, variants: 0 };
    entry.variants++;
    skipped.set(job.scenario.name, entry);
    return false;
  });
  for (const [name, { reason, variants }] of skipped) {
    console.log(`  skip ${name} (${variants} variant${variants === 1 ? '' : 's'}) in ${engine}: ${reason}`);
  }
  if (jobs.length === 0) {
    console.log(`a11y: nothing left to scan in ${engine}; every matched scenario is skipped there.`);
    return 0;
  }
  // Each site gets its own origin, at its root, as the self-site always had.
  const roots = new Map<string, string>([['', SITE_DIR], ...fixtures.map((f): [string, string] => [f.name, f.dir])]);
  const servers: Server[] = [];
  const baseUrls = new Map<string, string>();
  for (const site of new Set(jobs.map((job) => job.site))) {
    const { server, baseUrl } = await startServer(roots.get(site)!);
    servers.push(server);
    baseUrls.set(site, baseUrl);
  }
  let browser: Browser | null = null;
  try {
    browser = await BROWSER_TYPES[engine].launch();
    const activeBrowser = browser;
    const scenarioJobs = jobs.filter((job) => job.scenario).length;
    const aaaJobs = jobs.filter((job) => AAA_PALETTES.has(job.palette)).length;
    console.log(
      `a11y: scanning ${jobs.length} page variants in ${engine} (${pages.length} pages, ` +
        `${fixturePages.length} pages of ${fixtures.length} fixture sites, ` +
        `${scenarioJobs} in interactive states) with axe-core [${WCAG_TAGS.join(', ')}], ` +
        `plus ${AAA_CONTRAST_RULE} on the ${aaaJobs} AAA-palette variants, ` +
        `${LABEL_IN_NAME_RULE} (WCAG 2.5.3) on every visible ${LABEL_IN_NAME_SELECTOR}, ` +
        `and ${UNIQUE_ID_RULE} on every page`
    );
    const errors: ScanError[] = [];
    const perJob = await mapLimit(jobs, CONCURRENCY, async (job) => {
      const label = `${pageLabel(job)} [${variantLabel(job)}]`;
      try {
        const findings = await scanWithDeadline(activeBrowser, engine, baseUrls.get(job.site)!, job);
        console.log(
          `  ${findings.length === 0 ? 'ok  ' : 'FAIL'} ${label}` +
            (findings.length > 0 ? ` (${findings.length} violation nodes)` : '')
        );
        return findings;
      } catch (error: unknown) {
        // Keep scanning the rest so one broken scenario does not hide other results.
        const message = firstLine(error);
        errors.push({ page: pageLabel(job), variant: variantLabel(job), message });
        console.log(`  ERR  ${label}: ${message}`);
        return [];
      }
    });
    const findings = perJob.flat();
    const skippedNote = skipped.size > 0 ? `; ${skipped.size} scenarios skipped (listed above)` : '';
    if (findings.length > 0) {
      printReport(findings);
    }
    for (const e of errors) {
      console.error(`\n${e.page} [${e.variant}]\n  - could not scan: ${e.message}`);
    }
    if (findings.length > 0 || errors.length > 0) {
      const rules = new Set(findings.map((f) => f.ruleId));
      console.error(
        `\na11y: ${findings.length} violation nodes (${rules.size} rules` +
          `${rules.size > 0 ? `: ${[...rules].join(', ')}` : ''}), ${errors.length} variants not scanned` +
          ` in ${engine}${skippedNote}.`
      );
      return 1;
    }
    console.log(
      `a11y: no WCAG A/AA violations across ${jobs.length} page variants in ${engine}, ` +
        `no AAA contrast violations across the ${aaaJobs} AAA-palette variants, ` +
        `no ${LABEL_IN_NAME_RULE} violations on ${LABEL_IN_NAME_SELECTOR}, ` +
        `and no repeated ids${skippedNote}.`
    );
    return 0;
  } finally {
    if (browser) {
      await settleWithin(browser.close(), CLOSE_DEADLINE_MS);
    }
    await Promise.all(
      servers.map((server) => new Promise<void>((resolveClose) => server.close(() => resolveClose())))
    );
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
