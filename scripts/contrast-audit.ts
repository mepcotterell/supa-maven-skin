/**
 * @fileoverview WCAG 2.2 contrast audit of the compiled skin CSS, used by `lint-scss.ts`.
 *
 * The audit works on what renders, not on a fixed list of token pairs. For each built-in palette
 * and polarity it collects the custom properties that apply to `<html>` (the same cascade the
 * browser runs: matching selector, specificity, source order), resolves `var()`, `light-dark()`,
 * `rgb()`, `oklch()` (including relative `oklch(from ...)`), and `color-mix()` in OKLCH or sRGB
 * down to sRGB, alpha-composites translucent backgrounds over the surface underneath them, and
 * checks every foreground declared in `SURFACE_AUDITS` against its WCAG target. Declaring
 * surfaces as the CSS expressions the rules in `_content.scss`, `_layout.scss`, `_sidebar.scss`,
 * `_toc.scss`, and Bootstrap's component styles actually paint keeps the audit honest when the
 * `_variables.scss` bridge changes which token feeds which component.
 */
import type { Root } from 'postcss';

/** Light or dark polarity, as set on `html[data-bs-theme]` by the `<head>` script. */
export type Polarity = 'light' | 'dark';

/**
 * How a foreground is judged: `text` uses the palette's text target (WCAG 1.4.3 AA 4.5:1 or
 * 1.4.6 AAA 7.0:1); `non-text` (icons, control borders) uses the 1.4.11 target, raised to 4.5:1
 * for AAA palettes.
 */
export type ContrastRole = 'text' | 'non-text';

/** OKLCH coordinates; `h` is NaN when the hue is missing (`none`). */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** An sRGB color with straight (non-premultiplied) alpha; every channel is in `[0, 1]`. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
  /**
   * Coordinates the color was written or mixed in, when that was OKLCH. `color-mix()` reuses
   * them instead of converting back from sRGB, so an explicit hue is never mistaken for missing.
   */
  oklch?: Oklch;
}

/** One color painted on a surface. */
export interface ForegroundSpec {
  /** What the color paints, such as `link` or `title text`. */
  label: string;
  /** CSS color expression exactly as the painting rule declares it. */
  color: string;
  /** Which WCAG target applies. */
  role: ContrastRole;
}

/** A background surface and every foreground that renders on it. */
export interface SurfaceSpec {
  /** Where the surface appears, used in violation messages. */
  surface: string;
  /**
   * Background colors from the page up to the surface itself, bottom first. A layer whose
   * custom property is undefined counts as transparent, as `background-color` does in CSS.
   */
  layers: readonly string[];
  /** Foreground colors painted on the topmost layer. */
  foregrounds: readonly ForegroundSpec[];
}

/** Result of auditing one palette in one polarity. */
export interface ContrastAuditResult {
  /** Number of foreground/surface pairs measured. */
  checked: number;
  /** Human-readable violation messages; empty when every pair passes. */
  violations: string[];
}

/** Built-in palette IDs, as written in `[data-supa-palette="..."]`. */
export const PALETTE_IDS: readonly string[] = [
  'furo',
  'bootstrap',
  'modus',
  'modus-tinted',
  'modus-deuteranopia',
  'modus-tritanopia'
];

/** Both polarities every palette defines through `light-dark()`. */
export const POLARITIES: readonly Polarity[] = ['light', 'dark'];

/** Every semantic foreground token; each must read as text on both page surfaces. */
const PAGE_TEXT_TOKENS: readonly string[] = [
  '--color-foreground-primary',
  '--color-foreground-secondary',
  '--color-foreground-muted',
  '--color-brand-primary',
  '--color-brand-content',
  '--supa-admonition-note-accent',
  '--supa-admonition-tip-accent',
  '--supa-admonition-important-accent',
  '--supa-admonition-warning-accent',
  '--supa-admonition-caution-accent',
  '--supa-admonition-todo-accent'
];

/** Page background under every article surface (`body.supa-body` in `_layout.scss`). */
const PAGE = 'var(--color-background-primary)';

/**
 * Admonition box background (`.supa-admonition` in `_content.scss`). No palette defines it
 * today, so it is transparent, but the title bar is composited over it so a future value counts.
 */
const ADMONITION_BOX = 'var(--color-admonition-background)';

/**
 * Prose link color: `.supa-article a:not(...)` in `_content.scss` is unlayered, so it also wins
 * over Bootstrap's layered `.alert-link` inside alerts and admonitions.
 */
const LINK = 'var(--color-brand-content)';

/**
 * Admonition kinds in `_content.scss`, keyed by the `--supa-admonition-<accent>-*` token pair
 * they paint with, with the `.admonition-*` classes that share it.
 */
const ADMONITION_KINDS: ReadonlyArray<{ accent: string; classes: string }> = [
  { accent: 'note', classes: 'note, seealso' },
  { accent: 'tip', classes: 'tip, hint' },
  { accent: 'important', classes: 'important, admonition' },
  { accent: 'warning', classes: 'warning, caution' },
  { accent: 'caution', classes: 'danger, attention, error' },
  { accent: 'todo', classes: 'todo' }
];

