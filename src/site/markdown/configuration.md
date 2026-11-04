# Configuration Reference

**Supa Maven Skin** is configured inside the `<custom><supaSkin>...</supaSkin></custom>` element of your `src/site/site.xml` descriptor (legacy `<furoSkin>` is also supported). All settings are optional and have sensible defaults matching Sphinx Furo.

> [!TIP] Accessible Color Schemes & Custom Brand Colors
> Choose from 6 built-in **WCAG 2.2 AA & AAA** accessible color schemes via `<colorScheme>`, and layer custom brand tokens on top of any scheme using `<lightCssVariables>` and `<darkCssVariables>`.

## Interactive Accessible Color Scheme Preview

Click any color scheme card below (or use the palette selector in the top header bar) to live-preview this documentation site across all 6 built-in palettes and Light/Dark/Auto polarities:

<div class="supa-palette-grid not-prose" role="group" aria-label="Accessible color scheme presets">
  <button type="button" class="supa-palette-card is-active" data-supa-palette-card="furo" aria-pressed="true">
    <div class="supa-palette-card-header">
      <span class="supa-palette-card-title">Furo Default</span>
      <span class="badge theme-primary">WCAG AA</span>
    </div>
    <div class="supa-palette-card-desc">Sphinx Furo crisp documentation palette (&ge; 4.5:1 across all surfaces).</div>
    <div class="supa-palette-swatches" aria-hidden="true">
      <span class="supa-palette-swatch" style="background:#ffffff"></span>
      <span class="supa-palette-swatch" style="background:#131416"></span>
      <span class="supa-palette-swatch" style="background:#1d50d8"></span>
      <span class="supa-palette-swatch" style="background:#116329"></span>
      <span class="supa-palette-swatch" style="background:#6e40c9"></span>
    </div>
  </button>

  <button type="button" class="supa-palette-card" data-supa-palette-card="bootstrap" aria-pressed="false">
    <div class="supa-palette-card-header">
      <span class="supa-palette-card-title">Bootstrap 6 OKLCH</span>
      <span class="badge theme-primary">WCAG AA</span>
    </div>
    <div class="supa-palette-card-desc">Perceptually uniform Bootstrap 6 OKLCH semantic palette (&ge; 4.5:1).</div>
    <div class="supa-palette-swatches" aria-hidden="true">
      <span class="supa-palette-swatch" style="background:#f8f9fa"></span>
      <span class="supa-palette-swatch" style="background:#0f1115"></span>
      <span class="supa-palette-swatch" style="background:#0a53be"></span>
      <span class="supa-palette-swatch" style="background:#0f5132"></span>
      <span class="supa-palette-swatch" style="background:#842029"></span>
    </div>
  </button>

  <button type="button" class="supa-palette-card" data-supa-palette-card="modus" aria-pressed="false">
    <div class="supa-palette-card-header">
      <span class="supa-palette-card-title">Modus (Operandi / Vivendi)</span>
      <span class="badge theme-success">WCAG AAA</span>
    </div>
    <div class="supa-palette-card-desc">Protesilaos Stavrou's Emacs Modus high-contrast themes (&ge; 7.0:1).</div>
    <div class="supa-palette-swatches" aria-hidden="true">
      <span class="supa-palette-swatch" style="background:#ffffff"></span>
      <span class="supa-palette-swatch" style="background:#000000"></span>
      <span class="supa-palette-swatch" style="background:#0031a9"></span>
      <span class="supa-palette-swatch" style="background:#00bcff"></span>
      <span class="supa-palette-swatch" style="background:#531ab6"></span>
    </div>
  </button>

  <button type="button" class="supa-palette-card" data-supa-palette-card="modus-tinted" aria-pressed="false">
    <div class="supa-palette-card-header">
      <span class="supa-palette-card-title">Modus Tinted</span>
      <span class="badge theme-success">WCAG AAA</span>
    </div>
    <div class="supa-palette-card-desc">Low-glare warm cream paper &amp; night-sky canvas (&ge; 7.0:1 AAA).</div>
    <div class="supa-palette-swatches" aria-hidden="true">
      <span class="supa-palette-swatch" style="background:#fbf7f0"></span>
      <span class="supa-palette-swatch" style="background:#0d0e1c"></span>
      <span class="supa-palette-swatch" style="background:#0031a9"></span>
      <span class="supa-palette-swatch" style="background:#4cbdff"></span>
      <span class="supa-palette-swatch" style="background:#8f0000"></span>
    </div>
  </button>

  <button type="button" class="supa-palette-card" data-supa-palette-card="modus-deuteranopia" aria-pressed="false">
    <div class="supa-palette-card-header">
      <span class="supa-palette-card-title">Modus Deuteranopia</span>
      <span class="badge theme-success">WCAG AAA</span>
    </div>
    <div class="supa-palette-card-desc">Red-green colorblind-safe Blue / Gold / Warm Amber palette (&ge; 7.0:1).</div>
    <div class="supa-palette-swatches" aria-hidden="true">
      <span class="supa-palette-swatch" style="background:#ffffff"></span>
      <span class="supa-palette-swatch" style="background:#000000"></span>
      <span class="supa-palette-swatch" style="background:#0031a9"></span>
      <span class="supa-palette-swatch" style="background:#604800"></span>
      <span class="supa-palette-swatch" style="background:#6e3b00"></span>
    </div>
  </button>

  <button type="button" class="supa-palette-card" data-supa-palette-card="modus-tritanopia" aria-pressed="false">
    <div class="supa-palette-card-header">
      <span class="supa-palette-card-title">Modus Tritanopia</span>
      <span class="badge theme-success">WCAG AAA</span>
    </div>
    <div class="supa-palette-card-desc">Blue-yellow colorblind-safe Teal / Magenta / Crimson palette (&ge; 7.0:1).</div>
    <div class="supa-palette-swatches" aria-hidden="true">
      <span class="supa-palette-swatch" style="background:#ffffff"></span>
      <span class="supa-palette-swatch" style="background:#000000"></span>
      <span class="supa-palette-swatch" style="background:#005454"></span>
      <span class="supa-palette-swatch" style="background:#721045"></span>
      <span class="supa-palette-swatch" style="background:#970000"></span>
    </div>
  </button>
