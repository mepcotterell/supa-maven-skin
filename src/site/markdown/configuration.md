# Configuration Reference

`supa-maven-skin` is configured inside the `<custom><supaSkin>...</supaSkin></custom>` element of your `src/site/site.xml` descriptor (legacy `<furoSkin>` is also supported). All settings are optional and have sensible defaults matching Sphinx Furo.

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
      <span class="supa-palette-swatch" style="background:#2fafff"></span>
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

    <!-- Interactive Enhancements -->
    <copyCodeButton>true</copyCodeButton>
    <syntaxHighlighting>true</syntaxHighlighting>
    <headingPermalinks>true</headingPermalinks>
    <headingPermalinkSymbol>#</headingPermalinkSymbol>
    <search>true</search>
    <mermaid>auto</mermaid>
    <katex>auto</katex>

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

| Option | Default | Description |
| :--- | :--- | :--- |
| `<defaultTheme>` | `auto` | Initial light/dark polarity before user selection (`auto`, `light`, or `dark`). |
| `<colorScheme>` | `furo` | Default accessible color scheme preset (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, or `modus-tritanopia`). |
| `<colorSchemeSelector>` | `true` | Render the accessible color scheme selector menu in the top header utility bar. |
| `<announcement>` | *(empty)* | Top announcement banner HTML rendered above the page header. |
| `<sidebarHideName>` | `false` | Hide the project name text under the logo in the left sidebar. |
| `<lightLogo>` | *(empty)* | Relative path or URL to logo shown when the resolved theme is light. |
| `<darkLogo>` | *(empty)* | Relative path or URL to logo shown when the resolved theme is dark. |
| `<sourceRepository>` | *(empty)* | GitHub/GitLab/Gitea repository URL for "View source" and "Edit this page" buttons. |
| `<sourceBranch>` | `main` | Git branch name used when constructing source view/edit URLs. |
| `<sourceDirectory>` | `src/site` | Relative path to the Maven site directory inside the repository. |
| `<sourceViewButton>` | `true` | Show the "View page source" icon button when `<sourceRepository>` is configured. |
| `<sourceEditButton>` | `true` | Show the "Edit this page" icon button when `<sourceRepository>` is configured. |
| `<breadcrumb>` | `true` | Render breadcrumb navigation trail in the top content utility bar. |
| `<tocSidebar>` | `true` | Enable the right-hand "On this page" table of contents column and right drawer (`#supaTocDrawer`). |
| `<tocTitle>` | `On this page` | Heading label for the right-hand table of contents. |
| `<tocMaxDepth>` | `4` | Maximum heading level (`2`–`6`) included in the right-hand TOC. |
| `<prevNextButtons>` | `true` | Render Furo-styled Previous / Next page navigation cards at the bottom of articles. |
| `<sidebarCollapseDepth>` | `1` | Menu nesting depth expanded by default in the left sidebar (`<details open>`). |
| `<drawerScroll>` | `false` | Default `data-bs-scroll` setting (`true` or `false`) for both `#supaSidebarDrawer` and `#supaTocDrawer` controlling whether `<body>` scrolling is enabled while a drawer is open. |
| `<drawerBackdrop>` | `true` | Default `data-bs-backdrop` setting (`true`, `false`, or `static`) for both `#supaSidebarDrawer` and `#supaTocDrawer` controlling whether a backdrop is rendered when a drawer is open. |
| `<sidebarDrawerScroll>` | `$drawerScroll` | Override `data-bs-scroll` (`true` or `false`) specifically for the left navigation drawer (`#supaSidebarDrawer`). |
| `<sidebarDrawerBackdrop>` | `$drawerBackdrop` | Override `data-bs-backdrop` (`true`, `false`, or `static`) specifically for the left navigation drawer (`#supaSidebarDrawer`). |
| `<tocDrawerScroll>` | `$drawerScroll` | Override `data-bs-scroll` (`true` or `false`) specifically for the right table of contents drawer (`#supaTocDrawer`). |
| `<tocDrawerBackdrop>` | `$drawerBackdrop` | Override `data-bs-backdrop` (`true`, `false`, or `static`) specifically for the right table of contents drawer (`#supaTocDrawer`). |
| `<footerTimestamp>` | `true` | Display the build/publish date in the page footer. |
| `<footerVersion>` | `true` | Display the project version badge next to the project title in the sidebar. |
| `<copyCodeButton>` | `true` | Add a Copy-to-Clipboard button to all `<pre>` code blocks. |
| `<syntaxHighlighting>` | `true` | Highlight `<pre><code>` blocks offline using bundled `highlight.js`. |
| `<headingPermalinks>` | `true` | Append `#` permalink anchors to article headings (`h2`–`h6`). |
| `<headingPermalinkSymbol>` | `#` | Symbol rendered inside heading permalink anchors. |
| `<search>` | `true` | Enable the sidebar search box and `/` (`⌘K` / `Ctrl+K`) search dialog. |
| `<mermaid>` | `auto` | Lazy-load Mermaid when `.mermaid` or `code.language-mermaid` is present (`auto`, `true`, `false`). |
| `<katex>` | `auto` | Lazy-load KaTeX when math expressions are present (`auto`, `true`, `false`). |