/**
 * Every theme in Bootstrap 6's `$theme-colors` (`node_modules/bootstrap/scss/_theme.scss`), since
 * any component can carry any of them: `[!ALERT:...]` accepts six, but `#bsAlert` and raw HTML
 * pass any theme name through, and the component playground offers `accent`. `.theme-<name>`
 * maps each `--theme-<key>` to `--<name>-<key>`. `_variables.scss` bridges those to the
 * palette's tokens, except `inverse` (bridged only on `modus-tritanopia`'s light surface) and
 * `secondary` (only partly bridged on the `modus*` palettes), which keep Bootstrap's grays.
 */
const BOOTSTRAP_THEMES: readonly string[] = [
  'primary',
  'accent',
  'success',
  'info',
  'warning',
  'danger',
  'secondary',
  'inverse'
];

/**
 * Sidebar column and drawer background (`.supa-sidebar-column` and the drawer's `--drawer-bg`
 * in `_layout.scss`), under every sidebar navigation link.
 */
const SIDEBAR = 'var(--color-background-secondary)';

/**
 * How Bootstrap 6 paints a themed component: the fill and the text drawn on it, written with
 * `--theme-<key>` the way the component rules in `node_modules/bootstrap/scss` declare them.
 * A fill of `transparent` sits directly on the page.
 *
 * These are the pairs a component shows without a pointer on it, including a toggle button
 * left on (`.active`, a checked `.btn-check`), which the component showcase renders at rest.
 * The hover and press colors that Bootstrap's button, nav, list-group, and chip rules (and the
 * solid button override in `_bootstrap-supa.scss`) derive with `oklch(from ...)` or the
 * `bg-muted` fill are not audited yet.
 */
const THEME_PAINTS: ReadonlyArray<{ variant: string; fill: string; text: string }> = [
  {
    // `.btn` / `.btn-solid`, `.badge`, `.avatar`, `.page-link.active`, `.chip.active`,
    // `.menu-item.active`, `.nav-pills .nav-link.active`, `.card-header`, `.stepper-item.active`
    variant: 'solid fill',
    fill: 'var(--theme-bg)',
    text: 'var(--theme-contrast)'
  },
  {
    // `.btn-outline.active` (and a checked `.btn-check`) darkens both colors in `_button.scss`.
    variant: 'outline button toggled on',
    fill: 'oklch(from var(--theme-bg) calc(l * .9) calc(c * 1.15) h)',
    text: 'oklch(from var(--theme-contrast) calc(l * .9) calc(c * 1.15) h)'
  },
  {
    // `.btn-outline`, `.btn-text`, `.btn-link`, `.badge-outline`, themed `.page-link` and
    // `.menu-item` (whose menu is the page color)
    variant: 'outline, text, and link',
    fill: 'transparent',
    text: 'var(--theme-fg)'
  },
  {
    // `.btn-subtle`, `.badge-subtle`, `.avatar-subtle`, `.chip`, `.list-group-item`,
    // `.nav-link.active`, the open `.accordion-button`, and `.alert` (with links, above)
    variant: 'subtle fill',
    fill: 'var(--theme-bg-subtle)',
    text: 'var(--theme-fg)'
  },
  {
    // `.toast-header`, `.card-subtle` header and footer
    variant: 'subtle fill, emphasized text',
    fill: 'var(--theme-bg-subtle)',
    text: 'var(--theme-fg-emphasis)'
  }
];

/**
 * Replaces each `--theme-<key>` with the root token `.theme-<name>` maps it to.
 *
 * @param expr - Expression written with `--theme-<key>`.
 * @param theme - Bootstrap theme name.
 * @returns Expression over root tokens.
 */
function forTheme(expr: string, theme: string): string {
  return expr.replace(/--theme-/g, `--${theme}-`);
}

/**
 * Every surface the audit measures, with the foregrounds that render on it. The first two
 * entries are the original token audit (all semantic foregrounds on both page backgrounds,
 * plus control borders); the rest follow the rules that paint admonitions, alerts, the
 * sidebar, TOC, and search dialog states, and every Bootstrap 6 themed component.
 */