</div>

## Full `site.xml` Example

```xml
<custom>
  <supaSkin>
    <!-- Theme Polarity & Accessible Color Scheme -->
    <defaultTheme>auto</defaultTheme>
    <colorScheme>furo</colorScheme>
    <colorSchemeSelector>true</colorSchemeSelector>
    <sidebarHideName>false</sidebarHideName>
    <sidebarBrandAlign>center</sidebarBrandAlign>
    <lightLogo>images/logo-light.svg</lightLogo>
    <darkLogo>images/logo-dark.svg</darkLogo>
    <announcement>Version 1.0 is now available!</announcement>

    <!-- Source Repository Links -->
    <sourceRepository>https://github.com/mepcotterell/supa-maven-skin</sourceRepository>
    <sourceBranch>main</sourceBranch>
    <sourceDirectory>src/site</sourceDirectory>
    <sourceViewButton>true</sourceViewButton>
    <sourceEditButton>true</sourceEditButton>

    <!-- Layout, Drawers & Navigation -->
    <breadcrumb>true</breadcrumb>
    <stickyContentHeader>false</stickyContentHeader>
    <tocSidebar>true</tocSidebar>
    <tocTitle>On this page</tocTitle>
    <tocMaxDepth>4</tocMaxDepth>
    <prevNextButtons>true</prevNextButtons>
    <sidebarCollapseDepth>1</sidebarCollapseDepth>
    <drawerScroll>false</drawerScroll>
    <drawerBackdrop>true</drawerBackdrop>
    <sidebarDrawerScroll>false</sidebarDrawerScroll>
    <sidebarDrawerBackdrop>true</sidebarDrawerBackdrop>
    <tocDrawerScroll>false</tocDrawerScroll>
    <tocDrawerBackdrop>true</tocDrawerBackdrop>
    <footerTimestamp>true</footerTimestamp>
    <footerVersion>true</footerVersion>

    <!-- Footer Icon Links -->
    <navIcons>
      <icon>
        <href>https://github.com/mepcotterell/supa-maven-skin</href>
        <title>GitHub Repository</title>
        <html><![CDATA[<i class="bi bi-github" aria-hidden="true"></i>]]></html>
      </icon>
    </navIcons>

    <!-- Interactive Enhancements -->
    <copyCodeButton>true</copyCodeButton>
    <syntaxHighlighting>true</syntaxHighlighting>
    <headingPermalinks>true</headingPermalinks>
    <headingPermalinkSymbol>#</headingPermalinkSymbol>
    <search>true</search>
    <mermaid>auto</mermaid>
    <katex>auto</katex>
    <!-- Leave <mermaidCdnUrl>, <katexCssCdnUrl>, and <katexJsCdnUrl> unset to use the
         pinned, SRI-verified jsDelivr defaults (see "Self-Hosting Mermaid & KaTeX"
         in the Authoring Guide). -->

    <!-- Custom Light/Dark CSS Tokens (layered on top of <colorScheme>) -->
    <lightCssVariables>
      <color-brand-primary>#1d50d8</color-brand-primary>
      <color-brand-content>#1d50d8</color-brand-content>
    </lightCssVariables>
    <darkCssVariables>
      <color-brand-primary>#589bf7</color-brand-primary>
      <color-brand-content>#6ba6ff</color-brand-content>
    </darkCssVariables>
  </supaSkin>
</custom>
```