## Built-In Accessible Color Schemes

Every built-in color scheme is verified at build time by `scripts/lint-scss.mjs` against **WCAG 2.2** relative luminance and contrast rules across both Light and Dark polarities and against both primary (`--color-background-primary`) and secondary (`--color-background-secondary`) surfaces:

| Scheme ID | Inspiration | Contrast | Notes |
| :--- | :--- | :--- | :--- |
| `furo` | Sphinx Furo | **WCAG 2.2 AA**<br>&ge; 4.5:1 text / 3.0:1 UI | Default crisp documentation palette; automatically escalates to `modus` when `prefers-contrast: more` is active. |
| `bootstrap` | Bootstrap 6 OKLCH | **WCAG 2.2 AA**<br>&ge; 4.5:1 text / 3.0:1 UI | Native Bootstrap 6 perceptually uniform OKLCH colors inside Furo's 3-column layout. |
| `modus` | Emacs Modus | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Protesilaos Stavrou's strict AAA high-contrast themes (21:1 primary text, &ge; 7:1 muted text and semantic accents). |
| `modus-tinted` | Emacs Modus Tinted | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Warm cream paper (`#fbf7f0`) in Light mode and deep night-sky (`#0d0e1c`) in Dark mode to prevent halation/glare. |
| `modus-deuteranopia` | Emacs Modus<br>Deuteranopia | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Red-green colorblind-safe semantic palette using royal/sky blue, gold, and warm burnt amber. |
| `modus-tritanopia` | Emacs Modus<br>Tritanopia | **WCAG 2.2 AAA**<br>&ge; 7.0:1 text / 4.5:1 UI | Blue-yellow colorblind-safe semantic palette using deep teal/aqua, plum/magenta, and crimson. |

## Extending Palettes via `<lightCssVariables>` & `<darkCssVariables>`

Just like Sphinx Furo's `light_css_variables` and `dark_css_variables`, any child element inside `<lightCssVariables>` or `<darkCssVariables>` is emitted as `--<tag-name>: <value>;` and automatically feeds into Bootstrap 6's component tokens (`--primary-*`, `--success-*`, `--warning-*`, `--danger-*`, `--info-*`, `--accent-*`) via `color-mix(in oklch, ...)`:

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
| `supa-admonition-note-accent` | Note / Info admonition and `.theme-info` accent color. |
| `supa-admonition-tip-accent` | Tip / Success admonition and `.theme-success` accent color. |
| `supa-admonition-important-accent` | Important / Accent admonition and `.theme-accent` accent color. |
| `supa-admonition-warning-accent` | Warning admonition and `.theme-warning` accent color. |
| `supa-admonition-caution-accent` | Caution / Danger admonition and `.theme-danger` accent color. |

## Velocity Helper Macros Reference (`site-macros.vm`)

When authoring Velocity-preprocessed pages (`.md.vm`, `.apt.vm`, `.xhtml.vm`), include `#parse( "META-INF/maven/site-macros.vm" )` to use the following helper macros:

| Macro Signature | Parameters | Description |
| :--- | :--- | :--- |
| `#bi( $name $extraClasses $ariaLabel )` | `$name`: Icon slug (`"rocket-takeoff"`)<br>`$extraClasses`: Optional utilities (`"text-primary fs-5"`)<br>`$ariaLabel`: Optional accessible label | Renders `<i class="bi bi-$name ..."></i>` with `aria-hidden="true"` when `$ariaLabel` is omitted, or `role="img" aria-label="..."` when `$ariaLabel` is provided. |
| `#bsAlert( $theme $title $body $dismissible )` | `$theme`: Semantic theme (`"primary"`, `"success"`, etc.)<br>`$title`: Optional heading string<br>`$body`: Alert HTML/text body<br>`$dismissible`: `true` or `false` | Renders an isolated `.alert.theme-$theme.not-prose` banner with an optional `.btn-close` dismiss button. |
| `#bsBadge( $theme $variant $text )` | `$theme`: Semantic theme (`"primary"`, `"info"`, etc.)<br>`$variant`: `""` (solid), `"subtle"`, or `"outline"`<br>`$text`: Badge label text | Renders an inline `<span class="badge ... theme-$theme not-prose">`. |
| `#bsCard( $title $subtitle $body $footer )` | `$title`: Card heading<br>`$subtitle`: Optional subtitle<br>`$body`: Card body HTML/text<br>`$footer`: Optional card footer HTML/text | Renders a Bootstrap 6 `.card.not-prose` container. |