export const SURFACE_AUDITS: readonly SurfaceSpec[] = [
  {
    surface: '--color-background-primary',
    layers: [PAGE],
    foregrounds: [
      ...PAGE_TEXT_TOKENS.map(
        (token: string): ForegroundSpec => ({ label: token, color: `var(${token})`, role: 'text' })
      ),
      {
        label: '--color-foreground-border',
        color: 'var(--color-foreground-border)',
        role: 'non-text'
      }
    ]
  },
  {
    surface: '--color-background-secondary',
    layers: [PAGE, 'var(--color-background-secondary)'],
    foregrounds: PAGE_TEXT_TOKENS.map(
      (token: string): ForegroundSpec => ({ label: token, color: `var(${token})`, role: 'text' })
    )
  },
  ...ADMONITION_KINDS.map(
    ({ accent, classes }): SurfaceSpec => ({
      surface: `admonition title bar (${classes})`,
      layers: [PAGE, ADMONITION_BOX, `var(--supa-admonition-${accent}-bg)`],
      foregrounds: [
        { label: 'title text', color: 'var(--color-foreground-primary)', role: 'text' },
        { label: 'title link', color: LINK, role: 'text' },
        { label: 'icon', color: `var(--supa-admonition-${accent}-accent)`, role: 'non-text' }
      ]
    })
  ),
  {
    surface: 'admonition body',
    layers: [PAGE, ADMONITION_BOX],
    foregrounds: [
      { label: 'body text', color: 'var(--color-foreground-primary)', role: 'text' },
      { label: 'body link', color: LINK, role: 'text' }
    ]
  },
  ...BOOTSTRAP_THEMES.map(
    (theme: string): SurfaceSpec => ({
      surface: `.alert.theme-${theme}`,
      layers: [PAGE, `var(--${theme}-bg-subtle)`],
      foregrounds: [
        { label: 'text', color: `var(--${theme}-fg)`, role: 'text' },
        { label: 'link', color: LINK, role: 'text' }
      ]
    })
  ),
  {
    // `[!ALERT:light]` and `[!ALERT:dark]` name no Bootstrap 6 theme, so the alert keeps its
    // defaults: inherited text color on `--alert-bg: var(--bg-1)`.
    surface: '.alert without a Bootstrap theme (light, dark)',
    layers: [PAGE, 'var(--bg-1)'],
    foregrounds: [
      { label: 'text', color: 'var(--color-foreground-primary)', role: 'text' },
      { label: 'link', color: LINK, role: 'text' }
    ]
  },
  // Sidebar navigation (`.supa-nav-link` in `_sidebar.scss`). The hover rule also paints the
  // `.supa-nav-label` of a hovered group `<summary>`, whose own hover background is the same.
  {
    surface: 'sidebar link',
    layers: [PAGE, SIDEBAR],
    foregrounds: [{ label: 'link', color: 'var(--color-foreground-primary)', role: 'text' }]
  },
  {
    surface: 'sidebar link, hovered',
    layers: [PAGE, SIDEBAR, 'var(--color-background-hover)'],
    foregrounds: [{ label: 'link', color: 'var(--supa-nav-hover-fg)', role: 'text' }]
  },
  {
    surface: 'sidebar current page (.supa-nav-link.active)',
    layers: [PAGE, SIDEBAR, 'var(--supa-nav-active-bg)'],
    foregrounds: [{ label: 'link', color: 'var(--supa-nav-active-fg)', role: 'text' }]
  },
  // "On this page" TOC (`.supa-toc-nav .nav-link` in `_toc.scss`): the inline column is
  // transparent over the page and the drawer's `--drawer-bg` is the page color. Links at rest
  // (`--color-foreground-secondary`) and hovered (`--color-foreground-primary`) paint no
  // background, so the page surface above already measures them.
  {
    surface: 'TOC current section (.nav-link.active)',
    layers: [PAGE, 'color-mix(in srgb, var(--color-brand-primary) 6%, transparent)'],
    foregrounds: [{ label: 'link', color: 'var(--color-brand-primary)', role: 'text' }]
  },
  // Search dialog (`.supa-search-result-*` in `_layout.scss`): the dialog is the page color and
  // a result at rest sits on `--color-background-secondary`, which the surface above measures.
  {
    surface: 'search result, active or hovered',
    layers: [PAGE, 'var(--color-background-hover)'],
    foregrounds: [
      { label: 'title', color: 'var(--supa-nav-hover-fg)', role: 'text' },
      { label: 'snippet', color: 'var(--color-foreground-secondary)', role: 'text' }
    ]
  },
  ...[
    { state: 'a result', item: 'var(--color-background-secondary)' },
    { state: 'the active result', item: 'var(--color-background-hover)' }
  ].map(
    ({ state, item }): SurfaceSpec => ({
      // `<mark class="supa-search-mark">` in a result's title or snippet
      surface: `search match highlight in ${state}`,
      layers: [PAGE, item, 'color-mix(in srgb, var(--color-brand-primary) 22%, transparent)'],
      foregrounds: [{ label: 'match', color: 'var(--color-foreground-primary)', role: 'text' }]
    })
  ),
  {
    surface: 'item badge (.supa-search-result-badge, .supa-version-badge)',
    layers: [PAGE, SIDEBAR, 'var(--color-background-item)'],
    foregrounds: [{ label: 'text', color: 'var(--color-foreground-secondary)', role: 'text' }]
  },
  ...BOOTSTRAP_THEMES.flatMap((theme: string): SurfaceSpec[] =>
    THEME_PAINTS.map(
      ({ variant, fill, text }): SurfaceSpec => ({
        surface: `.theme-${theme} ${variant}`,
        layers: fill === 'transparent' ? [PAGE] : [PAGE, forTheme(fill, theme)],
        foregrounds: [{ label: 'text', color: forTheme(text, theme), role: 'text' }]
      })
    )
  )
];

/**
 * Splits a CSS argument list at top-level separators, ignoring separators nested in parentheses.
 *
 * @param input - Argument text without the enclosing function parentheses.
 * @param separator - `,` for comma-separated arguments, or ` ` for any run of whitespace.
 * @returns Trimmed, non-empty argument strings.
 */