## Configuration Options

All `<supaSkin>` options are grouped below by functional area.

### Theme & Branding

Controls the initial Light/Dark polarity, accessible color scheme preset, and left-sidebar brand header (`.supa-sidebar-brand`).

| Option | Default | Description |
| :--- | :--- | :--- |
| `<defaultTheme>` | `auto` | Initial light/dark polarity before user selection (`auto`, `light`, or `dark`). |
| `<colorScheme>` | `furo` | Default accessible color scheme preset (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, or `modus-tritanopia`). |
| `<colorSchemeSelector>` | `true` | Render the accessible color scheme selector: a menu in the content header utility bar (`lg+`) and the mobile header (`768px`&ndash;`1023px`), and a native `<select>` in the sidebar drawer's Appearance footer (below `lg`). |
| `<sidebarBrandAlign>` | `center` | Horizontal alignment of the sidebar brand logo, project title, and version badge (`center`, `left` / `start`, or `right` / `end`). |
| `<sidebarHideName>` | `false` | Hide the project name text under the logo in the left sidebar. |
| `<lightLogo>` | *(empty)* | Relative path or URL to the logo shown when the resolved theme is light. |
| `<darkLogo>` | *(empty)* | Relative path or URL to the logo shown when the resolved theme is dark. |

### Source Repository

Configures the "View page source" and "Edit this page" action buttons in the top content header bar.

| Option | Default | Description |
| :--- | :--- | :--- |
| `<sourceRepository>` | *(empty)* | GitHub, GitLab, or Gitea repository URL used to build page source links. |
| `<sourceBranch>` | `main` | Git branch name used when constructing source view and edit URLs. |
| `<sourceDirectory>` | `src/site` | Relative path to the Maven site directory inside the repository. |
| `<sourceViewButton>` | `true` | Show the "View page source" icon button when `<sourceRepository>` is configured. |
| `<sourceEditButton>` | `true` | Show the "Edit this page" icon button when `<sourceRepository>` is configured. |

### Layout & Navigation

Configures the top announcement banner, breadcrumbs, left sidebar menu tree, right-hand ScrollSpy table of contents, and bottom page navigation cards.

