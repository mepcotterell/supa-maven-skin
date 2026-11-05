# Customizing the Skin

This how-to guide shows how a consumer site adds its own CSS, JavaScript, and `<head>` markup on top of **Supa Maven Skin**, and how to adjust colors, fonts, logos, and page furniture without forking the skin. Every recipe lives in your own project's `src/site/` directory, so upgrading the skin version in `site.xml` keeps your customizations.

> [!NOTE] Before You Start
> This guide assumes your site already builds with **Supa Maven Skin**. If it does not, follow the [Quickstart Tutorial](getting-started.html) first.

---

## Choosing a Customization Layer

Reach for the lightest layer that does the job. Built-in options are tested with every release; your own CSS and scripts are not.

| Goal | Use | Where |
| :--- | :--- | :--- |
| Show or hide built-in furniture (breadcrumbs, previous/next cards, TOC, announcement, source buttons) | `<supaSkin>` options | `src/site/site.xml` |
| Replace brand colors in every color scheme | `<lightCssVariables>` and `<darkCssVariables>` | `src/site/site.xml` |
| Restyle elements, tune tokens per polarity or per color scheme, change widths and fonts | A custom stylesheet | `src/site/resources/css/site.css` |
| Add a favicon, web fonts, analytics, or extra scripts | `<body><head>` | `src/site/site.xml` |
| Replace the copyright line in the footer | `<body><footer>` | `src/site/site.xml` |
| Change what a printed page shows | `@media print` rules in a custom stylesheet | `src/site/resources/css/site.css` |