export function splitTopLevel(input: string, separator: ',' | ' '): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    }
    const isSeparator: boolean = separator === ',' ? ch === ',' : /\s/.test(ch);
    if (isSeparator && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

/**
 * Splits `name(args)` into its function name and argument text when the parentheses enclose the
 * whole value.
 *
 * @param value - Trimmed CSS value.
 * @returns Lower-case function name and raw argument text, or null when not a single call.
 */
function parseFunctionCall(value: string): { name: string; args: string } | null {
  const match = value.match(/^([a-zA-Z-]+)\(/);
  if (!match || !value.endsWith(')')) {
    return null;
  }
  let depth = 0;
  for (let i = match[0].length - 1; i < value.length; i++) {
    if (value[i] === '(') {
      depth++;
    } else if (value[i] === ')') {
      depth--;
      if (depth === 0 && i !== value.length - 1) {
        return null;
      }
    }
  }
  return { name: (match[1] ?? '').toLowerCase(), args: value.slice(match[0].length, -1) };
}

/**
 * Parses a 3, 4, 6, or 8 digit hex color.
 *
 * @param hex - Hex color with leading `#`.
 * @returns Parsed color.
 */
function parseHex(hex: string): Rgba {
  let digits: string = hex.slice(1);
  if (digits.length === 3 || digits.length === 4) {
    digits = digits
      .split('')
      .map((d: string) => d + d)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(digits)) {
    throw new Error(`Invalid hex color '${hex}'`);
  }
  const channel = (i: number): number => parseInt(digits.slice(i, i + 2), 16) / 255;
  return { r: channel(0), g: channel(2), b: channel(4), a: digits.length === 8 ? channel(6) : 1 };
}

/**
 * Parses a CSS number or percentage, scaling a percentage so `100%` equals `percentScale`.
 *
 * @param token - Number or percentage token.
 * @param percentScale - Value that `100%` maps to.
 * @returns Parsed number.
 */
function parseNumber(token: string, percentScale: number): number {
  const value: number = parseFloat(token);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid number '${token}'`);
  }
  return token.trim().endsWith('%') ? (value / 100) * percentScale : value;
}

/**
 * Splits a color function's arguments into channel tokens and an optional alpha, accepting both
 * legacy comma syntax and modern `a b c / alpha` syntax.
 *
 * @param args - Raw argument text.
 * @returns Channel tokens and alpha token (undefined when omitted).
 */
function splitChannels(args: string): { channels: string[]; alpha: string | undefined } {
  if (args.includes(',')) {
    const parts: string[] = splitTopLevel(args, ',');
    return { channels: parts.slice(0, 3), alpha: parts[3] };
  }
  const [channelText, alphaText] = args.split('/');
  return { channels: splitTopLevel(channelText ?? '', ' '), alpha: alphaText?.trim() };
}

/**
 * Converts one gamma-encoded sRGB channel to linear light.
 *
 * @param c - Gamma-encoded channel in `[0, 1]`.
 * @returns Linear-light channel.
 */
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts one linear-light channel to gamma-encoded sRGB, clipped to `[0, 1]`.
 *
 * @param c - Linear-light channel.
 * @returns Gamma-encoded channel.
 */
function toGamma(c: number): number {
  const encoded: number = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, encoded));
}

/**
 * Chroma below which a color converted into OKLCH has a missing hue. CSS Color 4 leaves the
 * cutoff to implementations; this is Chromium's, measured with Playwright Chromium:
 * `rgb(211 200 189)` (C ≈ 0.0195) converts with hue `none`, `rgb(212 200 188)` (C ≈ 0.0213)
 * keeps its hue. It decides the hue of tints mixed from near-neutral backgrounds such as
 * modus-tinted's `#fbf7f0`, which would otherwise swing the mix toward orange.
 */
const ACHROMATIC_CHROMA = 0.02;

/**
 * Converts an sRGB color to OKLCH using Björn Ottosson's OKLab matrices, or returns the
 * coordinates it was written in.
 *
 * @param color - sRGB color.
 * @returns Lightness `l` in `[0, 1]`, chroma `c`, hue `h` in degrees (NaN when missing, so
 *     color-mix() takes the other color's hue), and alpha.
 */
function srgbToOklch(color: Rgba): Oklch & { alpha: number } {
  if (color.oklch) {
    return { ...color.oklch, alpha: color.a };
  }
  const r: number = toLinear(color.r);
  const g: number = toLinear(color.g);
  const b: number = toLinear(color.b);
  const lc: number = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mc: number = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const sc: number = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const l: number = 0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc;
  const a: number = 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc;
  const bb: number = 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc;
  const c: number = Math.hypot(a, bb);
  const h: number =
    c < ACHROMATIC_CHROMA ? NaN : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l, c, h, alpha: color.a };
}

/**
 * Converts an OKLCH color to sRGB, clipping out-of-gamut channels.
 *
 * Browsers may gamut-map by reducing chroma instead of clipping; for the low-chroma tints mixed
 * here the luminance difference is far below the precision of a contrast ratio.
 *
 * @param l - Lightness in `[0, 1]`.
 * @param c - Chroma.
 * @param h - Hue in degrees (NaN is treated as 0, which is correct for achromatic colors).
 * @param alpha - Alpha in `[0, 1]`.
 * @returns sRGB color.
 */
function oklchToSrgb(l: number, c: number, h: number, alpha: number): Rgba {
  const hue: number = Number.isNaN(h) ? 0 : (h * Math.PI) / 180;
  const a: number = c * Math.cos(hue);
  const b: number = c * Math.sin(hue);
  const lc: number = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3);
  const mc: number = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3);
  const sc: number = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3);
  return {
    r: toGamma(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc),
    g: toGamma(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc),
    b: toGamma(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc),
    a: alpha
  };
}

