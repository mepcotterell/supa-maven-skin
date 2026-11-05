/**
 * @fileoverview Rendered-page accessibility checks for the generated self-site.
 *
 * Serves `target/site/` from an in-process Node static file server, opens every
 * top-level page in headless Chromium (Playwright), waits for Supa Maven Skin to
 * finish initialising (`html[data-supa-ready]`), and runs axe-core with the
 * WCAG 2.0/2.1/2.2 A and AA rule tags, plus the AAA `color-contrast-enhanced`
 * rule (7:1) on the `modus*` palettes that promise AAA. The SCSS token linter
 * (`npm run lint:scss`) proves palette pairs meet their contrast targets in
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
 * hovered themed chip, unthemed chip, and text button there, an opened
 * Combobox, whose script is a lazily loaded chunk, the opened Datepicker
 * calendar in every palette and polarity, and content pages printed,
 * with print media emulated and backgrounds dropped as browsers print them, so
 * text must read on white paper in every polarity, including the default
 * `auto` mode under a dark OS preference), asserts the
 * state was reached, scans it in `furo` light and dark and `modus` dark (AAA)
 * unless the scenario lists its own variants, and asserts the state still held
 * after the scan, so a broken selector fails the run instead of quietly
 * scanning the closed state. Every scan first waits for running CSS
 * transitions to finish, so axe measures settled colors, not a fade.
 *
 * Run `mvn -B -ntp clean verify site` first, then `npm run test:a11y`; append
 * page or scenario names (`npm run test:a11y -- team.html palette-menu`) to
 * narrow the matrix while iterating. Requires a Chromium build
 * (`npx playwright install chromium`). It is deliberately not part of
 * `npm test` or the Maven build so consumer sites and `mvn verify` never need
 * a browser.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import type { Browser, Locator, Page } from 'playwright';

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
   * itself, or a widget opened from a field in every variant, which changes only
   * itself and the field; the unchanged rest of the page is covered by the
   * load-time scans. Every other scenario scans the whole page.
   */
  scope?: readonly string[];
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
  page: string;
  scenario?: InteractionScenario;
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
const DESKTOP: Viewport = { width: 1440, height: 900 };
const MOBILE: Viewport = { width: 390, height: 844 };
/**
 * At least `lg` (1024px), so the sidebar is inline and the content header shows
 * the TOC trigger, but below `xl` (1280px), where the TOC is still a drawer.
 */
const TABLET: Viewport = { width: 1100, height: 900 };
const READY_TIMEOUT_MS = 30_000;
const STATE_TIMEOUT_MS = 5_000;
const CONCURRENCY = 4;

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
 * Waits for the page's running CSS transitions to finish, so axe measures settled colors.
 *
 * A state change can recolor text at once while its background still fades (the search result
 * that loses `.is-active`), and axe would otherwise measure whatever mix the fade had reached.
 * Animations are not awaited: a spinner runs forever, and the skin's own animations end hidden.
 *
 * @param page - Page under test.
 */