> [!TIP] Check the Options First
> Many changes need no CSS at all. Browse the [Configuration Options](configuration.html#configuration-options) before writing overrides.

---

## Adding a Custom Stylesheet

1. Create `src/site/resources/css/site.css` in your project:

   ```css
   /* src/site/resources/css/site.css */
   :root {
     --supa-content-max-width: 60rem;
   }
   ```

2. Run `mvn site`. Maven Site Plugin copies everything under `src/site/resources/` to the site root, so the file lands at `target/site/css/site.css`.

Every page links your stylesheet immediately after the skin's own stylesheet, with a path relative to that page. A top-level page and a page in a subdirectory render:

```html
<!-- index.html -->
<link rel="stylesheet" href="./css/supa-maven-skin.min.css" />
<link rel="stylesheet" href="./css/site.css" onerror="this.remove()" />

<!-- sub/page.html -->
<link rel="stylesheet" href="../css/supa-maven-skin.min.css" />
<link rel="stylesheet" href="../css/site.css" onerror="this.remove()" />
```

How your rules win:

- **Source order:** `site.css` loads after the skin's stylesheet, so your rule wins over a skin rule of equal specificity.
- **Cascade layers:** Bootstrap 6 places its styles in cascade layers (`@layer`), but the skin's own rules are unlayered. Any rule in your unlayered `site.css` beats Bootstrap's layered rules regardless of specificity. To beat a skin rule, match or exceed its specificity.
- **Asset URLs:** relative URLs inside a stylesheet resolve against the stylesheet's own location (`css/`). Reference a file in `src/site/resources/images/` as `url("../images/pattern.svg")`.

> [!NOTE] When You Have No Custom Stylesheet
> If your project does not provide `css/site.css`, Doxia Sitetools writes a placeholder containing only `/* You can override this file with your own styles */`, so the link never fails in a normal `mvn site` build. The `onerror="this.remove()"` attribute only matters when pages are served without that file.

---

## Injecting Extra `<head>` Content

Use the `<head>` element inside `<body>` in `site.xml` for markup that belongs in every page's `<head>`, such as a favicon, a web font stylesheet, or an extra script. Wrap the markup in `<![CDATA[ ... ]]>`: Maven Site Plugin requires XHTML content in `<head>` to be escaped (since version 3.5).

```xml
<body>
  <head>
    <![CDATA[
    <link rel="icon" type="image/svg+xml" href="$relativePath/images/favicon.svg" />
    <script src="$relativePath/js/custom.js" defer></script>
    ]]>
  </head>
  <menu name="Documentation">
    <!-- ... -->
  </menu>
</body>
```

**Supa Maven Skin** evaluates this block with Velocity separately for each page, so `$relativePath` becomes the path from the current page back to the site root. Put the referenced files in `src/site/resources/images/` and `src/site/resources/js/`. The snippet above renders as:

```html
<!-- index.html -->
<link rel="icon" type="image/svg+xml" href="./images/favicon.svg" />
<script src="./js/custom.js" defer></script>

<!-- sub/page.html -->
<link rel="icon" type="image/svg+xml" href="../images/favicon.svg" />
<script src="../js/custom.js" defer></script>
```

The injected markup appears near the end of `<head>`: after the skin's stylesheet, your `site.css`, and the `<style id="supa-custom-css-variables">` block generated from `<lightCssVariables>` / `<darkCssVariables>`.

> [!WARNING] Velocity Syntax in Head Content
> Because the block is evaluated as a Velocity template, text that looks like a Velocity reference (`$name`) or directive (`#if`, `#set`) is interpreted rather than copied. Keep JavaScript in separate files under `src/site/resources/js/` instead of inline `<script>` blocks.

> [!CAUTION] Avoid Root-Relative URLs
> A URL such as `/js/custom.js` only works when the site is served from the root of its domain. Sites published to a subdirectory (for example GitHub project pages at `https://example.github.io/my-project/`) need the `$relativePath` prefix.

### Running Scripts After the Skin Initializes

The skin's JavaScript bundle is a `<script type="module">` at the end of `<body>`, and it runs all of its enhancements as soon as it executes. A `defer` script in `<head>` executes *before* the skin's bundle, but the browser fires `DOMContentLoaded` only after every deferred and module script has run. Do DOM work in a `DOMContentLoaded` listener, and by then the "On this page" links, code-block copy buttons, and other synchronous enhancements exist:

```javascript
// src/site/resources/js/custom.js
document.addEventListener('DOMContentLoaded', () => {
  const tocLinks = document.querySelectorAll('#supaTocNav a');
  console.log(`This page has ${tocLinks.length} table-of-contents links.`);
});
```

Mermaid diagrams and KaTeX math load asynchronously afterwards, so they may not be rendered yet when `DOMContentLoaded` fires. So do the Bootstrap 6 widgets that only some pages use (`Carousel`, `Chips`, `Combobox`, `Datepicker`, `NavOverflow`, `OtpInput`, `Range`, `Strength`, `Tab`, and the Component Playground): the skin loads each one's script only on pages whose markup contains it, and adds its plugin to `window.bootstrap` at that point. Once every enhancement, including the Mermaid and KaTeX loaders and those widget scripts, has settled, the skin sets `data-supa-ready="true"` on `<html>`. It does so even when a library fails to load, so "settled" does not guarantee that diagrams or math rendered. The skin dispatches no event at that point, and the attribute is usually set after `DOMContentLoaded`, so check it first and then watch for it:

```javascript
// src/site/resources/js/custom.js
function whenSupaReady(callback) {
  const html = document.documentElement;
  if (html.dataset.supaReady === 'true') {
    callback();
    return;
  }
  new MutationObserver((records, observer) => {
    if (html.dataset.supaReady === 'true') {
      observer.disconnect();
      callback();
    }
  }).observe(html, { attributes: true, attributeFilter: ['data-supa-ready'] });
}

whenSupaReady(() => {
  console.log(`${document.querySelectorAll('.mermaid svg').length} Mermaid diagrams rendered.`);
});
```

The skin checks the page's markup for those widgets once, when it starts. Widget markup that your script adds later, for example in a `DOMContentLoaded` listener, does not load the widget's script: its plugin stays missing from `window.bootstrap`, and its `data-bs-*` attributes do nothing. Keep widgets in the page source where you can. If a script has to add one, also put an element the skin recognizes as that widget in the page source, such as `<span hidden data-bs-toggle="tab"></span>` for tabs, and add the widget in a `whenSupaReady` callback, when its plugin is on `window.bootstrap`.

To react when a reader changes the theme or color scheme, listen for the events the skin dispatches on `document`:

```javascript
document.addEventListener('supa:theme-changed', (event) => {
  // event.detail.mode is 'light', 'dark', or 'auto'; event.detail.resolvedTheme is 'light' or 'dark'.
  console.log(event.detail.mode, event.detail.resolvedTheme);
});

document.addEventListener('supa:palette-changed', (event) => {
  console.log(event.detail.palette); // e.g. 'modus-tinted'
});
```

For the state at page load, read the attributes on `<html>` described in [Choosing Selectors That Survive Upgrades](#choosing-selectors-that-survive-upgrades).

---

## Overriding Design Tokens

**Supa Maven Skin** styles almost everything through CSS custom properties, so changing a token restyles every component that uses it, across all 6 color schemes and both polarities.

| Token family | Examples | Controls |
| :--- | :--- | :--- |
| Palette colors | `--color-brand-primary`, `--color-brand-content`, `--color-background-primary`, `--color-foreground-primary` | Surfaces, text, links, and brand accents. See the full list in [Extending Palettes](configuration.html#extending-palettes-via-lightcssvariables-darkcssvariables). |
| Admonition accents | `--supa-admonition-note-accent`, `--supa-admonition-note-bg` | Admonitions and the matching Bootstrap 6 `.theme-*` colors. |
| Navigation states | `--supa-nav-hover-fg`, `--supa-nav-active-fg`, `--supa-nav-active-bg` | Text of a hovered sidebar link (and the active search result's title), and the current page's sidebar link text and background. |
| Search and control states | `--supa-search-mark-fg`, `--supa-search-mark-bg`, `--supa-bg-active`, `--supa-chip-selected-hover-opacity` | Highlighted search matches, the fill of hovered unthemed buttons and chips, and the fade of a hovered selected chip. |
| Layout | `--supa-sidebar-width` (`16rem`), `--supa-toc-width` (`14rem`), `--supa-content-max-width` (`56rem`) | Width of the inline left sidebar, the inline right TOC, and the article measure. |
| Typography | `--font-stack`, `--font-stack--monospace` | Body and code font families. |

> [!IMPORTANT] Override Source Tokens, Not Derived Ones
> The skin derives Bootstrap 6's component tokens (`--primary-*`, `--success-*`, `--bg-*`, `--fg-*`, and similar) from the tokens above. Override `--color-brand-primary` rather than `--primary-bg`, so buttons, focus rings, badges, and links stay consistent.

### Overriding a Token Everywhere

A `:root` rule in `site.css` overrides a token for every color scheme and both polarities:

```css
@font-face {
  font-family: "Inter";
  src: url("../fonts/Inter.woff2") format("woff2");
  font-display: swap;
}

:root {
  --font-stack: "Inter", system-ui, sans-serif;
  --supa-content-max-width: 60rem;
}
```

The skin declares its default tokens with selectors of the same specificity as `:root`, so your later stylesheet wins. Put self-hosted font files in `src/site/resources/fonts/`.

### Overriding Tokens per Polarity

Pick one of two approaches for different light and dark values:

1. **`light-dark()`**, the same function the skin's tokens are written with. The first value applies in light mode, the second in dark mode:

   ```css
   :root {
     --color-brand-content: light-dark(#6d28d9, #c4b5fd);
   }
   ```

   The skin sets `color-scheme` on `<html>` for `light`, `dark`, and `auto` modes, so this follows the reader's choice and, in `auto` mode, the operating system. `light-dark()` is Baseline 2024: the skin's own stylesheet is compiled with a fallback for older browsers, but your `site.css` is served exactly as written.

2. **The resolved-theme attribute**, which works in browsers without `light-dark()`:

   ```css
   html[data-supa-resolved-theme="dark"] {
     --color-foreground-muted: #b0b8c4;
   }
   ```

   The skin sets `data-supa-resolved-theme` to `light` or `dark` before first paint and updates it when the operating system theme changes in `auto` mode.

> [!WARNING] Do Not Rely on the Bootstrap Theme Attribute Alone
> The skin sets `data-bs-theme` only when the active mode is Light or Dark, whether the reader picked it or `<defaultTheme>` set it. In `auto` mode the attribute is removed, so a rule on `[data-bs-theme="dark"]` never matches readers whose operating system is in dark mode. Use `data-supa-resolved-theme` instead.

### Overriding Tokens per Color Scheme

Scope a rule to one built-in color scheme with the `data-supa-palette` attribute on `<html>`. The `html` type selector raises specificity above the skin's own `[data-supa-palette="..."]` rules:

```css
html[data-supa-palette="furo"] {
  --color-brand-primary: light-dark(#6d28d9, #c4b5fd);
  --color-brand-content: light-dark(#6d28d9, #c4b5fd);
}
```

The override applies only while that scheme is active. Readers who switch to a Modus scheme with the palette picker keep its WCAG 2.2 AAA colors. The valid scheme IDs are `furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, and `modus-tritanopia` (see [Built-In Accessible Color Schemes](configuration.html#built-in-accessible-color-schemes)).

> [!NOTE] Increased-Contrast Readers
> When the operating system requests more contrast (`prefers-contrast: more`) and the reader has not picked a scheme, the skin swaps the default `furo` tokens for the AAA `modus` tokens using a more specific selector. Your `:root` and `html[data-supa-palette="furo"]` overrides of those tokens do not apply in that case, which keeps the high-contrast colors intact.

### Combining `site.css` with `<lightCssVariables>` and `<darkCssVariables>`

The built-in `<lightCssVariables>` and `<darkCssVariables>` options emit a `<style id="supa-custom-css-variables">` block after `site.css`. Keep these behaviors in mind when you use both:

- **They win over `site.css`.** For any variable set in `site.xml`, the generated block beats your `:root` and `html[data-supa-palette="..."]` rules. Set each variable in only one place.
- **They apply to all 6 color schemes.** Use `site.css` with `html[data-supa-palette="..."]` when an override should affect only one scheme.
- **Light values also apply in dark mode** unless you set the same variable in `<darkCssVariables>`. Set both, or use `light-dark()` in `site.css`.

---

## Adding Logos and a Favicon

Put logo files in `src/site/resources/images/` and reference them from `<supaSkin>`:

```xml
<custom>
  <supaSkin>
    <lightLogo>images/logo-light.svg</lightLogo>
    <darkLogo>images/logo-dark.svg</darkLogo>
    <sidebarBrandAlign>left</sidebarBrandAlign>
  </supaSkin>
</custom>
```

- **Paths:** write relative paths from the site root (`images/logo-light.svg`). The skin rewrites them for the directory of each page, so pages in subdirectories load the same file. Values with a URL scheme (such as `https:` or `data:`) or a leading `/` are used unchanged.
- **One or two logos:** with both options set, the skin shows `<lightLogo>` in light mode and `<darkLogo>` in dark mode. With only `<lightLogo>`, that image is used in both.
- **Fallback:** without `<lightLogo>`, the skin uses the `<bannerLeft><image src="..."/></bannerLeft>` image from `site.xml`. A `<bannerLeft href="...">` also sets where the sidebar brand links to.
- **Size:** logos are limited to `2.75rem` tall. The skin's rule uses two classes, so match them in `site.css`: `.supa-sidebar-logo-container .supa-sidebar-logo { max-height: 3.5rem; }`. A single-class `.supa-sidebar-logo` rule has no effect.

The `<lightLogo>` and `<darkLogo>` images carry generic alternative text ("Light Logo" and "Dark Logo", or "Logo" when only `<lightLogo>` is set), so keep the project name visible next to the logo (the default; see `<sidebarHideName>` in [Theme & Branding](configuration.html#theme-branding)) to give the sidebar brand link a meaningful accessible name.

The skin has no favicon option. Add one with a `<link rel="icon">` in `<body><head>`, as shown in [Injecting Extra `<head>` Content](#injecting-extra-head-content).

---

## Adjusting Page Furniture

Prefer a `<supaSkin>` option when one exists, because it removes the markup instead of hiding it:

| Element | How to remove or change it |
| :--- | :--- |
| Announcement banner | Omit `<announcement>` (it is empty by default). |
| Breadcrumbs | `<breadcrumb>false</breadcrumb>` |
| Previous / Next cards | `<prevNextButtons>false</prevNextButtons>` |
| "On this page" sidebar and drawer | `<tocSidebar>false</tocSidebar>` |
| Color scheme picker | `<colorSchemeSelector>false</colorSchemeSelector>` |
| Search box and dialog | `<search>false</search>` |
| Source view / edit buttons | `<sourceViewButton>false</sourceViewButton>`, `<sourceEditButton>false</sourceEditButton>` |
| "Last updated" date | `<footerTimestamp>false</footerTimestamp>` |
| Version badge | `<footerVersion>false</footerVersion>` |
| Copyright line | Replace it with `<body><footer><![CDATA[ ... ]]></footer></body>` in `site.xml`. |
| "Back to top" button | No option; hide it in `site.css` (see below). |

See [Configuration Options](configuration.html#configuration-options) for every option and its default: most of these are under [Layout & Navigation](configuration.html#layout-navigation) and [Footer & Links](configuration.html#footer-links), the color scheme picker is under [Theme & Branding](configuration.html#theme-branding), the source buttons are under [Source Repository](configuration.html#source-repository), and search is under [Code, Search, Diagrams & Math](configuration.html#code-search-diagrams-math).

For elements without an option, or to restyle one, use `site.css`:

```css
/* Hide the floating "Back to top" button. */
.supa-back-to-top {
  display: none;
}

/* Quieter announcement banner built from palette tokens. */
.supa-announcement {
  background-color: var(--color-background-secondary);
  color: var(--color-foreground-primary);
  border-bottom: 1px solid var(--color-background-border);
}

.supa-announcement a {
  color: var(--color-brand-content);
}
```

The announcement example reuses token pairs the skin already checks: the build verifies that `--color-foreground-primary` and `--color-brand-content` meet the scheme's contrast minimum on `--color-background-secondary` in every built-in scheme. Inventing new color pairs would bypass that check.

---

## Adjusting the Printed Page

When a reader prints a page or saves it as PDF, the skin's `@media print` styles print only the article. They leave out the sidebar, the "On this page" TOC, both drawers, the mobile header, the content header (breadcrumbs, source buttons, color-scheme and theme controls), the search box, the announcement banner, the skip link, the previous/next cards, the "Back to top" button, copy buttons, heading permalinks, and tooltips. The footer keeps only the copyright line, or your `<body><footer>`, so the printout still names who owns the text. The "Built with" credit, the "Last updated" date, and the footer icons are left out.

Other changes on paper:

- **Colors:** browsers print without backgrounds by default, so every page prints in the active color scheme's light polarity, even when the reader views it in dark mode, chosen in the theme menu or followed from the operating system in Auto mode. Text, links, code highlighting, admonitions, alerts, and tables print dark on white paper, and `<darkCssVariables>` overrides apply on screen only. Badges, buttons, chips, avatars, progress bars, and steppers keep their light-polarity fills, because their text or state is drawn on them. A Mermaid diagram rendered in dark mode prints inverted into light colors.
- **Layout:** the article spans the page, long code lines and table cells wrap instead of scrolling, and nothing stays fixed or sticky.
- **Links:** an external link in the article prints its URL in parentheses after the link text, unless the text already is the URL. Links to other pages of the site, in-page links, and links in code blocks or navigation print as text only.
- **Page breaks:** headings stay with the content that follows them, and the browser avoids breaking inside code blocks, admonitions, alerts, cards, diagrams, figures, and table rows.
- **Interactive content:** only the selected tab of a tab group prints, and closed accordions and `<details>` stay closed. Readers open what they want on paper before printing.

To change the printout, add your own `@media print` block to `site.css`. The skin hides furniture with `display: none !important`, so a rule that shows an element again needs `!important` too:

```css
/* src/site/resources/css/site.css */
@media print {
  /* Print the "Built with" line, which carries the "Last updated" date. */
  .supa-built-with {
    display: block !important;
  }

  /* Print link text only, without URLs. */
  .supa-article a::after {
    content: none !important;
  }

  /* Smaller text and wider margins on paper. */
  .supa-article {
    font-size: 11pt;
  }

  @page {
    margin: 2cm;
  }
}
```

Print your page in light and dark mode to check the result, or save it as PDF.

---

## Choosing Selectors That Survive Upgrades

**Supa Maven Skin** prefixes everything it owns with `supa` (`.supa-*` classes, `data-supa-*` attributes, `#supa*` IDs, and `--supa-*` properties). The prefix marks ownership; it is not a compatibility promise. The skin is still in its `0.x` series, so read the [changelog](https://github.com/mepcotterell/supa-maven-skin/blob/main/CHANGELOG.md) when you upgrade. The hooks named in the configuration docs, plus a few page landmarks, are the safest choices:

| Prefer | Examples |
| :--- | :--- |
| Theme state on `<html>` | `data-supa-palette`, `data-supa-resolved-theme` (`light` / `dark`), `data-supa-theme-mode` (`light` / `dark` / `auto`) |
| Page state on `<html>` | `data-supa-ready` (`true` once every enhancement, including the Mermaid and KaTeX loaders and the on-demand Bootstrap 6 widget scripts, has settled) |
| Documented tokens | `--color-*`, `--supa-admonition-*`, `--supa-sidebar-width`, `--supa-toc-width`, `--supa-content-max-width`, `--font-stack` |
| Page regions and IDs | `#supa-main-content` (main article and skip-link target), `#supaSidebarDrawer`, `#supaTocDrawer`, `.supa-sidebar-brand`, `.supa-footer`, `.supa-footer-icons`, `body.supa-sticky-content-header` |
| Authoring classes | `.supa-tabs`, `.supa-accordion`, `ol.supa-stepper`, `.not-prose` (see [Authoring Rich Content](authoring-guide.html)) |

Avoid these, because they are implementation details that can change in any release:

- **Bookkeeping attributes** the scripts add to avoid initializing an element twice, such as `data-supa-tabs-ready` or `data-supa-drawer-bound`.
- **Derived and build-generated properties**, such as Bootstrap 6's `--primary-*`, `--bg-*`, and `--fg-*` tokens, or `--lightningcss-*` properties in the compiled stylesheet.
- **Long descendant chains** through internal wrapper classes, such as `.supa-sidebar-container .supa-nav-list .supa-nav-item`. Target the element you need with the shortest selector that works.

---

## Caveats

- **Bootstrap 6 is an alpha.** **Supa Maven Skin** builds on Bootstrap 6 (`6.0.0-alpha.1`). Bootstrap's own class names and tokens may change before a stable release, which is one more reason to customize through the skin's `--color-*` tokens.
- **Your overrides are not contrast-checked.** At build time, `scripts/lint-scss.ts` checks only the skin's built-in color schemes: text and accent tokens on both background surfaces, the text, link, and icon colors on admonition title bars and bodies and on `.alert.theme-*` callouts, the sidebar, TOC, and search-result states, and Bootstrap 6 components with and without a theme, at rest, hovered, and toggled on, in both polarities, against WCAG 2.2 AA (4.5:1) for `furo` and `bootstrap` and AAA (7.0:1) for the four `modus*` schemes. Check your own colors against the same minimums in light and dark mode.
- **`--color-brand-primary` is also a background.** The announcement banner puts white text (light mode) or black text (dark mode) on `--color-brand-primary`, so check that pair whenever you change the brand color.
- **Changes in `target/site/` do not last.** `mvn site` regenerates that directory. Always edit files under `src/site/`.