/**
 * Normalizes `color-mix()` percentages as CSS Color 5 does: an omitted percentage is the
 * complement of the other (both omitted means 50/50), and a sum below 100% scales the result's
 * alpha instead of the mix.
 *
 * @param firstPercent - First percentage, or undefined when omitted.
 * @param secondPercent - Second percentage, or undefined when omitted.
 * @returns Weights that sum to 1, and the alpha multiplier.
 */
function mixWeights(
  firstPercent: number | undefined,
  secondPercent: number | undefined
): { p1: number; p2: number; alphaMultiplier: number } {
  const p1: number = firstPercent ?? (secondPercent === undefined ? 50 : 100 - secondPercent);
  const p2: number = secondPercent ?? 100 - p1;
  const sum: number = p1 + p2;
  if (sum <= 0) {
    throw new Error('color-mix() percentages must not sum to zero');
  }
  return { p1: p1 / sum, p2: p2 / sum, alphaMultiplier: sum < 100 ? sum / 100 : 1 };
}

/**
 * Mixes two colors in gamma-encoded sRGB with premultiplied alpha, as CSS Color 5
 * `color-mix(in srgb, ...)` does. The skin's tints (`color-mix(in srgb, <brand> 12%,
 * transparent)`) come out as the brand color at 12% alpha, which the caller then composites.
 *
 * @param first - First color.
 * @param firstPercent - First percentage, or undefined when omitted.
 * @param second - Second color.
 * @param secondPercent - Second percentage, or undefined when omitted.
 * @returns Mixed sRGB color.
 */
export function mixInSrgb(
  first: Rgba,
  firstPercent: number | undefined,
  second: Rgba,
  secondPercent: number | undefined
): Rgba {
  const { p1, p2, alphaMultiplier } = mixWeights(firstPercent, secondPercent);
  const alpha: number = first.a * p1 + second.a * p2;
  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const channel = (c1: number, c2: number): number =>
    (c1 * first.a * p1 + c2 * second.a * p2) / alpha;
  return {
    r: channel(first.r, second.r),
    g: channel(first.g, second.g),
    b: channel(first.b, second.b),
    a: alpha * alphaMultiplier
  };
}

/**
 * Mixes two colors in OKLCH as CSS Color 5 `color-mix()` does: normalized percentages,
 * premultiplied alpha, missing achromatic hues, and shorter-arc hue interpolation.
 *
 * @param first - First color.
 * @param firstPercent - First percentage, or undefined when omitted.
 * @param second - Second color.
 * @param secondPercent - Second percentage, or undefined when omitted.
 * @returns Mixed sRGB color.
 */
export function mixInOklch(
  first: Rgba,
  firstPercent: number | undefined,
  second: Rgba,
  secondPercent: number | undefined
): Rgba {
  const { p1, p2, alphaMultiplier } = mixWeights(firstPercent, secondPercent);

  const c1 = srgbToOklch(first);
  const c2 = srgbToOklch(second);
  // A missing hue takes the other color's; when both are missing the result's hue is too.
  let h1: number = Number.isNaN(c1.h) ? c2.h : c1.h;
  let h2: number = Number.isNaN(c2.h) ? c1.h : c2.h;
  if (h2 - h1 > 180) {
    h1 += 360;
  } else if (h2 - h1 < -180) {
    h2 += 360;
  }

  const alpha: number = c1.alpha * p1 + c2.alpha * p2;
  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const l: number = (c1.l * c1.alpha * p1 + c2.l * c2.alpha * p2) / alpha;
  const c: number = (c1.c * c1.alpha * p1 + c2.c * c2.alpha * p2) / alpha;
  const h: number = (h1 * p1 + h2 * p2) % 360;
  return { ...oklchToSrgb(l, c, h, alpha * alphaMultiplier), oklch: { l, c, h } };
}

/**
 * Splits one `color-mix()` color argument into its color and optional percentage.
 *
 * @param arg - Argument such as `var(--x) 12%`.
 * @returns Color expression and percentage (undefined when omitted).
 */
function splitMixArgument(arg: string): { color: string; percent: number | undefined } {
  const tokens: string[] = splitTopLevel(arg, ' ');
  const percentIndex: number = tokens.findIndex((t: string) => /^[\d.]+%$/.test(t));
  if (percentIndex === -1) {
    return { color: arg, percent: undefined };
  }
  const percent: number = parseFloat(tokens[percentIndex] ?? '');
  tokens.splice(percentIndex, 1);
  return { color: tokens.join(' '), percent };
}

/**
 * Evaluates one channel of a relative `oklch(from ...)` color: a channel keyword (`l`, `c`, `h`,
 * `alpha`), a number, or a `calc()` of two such operands joined by `*`, `/`, `+`, or `-`. That
 * covers every relative color Bootstrap 6 and the skin derive button states with, such as
 * `calc(l * .9)`; anything else throws so an unsupported form is reported, not mismeasured.
 *
 * @param expr - Channel expression.
 * @param channels - Origin color's channel values; a missing hue is 0, as CSS Color 5 requires.
 * @returns Channel value.
 */