async function settleTransitions(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const transitions = document.getAnimations().filter((animation) => animation instanceof CSSTransition);
    // A transition interrupted by another state change rejects `finished`; that one is settled too.
    await Promise.all(transitions.map((transition) => transition.finished.catch(() => undefined)));
  });
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
    page: 'index.html',
    viewport: placement.viewport,
    setup: async (page) => {
      await placement.reveal?.(page);
      await page.locator(trigger).focus();
      // ArrowDown is the keyboard path: it opens the menu and focuses the first option.
      await page.keyboard.press('ArrowDown');
    },
    assertState: async (page) => {
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
 * Throws unless the page lays out for print: the furniture is not rendered, the article spans the
 * page, nothing is fixed or sticky, and no code block or table scrolls (clips) its content.
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

/** Every palette in both polarities, for a widget that draws its own colors. */
const ALL_VARIANTS: readonly Variant[] = PALETTES.flatMap((palette) =>
  (['light', 'dark'] as const).map((polarity): Variant => ({ palette, polarity }))
);

/** The Datepicker field on `components.html`, whose value is 2026-10-20. */
const DATEPICKER_FIELD = '.supa-article [data-bs-toggle="datepicker"]';

/** The shown calendar that vanilla-calendar-pro appends to `<body>` for a field. */
const OPEN_CALENDAR = '[data-vc="calendar"][data-vc-input]:not([data-vc-calendar-hidden])';

/**
 * Interactive states scanned on top of the load-time matrix, each in its
 * `variants` (by default every `SCENARIO_VARIANTS` entry). Selectors target the
 * skin's own markup from `site.vm`, `site-macros.vm`, and the TypeScript
 * enhancers, and each `assertState` pins the exact element its `setup`
 * toggled, so a state left open elsewhere on the page cannot stand in for it.
 */
const SCENARIOS: readonly InteractionScenario[] = [
  {
    name: 'search-dialog-empty',
    page: 'index.html',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.keyboard.press('ControlOrMeta+k');
    },
    assertState: async (page) => {
      await expectVisible(page.locator('dialog#supaSearchDialog[open]'), 'the search dialog');
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
      await expectVisible(
        page.locator('#supaSearchResults > .is-active .supa-search-result-title mark').first(),
        'a highlighted match in the active result title'
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
  // Hover fills that Bootstrap 6 derives from the theme tokens (`--<theme>-bg-muted`, darkened
  // `oklch(from ...)` text) or falls back to without a theme (`--bg-3`).
  hoverScenario('chip-hovered', '.supa-article .chip.theme-success', 'the success chip'),
  hoverScenario('unthemed-chip-hovered', '.supa-article .chip-input .chip', 'a chip-input chip'),
  hoverScenario('text-button-hovered', '.supa-article .btn-text.theme-primary', 'the text button'),
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
      const schemes = await calendar.evaluate((el) =>
        [el, document.documentElement].map((node) => getComputedStyle(node).colorScheme)
      );
      if (schemes[0] !== schemes[1]) {
        throw new Error(`expected the calendar in the page's color-scheme "${schemes[1]}", got "${schemes[0]}"`);
      }
    }
  },
  // Printed pages at the paper's width, and once from a wide window, whose screen layout has the
  // sticky inline sidebar and TOC that print must drop.
  printScenario('index.html', PRINT_PAGE),
  printScenario('kitchen-sink.html', PRINT_PAGE),
  printScenario('index.html', DESKTOP, '-wide'),
  // The same pages printed in the default `auto` mode while the OS prefers dark.
  autoPrintScenario('index.html'),
  autoPrintScenario('kitchen-sink.html')
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
 * Builds the scan matrix required by the a11y lane.
 *
 * @param pages - Top-level HTML file names found in `target/site`.
 * @returns Every page in furo light/dark at desktop size, `index.html` in all
 *     12 palette × polarity variants, `index.html` at a mobile viewport, and
 *     every interaction scenario in each of its variants (`SCENARIO_VARIANTS`
 *     unless the scenario lists its own).
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
  for (const scenario of SCENARIOS) {
    for (const variant of scenario.variants ?? SCENARIO_VARIANTS) {
      jobs.push({ page: scenario.page, ...variant, ...scenario.viewport, scenario });
    }
  }
  return jobs;
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
 * Opens one page variant, waits for the skin to finish initialising, drives it
 * into the job's interaction scenario (if any), and runs axe.
 *
 * @param browser - Shared Chromium instance.
 * @param baseUrl - Static server base URL.
 * @param job - Page/variant to scan.
 * @returns Flattened violation nodes for this job.
 */
async function scan(browser: Browser, baseUrl: string, job: ScanJob): Promise<Finding[]> {
  const { scenario } = job;
  const context = await browser.newContext({
    viewport: { width: job.width, height: job.height },
    colorScheme: job.polarity,
    reducedMotion: 'reduce',
    permissions: scenario?.permissions ?? []
  });
  try {
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
 * @returns Process exit code (0 when no violations or errors, 1 otherwise).
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
  const scenarioNames = SCENARIOS.map((s) => s.name);
  // Optional positional page or scenario names (`npm run test:a11y -- team.html`,
  // `npm run test:a11y -- search-dialog-results`) narrow the matrix while iterating
  // on a fix; CI always runs the full matrix.
  const only = new Set(process.argv.slice(2));
  // A mistyped name would otherwise scan nothing and report success, which
  // reads like a clean result; reject unknown names before starting a browser.
  const unknown = [...only].filter((name) => !pages.includes(name) && !scenarioNames.includes(name));
  if (unknown.length > 0) {
    console.error(
      `a11y: no such page or scenario in ${SITE_DIR}: ${unknown.join(', ')}\n` +
        `a11y: available pages: ${pages.join(', ')}\n` +
        `a11y: available scenarios: ${scenarioNames.join(', ')}`
    );
    return 1;
  }
  const jobs = buildJobs(pages).filter(
    (job) =>
      only.size === 0 || only.has(job.page) || (job.scenario !== undefined && only.has(job.scenario.name))
  );
  if (jobs.length === 0) {
    console.error('a11y: nothing to scan (no HTML pages matched).');
    return 1;
  }
  const { server, baseUrl } = await startServer(SITE_DIR);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const activeBrowser = browser;
    const scenarioJobs = jobs.filter((job) => job.scenario).length;
    const aaaJobs = jobs.filter((job) => AAA_PALETTES.has(job.palette)).length;
    console.log(
      `a11y: scanning ${jobs.length} page variants (${pages.length} pages, ` +
        `${scenarioJobs} in interactive states) with axe-core [${WCAG_TAGS.join(', ')}], ` +
        `plus ${AAA_CONTRAST_RULE} on the ${aaaJobs} AAA-palette variants`
    );
    const errors: ScanError[] = [];
    const perJob = await mapLimit(jobs, CONCURRENCY, async (job) => {
      const label = `${job.page} [${variantLabel(job)}]`;
      try {
        const findings = await scan(activeBrowser, baseUrl, job);
        console.log(
          `  ${findings.length === 0 ? 'ok  ' : 'FAIL'} ${label}` +
            (findings.length > 0 ? ` (${findings.length} violation nodes)` : '')
        );
        return findings;
      } catch (error: unknown) {
        // Keep scanning the rest so one broken scenario does not hide other results.
        const message = firstLine(error);
        errors.push({ page: job.page, variant: variantLabel(job), message });
        console.log(`  ERR  ${label}: ${message}`);
        return [];
      }
    });
    const findings = perJob.flat();
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
          `${rules.size > 0 ? `: ${[...rules].join(', ')}` : ''}), ${errors.length} variants not scanned.`
      );
      return 1;
    }
    console.log(
      `a11y: no WCAG A/AA violations across ${jobs.length} page variants, ` +
        `and no AAA contrast violations across the ${aaaJobs} AAA-palette variants.`
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
    console.error('a11y: check aborted:', error);
    process.exitCode = 1;
  }
);
