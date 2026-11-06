/**
 * @fileoverview Interface labels the scripts write: their English defaults, the site's
 * overrides, `{name}` placeholders, and the warning for unknown `<labels>` keys.
 *
 * Sites translate the skin through `<custom><supaSkin><labels>` in `site.xml`. Velocity
 * (`#supaBuildLabels` in `site-macros.vm`) owns the full key set and emits each overridden key
 * the scripts use as `data-supa-label-<kebab-key>` on `<body>`, so an English site carries no
 * label attributes and the scripts fall back to the defaults below. The keys and English text
 * must match `#supaLabelDefaults` and the "Labels" table in `src/site/markdown/configuration.md`.
 */

/** English text of every label the scripts write, keyed as in `<labels>`. */
export const LABEL_DEFAULTS = {
  permalink: 'Permalink to {heading}',
  searchHint: 'Type to search navigation, headings, and site pages.',
  searchResultCount: 'Results: {count}',
  searchNoResults: 'No results for “{query}”',
  searchBadgePage: 'Page',
  searchBadgeNav: 'Nav',
  searchBadgeSection: 'Section',
  searchSectionPage: 'Site Page',
  searchSectionCurrent: 'Current Page',
  searchSectionNav: 'Navigation',
  themeTrigger: 'Color theme: {mode}',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeAuto: 'Auto',
  colorSchemeTrigger: 'Color scheme: {name}',
  colorSchemeFuro: 'Furo',
  colorSchemeBootstrap: 'Bootstrap 6',
  colorSchemeModus: 'Modus',
  colorSchemeModusTinted: 'Modus Tinted',
  colorSchemeModusDeuteranopia: 'Modus Deuteranopia',
  colorSchemeModusTritanopia: 'Modus Tritanopia',
  copyCode: 'Copy code',
  copyCopied: 'Copied!',
  copyFailed: 'Copy failed',
  backToTop: 'Back to top',
  codeShow: 'Show code',
  codeHide: 'Hide code',
  alertDismiss: 'Close',
  tabFallback: 'Tab {n}',
  accordionFallback: 'Section {n}',
  admonition: 'Admonition',
  admonitionAttention: 'Attention',
  admonitionCaution: 'Caution',
  admonitionDanger: 'Danger',
  admonitionError: 'Error',
  admonitionHint: 'Hint',
  admonitionImportant: 'Important',
  admonitionNote: 'Note',
  admonitionSeeAlso: 'See also',
  admonitionTip: 'Tip',
  admonitionTodo: 'Todo',
  admonitionWarning: 'Warning'
} as const;

/** A label key the scripts read. */
export type LabelKey = keyof typeof LABEL_DEFAULTS;

/** Values for a label's `{name}` placeholders. */
export type LabelVars = Readonly<Record<string, string | number>>;

/** Matches a `{name}` placeholder and the whitespace before it. */
const PLACEHOLDER_PATTERN = /(\s*)\{(\w+)\}/g;

/** Ignored-label lists already reported, keyed by attribute and value, so each page warns once. */
const reportedIgnoredLabels = new Set<string>();

/**
 * Fills the `{name}` placeholders of `template` from `vars`, as `#supaFillLabel` does in
 * Velocity: an empty value removes the placeholder and the whitespace before it, so "Permalink
 * to {heading}" for a heading without text reads "Permalink to". A placeholder `vars` does not
 * name is left as written, so a translator's typo shows instead of vanishing.
 *
 * @param template - Label text with `{name}` placeholders.
 * @param vars - Placeholder values.
 * @returns The filled label.
 */
export function fillLabel(template: string, vars: LabelVars = {}): string {
  return template
    .replace(PLACEHOLDER_PATTERN, (placeholder: string, space: string, name: string) => {
      if (!Object.prototype.hasOwnProperty.call(vars, name)) {
        return placeholder;
      }
      const value = String(vars[name]);
      return value === '' ? '' : `${space}${value}`;
    })
    .trim();
}

/**
 * Returns a label in the site's language: the page's `data-supa-label-<kebab-key>` override on
 * `<body>` when it has text, else the English default, with its placeholders filled. The
 * result is plain text; callers set it with `textContent` or `setAttribute`, never as HTML.
 *
 * @param key - Label key, such as `searchNoResults`.
 * @param vars - Placeholder values, such as `{ query: 'maven' }`.
 * @returns The label text.
 */
export function getLabel(key: LabelKey, vars?: LabelVars): string {
  // Velocity never emits a blank override, but an empty accessible name fails WCAG 4.1.2, so a
  // blank attribute from hand-written or older HTML falls back to English too.
  const attr = typeof document === 'undefined' ? null : document.body?.getAttribute(
    `data-supa-label-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
  );
  return fillLabel(attr?.trim() || LABEL_DEFAULTS[key], vars);
}

/**
 * Logs one console warning naming the `<labels>` keys the skin does not know, which Velocity
 * lists in `data-supa-unknown-labels` on `<body>`, and one naming the known keys whose value
 * contains markup, listed in `data-supa-markup-labels`. Either label changes nothing on the page
 * (an element inside a label leaves Doxia's parsed value empty, so it stays English), so the
 * warning is the only sign of it. Each distinct list is reported once, so running the enhancers
 * again on the same page stays quiet.
 *
 * @returns True if a warning was logged.
 */
export function warnUnknownLabels(): boolean {
  const unknown = warnIgnoredLabels(
    'data-supa-unknown-labels',
    'unknown <labels> keys in site.xml were ignored'
  );
  const markup = warnIgnoredLabels(
    'data-supa-markup-labels',
    '<labels> in site.xml that contain markup were ignored (write < as &lt;)'
  );
  return unknown || markup;
}

/**
 * Logs one console warning for the space-separated label keys in a `<body>` attribute, unless
 * the attribute is absent or the same list was already reported.
 *
 * @param attribute - The `<body>` attribute that lists the keys.
 * @param message - What happened to the keys, written before the list.
 * @returns True if a warning was logged.
 */
function warnIgnoredLabels(attribute: string, message: string): boolean {
  const raw = document.body?.getAttribute(attribute)?.trim();
  if (!raw || reportedIgnoredLabels.has(`${attribute}=${raw}`)) {
    return false;
  }
  reportedIgnoredLabels.add(`${attribute}=${raw}`);
  console.warn(`Supa Maven Skin: ${message}: ${raw.split(/\s+/).join(', ')}`);
  return true;
}