function evalRelativeChannel(expr: string, channels: Readonly<Record<string, number>>): number {
  const value: string = expr.trim();
  const keyword: number | undefined = channels[value];
  if (keyword !== undefined) {
    return keyword;
  }
  const call = parseFunctionCall(value);
  if (call?.name === 'calc') {
    const [left, op, right, ...rest] = splitTopLevel(call.args, ' ');
    if (left === undefined || op === undefined || right === undefined || rest.length > 0) {
      throw new Error(`Unsupported calc() in relative color: '${value}'`);
    }
    const a: number = evalRelativeChannel(left, channels);
    const b: number = evalRelativeChannel(right, channels);
    switch (op) {
      case '*':
        return a * b;
      case '/':
        return a / b;
      case '+':
        return a + b;
      case '-':
        return a - b;
      default:
        throw new Error(`Unsupported calc() operator '${op}' in '${value}'`);
    }
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(value)) {
    throw new Error(`Unsupported relative color channel '${value}'`);
  }
  return parseFloat(value);
}

/**
 * Resolves a relative color, `oklch(from <origin> <l> <c> <h> [/ <alpha>])`, which Bootstrap 6
 * uses to darken button fills and text on hover and press.
 *
 * @param args - Argument text after `oklch(`, starting with `from`.
 * @param tokens - Custom property values that apply to `<html>`.
 * @param polarity - Polarity that selects the `light-dark()` branch.
 * @param seen - Custom properties already being resolved, to detect cycles.
 * @returns Resolved color, or null when the origin color is undefined.
 */
function resolveRelativeOklch(
  args: string,
  tokens: ReadonlyMap<string, string>,
  polarity: Polarity,
  seen: ReadonlySet<string>
): Rgba | null {
  const parts: string[] = splitTopLevel(args, ' ');
  const slash: number = parts.indexOf('/');
  const channelParts: string[] = slash === -1 ? parts.slice(2) : parts.slice(2, slash);
  const alphaPart: string | undefined = slash === -1 ? undefined : parts[slash + 1];
  if (parts[0] !== 'from' || parts[1] === undefined || channelParts.length !== 3) {
    throw new Error(`Unsupported relative oklch() syntax 'oklch(${args})'`);
  }
  const origin: Rgba | null = resolveColor(parts[1], tokens, polarity, seen);
  if (!origin) {
    return null;
  }
  const lch = srgbToOklch(origin);
  const channels: Record<string, number> = {
    l: lch.l,
    c: lch.c,
    h: Number.isNaN(lch.h) ? 0 : lch.h,
    alpha: lch.alpha
  };
  const [l, c, h] = channelParts.map((part: string) => evalRelativeChannel(part, channels));
  const alpha: number =
    alphaPart === undefined ? lch.alpha : evalRelativeChannel(alphaPart, channels);
  const result: Oklch = { l: l ?? 0, c: Math.max(0, c ?? 0), h: h ?? 0 };
  return { ...oklchToSrgb(result.l, result.c, result.h, alpha), oklch: result };
}

/**
 * Resolves a CSS color expression to sRGB against the custom properties on `<html>`.
 *
 * @param expr - CSS color expression (hex, keyword, `var()`, `light-dark()`, `rgb()`,
 *     `oklch()` including relative `oklch(from ...)`, or `color-mix(in oklch | srgb, ...)`).
 * @param tokens - Custom property values that apply to `<html>`.
 * @param polarity - Polarity that selects the `light-dark()` branch.
 * @param seen - Custom properties already being resolved, to detect cycles.
 * @returns Resolved color, or null when the expression references an undefined custom property
 *     without a fallback (CSS treats such a value as invalid at computed-value time).
 */