| Option | Default | Description |
| :--- | :--- | :--- |
| `<announcement>` | *(empty)* | Top announcement banner HTML rendered above the page header. |
| `<breadcrumb>` | `true` | Render the breadcrumb navigation trail in the top content utility bar. |
| `<stickyContentHeader>` | `false` | Pin the top content utility bar (breadcrumbs, source links, palette picker, theme toggle) to the top of the viewport on `lg+` (`1024px`) screens. Adds `.supa-sticky-content-header` to `<body>`; heading anchors and ScrollSpy offset by `--supa-content-header-height`. Below `lg`, the mobile header is already sticky. |
| `<sidebarCollapseDepth>` | `1` | Menu nesting depth expanded by default in the left sidebar (`<details open>`). |
| `<tocSidebar>` | `true` | Enable the right-hand "On this page" table of contents column and right drawer (`#supaTocDrawer`). |
| `<tocTitle>` | `On this page` | Heading label for the right-hand table of contents. |
| `<tocMaxDepth>` | `4` | Maximum heading level (`2`–`6`) included in the right-hand TOC. |
| `<prevNextButtons>` | `true` | Render Furo-styled Previous / Next page navigation cards at the bottom of articles. |

### Responsive Drawers

Controls Bootstrap 6 off-canvas `<dialog class="drawer">` behavior on tablet and mobile viewports (`#supaSidebarDrawer` below `lg` and `#supaTocDrawer` below `xl`).

| Option | Default | Description |
| :--- | :--- | :--- |
| `<drawerScroll>` | `false` | Default `data-bs-scroll` (`true` or `false`) for both drawers, controlling whether `<body>` scrolling is enabled while a drawer is open (legacy alias: `<drawerBodyScroll>`). |
| `<drawerBackdrop>` | `true` | Default `data-bs-backdrop` (`true`, `false`, or `static`) for both drawers, controlling whether a backdrop is rendered while a drawer is open. |
| `<sidebarDrawerScroll>` | `$drawerScroll` | Override `data-bs-scroll` (`true` or `false`) specifically for the left navigation drawer (`#supaSidebarDrawer`; legacy alias: `<sidebarDrawerBodyScroll>`). |
| `<sidebarDrawerBackdrop>` | `$drawerBackdrop` | Override `data-bs-backdrop` (`true`, `false`, or `static`) specifically for the left navigation drawer (`#supaSidebarDrawer`). |
| `<tocDrawerScroll>` | `$drawerScroll` | Override `data-bs-scroll` (`true` or `false`) specifically for the right table of contents drawer (`#supaTocDrawer`; legacy alias: `<tocDrawerBodyScroll>`). |
| `<tocDrawerBackdrop>` | `$drawerBackdrop` | Override `data-bs-backdrop` (`true`, `false`, or `static`) specifically for the right table of contents drawer (`#supaTocDrawer`). |

### Footer & Links

Controls metadata and icon links in the page footer (`.supa-footer`) and version badge visibility.

| Option | Default | Description |
| :--- | :--- | :--- |
| `<footerTimestamp>` | `true` | Display the build/publish date (`Last updated on YYYY-MM-DD`) in the page footer. |
| `<footerVersion>` | `true` | Display the project version badge next to the project title in the sidebar. |
| `<navIcons>` | *(empty)* | List of `<icon>` elements (`<href>`, `<title>`, `<html>`) rendered as tooltip-enabled icon links on the right side of the page footer (`.supa-footer-icons`). Write a relative `<href>` from the site root (`faq.html`); the skin rewrites it for pages in subdirectories. URLs with a scheme and paths starting with `/` are used unchanged. |

### Code, Search, Diagrams & Math

Configures client-side code block enhancements, heading permalinks, offline search, and lazy-loaded Mermaid / KaTeX rendering.