export function resolveColor(
  expr: string,
  tokens: ReadonlyMap<string, string>,
  polarity: Polarity,
  seen: ReadonlySet<string> = new Set<string>()
): Rgba | null {
  const value: string = expr.trim();
  const keyword: string = value.toLowerCase();
  if (keyword === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (keyword === 'white') {
    return { r: 1, g: 1, b: 1, a: 1 };
  }
  if (keyword === 'black') {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  if (value.startsWith('#')) {
    return parseHex(value);
  }

  const call = parseFunctionCall(value);
  if (!call) {
    throw new Error(`Unsupported color value '${value}'`);
  }
  const args: string[] = splitTopLevel(call.args, ',');

  switch (call.name) {
    case 'var': {
      const name: string = args[0] ?? '';
      if (seen.has(name)) {
        throw new Error(`Custom property cycle through '${name}'`);
      }
      const tokenValue: string | undefined = tokens.get(name);
      if (tokenValue !== undefined) {
        return resolveColor(tokenValue, tokens, polarity, new Set<string>([...seen, name]));
      }
      const commaIndex: number = call.args.indexOf(',');
      return commaIndex === -1
        ? null
        : resolveColor(call.args.slice(commaIndex + 1), tokens, polarity, seen);
    }
    case 'light-dark': {
      if (args.length !== 2) {
        throw new Error(`light-dark() needs two colors: '${value}'`);
      }
      return resolveColor((polarity === 'light' ? args[0] : args[1]) ?? '', tokens, polarity, seen);
    }
    case 'rgb':
    case 'rgba': {
      const { channels, alpha } = splitChannels(call.args);
      if (channels.length !== 3) {
        throw new Error(`Unsupported rgb() syntax '${value}'`);
      }
      const [r, g, b] = channels.map((t: string) => parseNumber(t, 255) / 255);
      return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: alpha === undefined ? 1 : parseNumber(alpha, 1) };
    }
    case 'oklch': {
      if (/^from\s/.test(call.args.trim())) {
        return resolveRelativeOklch(call.args.trim(), tokens, polarity, seen);
      }
      const { channels, alpha } = splitChannels(call.args);
      if (channels.length !== 3) {
        throw new Error(`Unsupported oklch() syntax '${value}'`);
      }
      const lch: Oklch = {
        l: parseNumber(channels[0] ?? '', 1),
        c: parseNumber(channels[1] ?? '', 0.4),
        h: channels[2] === 'none' ? NaN : parseFloat(channels[2] ?? '')
      };
      const a: number = alpha === undefined ? 1 : parseNumber(alpha, 1);
      return { ...oklchToSrgb(lch.l, lch.c, lch.h, a), oklch: lch };
    }
    case 'color-mix': {
      const space: string = (args[0] ?? '').replace(/\s+/g, ' ');
      if (args.length !== 3 || (space !== 'in oklch' && space !== 'in srgb')) {
        throw new Error(`Only color-mix(in oklch | srgb, ...) is supported: '${value}'`);
      }
      const first = splitMixArgument(args[1] ?? '');
      const second = splitMixArgument(args[2] ?? '');
      const firstColor: Rgba | null = resolveColor(first.color, tokens, polarity, seen);
      const secondColor: Rgba | null = resolveColor(second.color, tokens, polarity, seen);
      if (!firstColor || !secondColor) {
        return null;
      }
      const mix = space === 'in srgb' ? mixInSrgb : mixInOklch;
      return mix(firstColor, first.percent, secondColor, second.percent);
    }
    default:
      throw new Error(`Unsupported color function '${call.name}()' in '${value}'`);
  }
}

/**
 * Paints a color over another with source-over compositing in gamma-encoded sRGB, the space
 * browsers blend `background-color` layers in.
 *
 * @param top - Color painted on top.
 * @param bottom - Color underneath.
 * @returns Composited color.
 */
export function compositeOver(top: Rgba, bottom: Rgba): Rgba {
  const a: number = top.a + bottom.a * (1 - top.a);
  if (a === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const blend = (t: number, b: number): number => (t * top.a + b * bottom.a * (1 - top.a)) / a;
  return { r: blend(top.r, bottom.r), g: blend(top.g, bottom.g), b: blend(top.b, bottom.b), a };
}

/**
 * Computes WCAG 2.2 relative luminance of an opaque sRGB color.
 *
 * @param color - Opaque sRGB color.
 * @returns Relative luminance in `[0, 1]`.
 */
export function relativeLuminance(color: Rgba): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/**
 * Computes the WCAG 2.2 contrast ratio between two opaque sRGB colors.
 *
 * @param first - First opaque color.
 * @param second - Second opaque color.
 * @returns Contrast ratio in `[1, 21]`.
 */
export function contrastRatio(first: Rgba, second: Rgba): number {
  const l1: number = relativeLuminance(first);
  const l2: number = relativeLuminance(second);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Formats a color as `#rrggbb`, appending alpha only when the color is translucent.
 *
 * @param color - sRGB color.
 * @returns Hex string.
 */
export function toHex(color: Rgba): string {
  const byte = (c: number): string =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}${color.a < 1 ? byte(color.a) : ''}`;
}

/**
 * Tests whether one selector from a selector list matches the `<html>` element, and returns
 * its specificity. Only compound selectors built from `html`, `:root`, and `[attr]` /
 * `[attr=value]` are understood; anything else (`:host`, `:not()`, combinators) is treated as
 * not matching, which is right for every custom property rule the skin compiles today.
 *
 * Dart Sass drops the quotes from attribute values (`[data-supa-palette=furo]`), so both quoted
 * and bare values are accepted.
 *
 * @param selector - A single selector (no commas).
 * @param attributes - Attributes present on `<html>`.
 * @returns Specificity weight (ids, classes/attributes, types as base-100 digits), or null.
 */
export function matchRootSelector(
  selector: string,
  attributes: Readonly<Record<string, string>>
): number | null {
  let rest: string = selector.trim();
  if (!rest) {
    return null;
  }
  let specificity = 0;
  while (rest.length > 0) {
    if (rest.startsWith(':root')) {
      specificity += 100;
      rest = rest.slice(':root'.length);
      continue;
    }
    if (/^html(?![\w-])/.test(rest)) {
      specificity += 1;
      rest = rest.slice('html'.length);
      continue;
    }
    const attr = rest.match(/^\[\s*([\w-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([\w-]+))\s*)?\]/);
    if (!attr) {
      return null;
    }
    const name: string = attr[1] ?? '';
    const expected: string | undefined = attr[2] ?? attr[3] ?? attr[4];
    const actual: string | undefined = attributes[name];
    if (actual === undefined || (expected !== undefined && actual !== expected)) {
      return null;
    }
    specificity += 100;
    rest = rest.slice(attr[0].length);
  }
  return specificity;
}

/**
 * Collects the custom properties that apply to `<html>` with the given attributes, by running
 * the cascade (importance, specificity, source order) over the top-level rules of compiled CSS.
 *
 * Rules inside `@media` are skipped: the only ones that set root tokens are the
 * `prefers-contrast: more` escalation to the `modus` tokens and Bootstrap's `prefers-color-scheme`
 * shadow strength, neither of which is a separate palette. Rules inside `@layer` are skipped
 * because unlayered rules beat every layer and Bootstrap declares its root tokens unlayered.
 *
 * @param css - Parsed compiled CSS.
 * @param attributes - Attributes present on `<html>`, such as `data-supa-palette`.
 * @returns Winning value of each custom property.
 */
export function collectRootTokens(
  css: Root,
  attributes: Readonly<Record<string, string>>
): Map<string, string> {
  const winners = new Map<string, { value: string; rank: number }>();
  for (const node of css.nodes) {
    if (node.type !== 'rule') {
      continue;
    }
    let specificity: number | null = null;
    for (const selector of node.selectors) {
      const match: number | null = matchRootSelector(selector, attributes);
      if (match !== null && (specificity === null || match > specificity)) {
        specificity = match;
      }
    }
    if (specificity === null) {
      continue;
    }
    for (const child of node.nodes ?? []) {
      if (child.type !== 'decl' || !child.prop.startsWith('--')) {
        continue;
      }
      const rank: number = (child.important ? 1e6 : 0) + specificity;
      const existing = winners.get(child.prop);
      // Later rules win ties, so `>=` keeps the cascade's source-order rule.
      if (!existing || rank >= existing.rank) {
        winners.set(child.prop, { value: child.value, rank });
      }
    }
  }
  return new Map<string, string>(
    [...winners].map(([prop, entry]): [string, string] => [prop, entry.value])
  );
}

/**
 * Resolves a surface's background layers, compositing each over the one below.
 *
 * @param surface - Surface to resolve.
 * @param tokens - Custom property values on `<html>`.
 * @param polarity - Active polarity.
 * @returns Opaque surface color.
 */
function resolveSurface(
  surface: SurfaceSpec,
  tokens: ReadonlyMap<string, string>,
  polarity: Polarity
): Rgba {
  const [base, ...upper] = surface.layers;
  const page: Rgba | null = resolveColor(base ?? '', tokens, polarity);
  if (!page || page.a < 1) {
    throw new Error(`page background '${base}' must resolve to an opaque color`);
  }
  let color: Rgba = page;
  for (const layer of upper) {
    const resolved: Rgba | null = resolveColor(layer, tokens, polarity);
    if (resolved) {
      color = compositeOver(resolved, color);
    }
  }
  return color;
}

/**
 * Measures every pair in `surfaces` for one palette and polarity against the palette's declared
 * `--supa-wcag-level` targets.
 *
 * @param tokens - Custom property values on `<html>` for this palette and polarity.
 * @param paletteId - Palette ID, for messages.
 * @param polarity - Active polarity.
 * @param surfaces - Surfaces to audit; defaults to `SURFACE_AUDITS`.
 * @returns Number of pairs measured and any violations.
 */
export function auditContrast(
  tokens: ReadonlyMap<string, string>,
  paletteId: string,
  polarity: Polarity,
  surfaces: readonly SurfaceSpec[] = SURFACE_AUDITS
): ContrastAuditResult {
  const wcagLevel: string = (tokens.get('--supa-wcag-level') ?? 'AA').replace(/["']/g, '').trim();
  const minimum: Record<ContrastRole, number> =
    wcagLevel === 'AAA' ? { text: 7.0, 'non-text': 4.5 } : { text: 4.5, 'non-text': 3.0 };
  const where = `palette '${paletteId}' (${polarity})`;
  const violations: string[] = [];
  let checked = 0;

  for (const surface of surfaces) {
    let background: Rgba;
    try {
      background = resolveSurface(surface, tokens, polarity);
    } catch (err: unknown) {
      const message: string = err instanceof Error ? err.message : String(err);
      violations.push(`Cannot resolve ${surface.surface} in ${where}: ${message}.`);
      continue;
    }
    for (const fg of surface.foregrounds) {
      let color: Rgba | null;
      try {
        color = resolveColor(fg.color, tokens, polarity);
      } catch (err: unknown) {
        const message: string = err instanceof Error ? err.message : String(err);
        violations.push(`Cannot resolve ${fg.label} ${fg.color} in ${where}: ${message}.`);
        continue;
      }
      if (!color) {
        violations.push(`Palette '${paletteId}' (${polarity}) does not define ${fg.color} (${fg.label}).`);
        continue;
      }
      checked++;
      // A translucent foreground blends with the surface before it reaches the eye.
      const painted: Rgba = compositeOver(color, background);
      const ratio: number = contrastRatio(painted, background);
      const min: number = minimum[fg.role];
      if (ratio < min) {
        const kind: string =
          fg.role === 'text' ? `${wcagLevel} text contrast` : '1.4.11 non-text contrast';
        // Page-surface entries are labelled by their token already; name the token otherwise.
        const label: string =
          fg.color === `var(${fg.label})` ? fg.label : `${fg.label} ${fg.color}`;
        violations.push(
          `WCAG 2.2 ${kind} violation in ${where}: ${label} (${toHex(color)}) on ` +
            `${surface.surface} (${toHex(background)}) has contrast ${ratio.toFixed(2)}:1 ` +
            `(minimum ${min.toFixed(1)}:1).`
        );
      }
    }
  }
  return { checked, violations };
}