| Option | Default | Description |
| :--- | :--- | :--- |
| `<copyCodeButton>` | `true` | Add a Copy-to-Clipboard button to all `<pre>` code blocks. |
| `<syntaxHighlighting>` | `true` | Highlight `<pre><code>` blocks offline using bundled `highlight.js`. |
| `<headingPermalinks>` | `true` | Append `#` permalink anchors to article headings (`h2`–`h6`). |
| `<headingPermalinkSymbol>` | `#` | Symbol rendered inside heading permalink anchors. |
| `<search>` | `true` | Enable the sidebar search box and `/` (`⌘K` / `Ctrl+K`) search dialog. |
| `<mermaid>` | `auto` | Lazy-load Mermaid when `.mermaid` or `code.language-mermaid` is present (`auto`, `true`, or `false`). |
| `<mermaidCdnUrl>` | *(pinned jsDelivr + SRI)* | Custom or self-hosted Mermaid URL. Unset, the skin loads `https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js` via `<script integrity crossorigin="anonymous">`. An ES module URL (ending in `.mjs` or `/+esm`, or on `esm.sh`) loads with `import()`; any other URL loads as a classic `<script>` that should define `window.mermaid` (see the note below for ES modules with other names). |
| `<katex>` | `auto` | Lazy-load KaTeX when `$...$` or `$$...$$` math expressions are present (`auto`, `true`, or `false`). |
| `<katexCssCdnUrl>` | *(pinned jsDelivr + SRI)* | Custom or self-hosted KaTeX stylesheet URL. Unset, the skin loads `https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css` with `integrity` and `crossorigin="anonymous"`. |
| `<katexJsCdnUrl>` | *(pinned jsDelivr + SRI)* | Custom or self-hosted KaTeX auto-render URL. Unset, the skin loads `katex.min.js` then `contrib/auto-render.min.js` from `https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/`, each with `integrity`. An ES module URL (such as `auto-render.mjs`) loads with `import()`; a classic `auto-render(.min).js` URL loads `../katex.min.js` from its parent directory first (unless `window.katex` is already the KaTeX API). |

Integrity hashes apply only to the built-in defaults (or to an override that repeats a default URL exactly). Custom URLs load without `integrity` or `crossorigin`, so keeping them trustworthy is the consumer site's responsibility.

If a custom URL is an ES module under another name (for example a self-hosted `mermaid.esm.js`), the skin first runs it as a classic `<script>`, sees that no `window.mermaid` or `window.renderMathInElement` appeared, and then loads it again with `import()`. Rendering still works, but the browser logs a `SyntaxError` from the first attempt; rename the file to `.mjs` to load it as a module directly. The built-in defaults never take this fallback, so they only ever run with SRI.

Once the Mermaid and KaTeX loaders have settled, whether or not they succeeded, the skin sets `data-supa-ready="true"` on `<html>`. Scripts that post-process diagrams or math can wait for it; see [Running Scripts After the Skin Initializes](customizing.html#running-scripts-after-the-skin-initializes).

### Self-Hosted URLs

To serve Mermaid and KaTeX from your own site, follow [Self-Hosting Mermaid & KaTeX](authoring-guide.html#self-hosting-mermaid-katex) in the Authoring Guide. Give every override a **root-relative** path (such as `/my-project/vendor/mermaid/mermaid.min.js`) or an absolute `https://` URL. Classic `<script src>` and `<link href>` URLs resolve against the current page, and `.mjs` URLs loaded with `import()` resolve against `js/supa-maven-skin.min.js`, so a document-relative value such as `vendor/mermaid/mermaid.min.js` breaks on pages in subdirectories. A self-hosted classic `contrib/auto-render.min.js` also loads `../katex.min.js`, so keep KaTeX's `dist/` layout.

### Content Security Policy

With the default URLs, allow `https://cdn.jsdelivr.net` in `script-src` (Mermaid and KaTeX), `style-src` (`katex.min.css`), and `font-src` (KaTeX fonts, which `katex.min.css` loads relative to itself; fonts are not executable and are not covered by SRI). None of the pinned files fetch further code at runtime, so `connect-src` needs nothing extra. Self-hosting removes the jsDelivr origin entirely. Mermaid's rendered SVGs carry inline `<style>` and `style` attributes, so a `style-src` without `'unsafe-inline'` will leave diagrams unstyled.

## Built-In Accessible Color Schemes

Every built-in color scheme is verified at build time by `scripts/lint-scss.ts` against **WCAG 2.2** relative luminance and contrast rules across both Light and Dark polarities: text and accent tokens on the primary (`--color-background-primary`) and secondary (`--color-background-secondary`) surfaces, the text, link, and icon colors on admonition title bars and bodies and on `.alert.theme-*` callouts, the sidebar, TOC, and search-result states, and the solid, subtle, and outline fills of every Bootstrap 6 theme (see [Architecture](architecture.html) for the full list):

| Scheme ID | Inspiration | Contrast | Notes |
| :--- | :--- | :--- | :--- |
| `furo` | Sphinx Furo | **WCAG 2.2 AA**<br>&ge; 4.5:1 text / 3.0:1 UI | Default crisp documentation palette; automatically escalates to `modus` when `prefers-contrast: more` is active. |
| `bootstrap` | Bootstrap 6 OKLCH | **WCAG 2.2 AA**<br>&ge; 4.5:1 text / 3.0:1 UI | Native Bootstrap 6 perceptually uniform OKLCH colors inside Furo's 3-column layout. |
| `modus` | Emacs Modus | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Protesilaos Stavrou's strict AAA high-contrast themes (21:1 primary text, &ge; 7:1 muted text and semantic accents). |
| `modus-tinted` | Emacs Modus Tinted | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Warm cream paper (`#fbf7f0`) in Light mode and deep night-sky (`#0d0e1c`) in Dark mode to prevent halation/glare. |
| `modus-deuteranopia` | Emacs Modus<br>Deuteranopia | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Red-green colorblind-safe semantic palette using royal/sky blue, gold, and warm burnt amber. |
| `modus-tritanopia` | Emacs Modus<br>Tritanopia | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Blue-yellow colorblind-safe semantic palette using deep teal/aqua, plum/magenta, and crimson. |

## Extending Palettes via `<lightCssVariables>` & `<darkCssVariables>`

Just like Sphinx Furo's `light_css_variables` and `dark_css_variables`, any child element inside `<lightCssVariables>` or `<darkCssVariables>` is emitted as `--<tag-name>: <value>;` and automatically feeds into Bootstrap 6's component tokens (`--primary-*`, `--success-*`, `--warning-*`, `--danger-*`, `--info-*`, `--accent-*`) via `color-mix(in oklch, ...)`. In the four `modus*` schemes, `.theme-secondary` text and subtle surfaces (secondary alerts, outline buttons, and subtle badges) also follow `color-foreground-muted` on `color-background-secondary`, and dark solid secondary fills (buttons, badges, avatars) use Modus Vivendi's `#505050` mode-line gray (`#484d67` in `modus-tinted`) under white, because Bootstrap's own grays fall short of 7:1. For the same reason, light `.theme-inverse` subtle surfaces in `modus-tritanopia` use `color-background-item`, and the `modus*` schemes override the `supa-nav-*` tokens below: hovered sidebar links keep `color-foreground-primary`, and the current page's brand tint is mixed into `color-background-primary` instead of laid over the sidebar:

| Variable Name | Purpose |
| :--- | :--- |
| `color-brand-primary` | Primary brand accent color (active sidebar links, active TOC border, focus rings, `.btn-primary`). |
| `color-brand-content` | Content hyperlink color inside `.prose` articles. |
| `color-background-primary` | Main article and page background surface (`--bg-body`). |
| `color-background-secondary` | Left sidebar, code block header, and card secondary surface (`--bg-1`). |
| `color-background-hover` | Hover state surface for navigation items and icon buttons (`--bg-2`). |
| `color-background-border` | Subtle hairline border color across sidebars, tables, and headers (`--border-color`). |
| `color-foreground-primary` | Primary body text and heading color (`--fg-body`). |
| `color-foreground-secondary` | Secondary metadata, caption, and inactive TOC link color (`--fg-2`). |
| `color-foreground-muted` | Muted text, permalink `#` indicators, and subtle labels (`--fg-3`). |
| `color-foreground-border` | Interactive control border color (WCAG 1.4.11 non-text contrast &ge; 3:1). |
| `supa-admonition-note-accent` | `note` and `seealso` admonition and `.theme-info` accent color. |
| `supa-admonition-tip-accent` | `tip` and `hint` admonition and `.theme-success` accent color. |
| `supa-admonition-important-accent` | `important` and `admonition` callout and `.theme-accent` accent color. |
| `supa-admonition-warning-accent` | `warning` and `caution` admonition and `.theme-warning` accent color. |
| `supa-admonition-caution-accent` | `danger`, `attention`, and `error` admonition and `.theme-danger` accent color. |
| `supa-admonition-todo-accent` | `todo` admonition neutral accent color. |
| `supa-nav-hover-fg` | Text color of a hovered sidebar link and of the active search result's title, on `color-background-hover` (default `var(--color-brand-primary)`). |
| `supa-nav-active-fg` | Text color of the current page's sidebar link (default `var(--color-brand-primary)`). |
| `supa-nav-active-bg` | Background of the current page's sidebar link (default `color-mix(in srgb, var(--color-brand-primary) 12%, transparent)`, laid over the sidebar). |
| `supa-sidebar-brand-items-align` | Flex cross-axis alignment (`center`, `flex-start`, or `flex-end`) for `.supa-sidebar-brand` children. |
| `supa-sidebar-brand-justify` | Flex main-axis alignment (`center`, `flex-start`, or `flex-end`) for `.supa-sidebar-brand-text` title and version badge. |
| `supa-sidebar-brand-text-align` | Text alignment (`center`, `left`, or `right`) inside `.supa-sidebar-brand`. |

## Velocity Helper Macros Reference (`site-macros.vm`)

When authoring Velocity-preprocessed pages (`.md.vm`, `.apt.vm`, `.xhtml.vm`), **Supa Maven Skin** globally registers the following helper macros from `META-INF/maven/site-macros.vm`:

| Macro Signature | Parameters | Description |
| :--- | :--- | :--- |
| `#bi( $name $extraClasses $ariaLabel )` | `$name`: Icon slug (`"rocket-takeoff"`)<br>`$extraClasses`: Optional utilities (`"text-primary fs-5"`)<br>`$ariaLabel`: Optional accessible label | Renders `<i class="bi bi-$name ..."></i>` with `aria-hidden="true"` when `$ariaLabel` is omitted, or `role="img" aria-label="..."` when `$ariaLabel` is provided. |
| `#bsAlert( $theme $title $body $dismissible )` | `$theme`: Semantic theme (`"primary"`, `"success"`, etc.)<br>`$title`: Optional heading string<br>`$body`: Alert HTML/text body<br>`$dismissible`: `true` or `false` | Renders an isolated `.alert.theme-$theme.not-prose` banner with an optional `.btn-close` dismiss button. |
| `#bsBadge( $theme $variant $text )` | `$theme`: Semantic theme (`"primary"`, `"info"`, etc.)<br>`$variant`: `""` (solid), `"subtle"`, or `"outline"`<br>`$text`: Badge label text | Renders an inline `<span class="badge ... theme-$theme not-prose">`. |
| `#bsCard( $title $subtitle $body $footer )` | `$title`: Card heading<br>`$subtitle`: Optional subtitle<br>`$body`: Card body HTML/text<br>`$footer`: Optional card footer HTML/text | Renders a Bootstrap 6 `.card.not-prose` container. |
| `#bsCardGridStart( $extraClasses )` | `$extraClasses`: Optional grid utility classes (`""`) | Opens a `<div class="row g-3 not-prose my-3 ...">` card grid container without trailing blank lines so Doxia's CommonMark parser keeps the HTML block contiguous. |
| `#bsCardGridEnd()` | *(none)* | Closes the `</div>` opened by `#bsCardGridStart`. |
| `#bsGuideCard( $colClass $icon $theme $href $title $badge $description )` | `$colClass`: Column classes (`"col-12 md:col-6"` default)<br>`$icon`: Bootstrap Icon slug (`"rocket-takeoff"`)<br>`$theme`: Semantic theme (`"primary"`, `"success"`, `"info"`, `"warning"`)<br>`$href`: Link target (`"getting-started.html"`)<br>`$title`: Card link title<br>`$badge`: Optional right-aligned subtle badge label<br>`$description`: Card description HTML/text | Renders a responsive navigation/guide card column inside a `#bsCardGridStart` / `#bsCardGridEnd` block. |
