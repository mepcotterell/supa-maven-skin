# Supa Maven Skin

A modern, responsive, accessible three-column [Apache Maven Site Skin](https://maven.apache.org/plugins/maven-site-plugin/examples/creatingskins.html) inspired by [Sphinx Furo](https://github.com/pradyunsg/furo), built with **Bootstrap 6 (`6.0.0-alpha.1`)**, **Bootstrap Icons**, **Vite**, **Dart Sass (SCSS)**, **TypeScript**, and **`frontend-maven-plugin`**.

## Key Features

- **Canonical 3-Column Furo Layout**:
  - **Left Navigation Sidebar (`256px` sticky on `lg+` / `1024px+`)**: Brand/logo header, version pill badge, search modal trigger (`/` or `⌘K`), and collapsible `<details>`/`<summary>` navigation tree. Collapses into a native `<dialog class="lg:drawer drawer-start drawer-sheet">` off-canvas drawer below `1024px`.
  - **Center Prose Content (`56rem` / `896px` max measure)**: Uses Bootstrap 6 `.prose` typography with refined vertical rhythm, breadcrumb header bar, View/Edit Source action icons, Previous/Next navigation cards, and customizable footer.
  - **Right "On this page" TOC (`224px` sticky on `xl+` / `1280px+`)**: Auto-generated heading outline (`h2`–`h4`) with single-active ScrollSpy tracking. Collapses into a `<dialog class="xl:drawer drawer-end drawer-sheet">` drawer below `1280px`.
- **3-State Adaptive Theme Toggle (`Light` → `Dark` → `Auto`) & 6 Accessible Palettes**:
  - Zero-FOUC inline `<head>` bootstrapper, `localStorage` persistence (`supa-theme`, `supa-palette`), CSS `light-dark()` semantic tokens, and 6 built-in WCAG 2.2 AA/AAA palettes (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, `modus-tritanopia`).
- **Rich Authoring Components**:
  - **All 12 Sphinx Furo Admonition Types**: Automatically transforms blockquote alerts (`> [!ADMONITION]`, `> [!ATTENTION]`, `> [!CAUTION]`, `> [!DANGER]`, `> [!ERROR]`, `> [!HINT]`, `> [!IMPORTANT]`, `> [!NOTE]`, `> [!SEEALSO]` / `> [!SEE-ALSO]`, `> [!TIP]`, `> [!TODO]`, `> [!WARNING]`) into accessible `.supa-admonition` callouts with Bootstrap Icons and support for custom titles and nested admonitions.
  - **Bootstrap Icons (Shortcodes, HTML & `#bi` Velocity Macro)**: Embeds 2,000+ bundled `bootstrap-icons.woff2` glyphs offline via `:bi-rocket-takeoff:` shortcodes, `#bi( "rocket-takeoff" )` in `.md.vm` pages, or `<i class="bi bi-rocket-takeoff"></i>`.
  - **Synchronized Content Tabs**: `<div class="supa-tabs" data-tab-group="...">` panels (`<div data-tab="Label">`) synchronize active tab selections across the entire site via `localStorage['supa-tab-sync']`.
  - **Code Blocks**: Bundled `highlight.js` syntax highlighting, language badge pill, optional title header (`data-title`), optional line numbers (`data-line-numbers`), and one-click Copy to Clipboard button.
  - **Client-Side Search Modal**: Native `<dialog class="dialog">` search modal (`/` or `⌘K`) with `<mark>` query highlighting, keyboard navigation, and section deep-linking.
  - **Opt-In Integrations**: Lazy-loaded Mermaid (`<mermaid>auto</mermaid>`) and KaTeX (`<katex>auto</katex>`) when diagrams or math expressions are detected on a page.

## Documentation (`src/site/`)

The full documentation is organized following the [Diátaxis](https://diataxis.fr/) framework in [`src/site/markdown/`](src/site/markdown/):

- **[Getting Started (Tutorial)](src/site/markdown/getting-started.md)** — Configure a Maven project with Supa Maven Skin from scratch.
- **[Authoring Guide (How-To)](src/site/markdown/authoring-guide.md)** — Practical recipes for admonitions, `#bi` icons, synced tabs, accordions, steppers, code blocks, Mermaid diagrams, and KaTeX math.
- **[Configuration & Tokens (Reference)](src/site/markdown/configuration.md)** — Complete lookup tables for `<supaSkin>` options, WCAG 2.2 AA/AAA palettes, CSS variables, and Velocity macros.
- **[Components (Reference)](src/site/markdown/components.md)** — Live interactive showcase of all 28 Bootstrap 6 (`6.0.0-alpha.1`) component families styled across all 12 palette × polarity themes.
- **[Kitchen Sink (Reference)](src/site/markdown/kitchen-sink.md)** — End-to-end stress test of Doxia typography, tables, alerts, code blocks, and optional integrations.
- **[Architecture (Explanation)](src/site/markdown/architecture.md)** — How the Vite + Velocity + Doxia 2.0 build pipeline, zero-FOUC theme engine, and automated WCAG contrast verifier work.

## Usage in `src/site/site.xml`

Requires `maven-site-plugin` `3.21.0+` (Doxia `2.2.0` / Doxia Sitetools `2.0`).

```xml
<site xmlns="http://maven.apache.org/SITE/2.0.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://maven.apache.org/SITE/2.0.0 https://maven.apache.org/xsd/site-2.0.0.xsd"
      name="My Project">

  <skin>
    <groupId>io.github.mepcotterell</groupId>
    <artifactId>supa-maven-skin</artifactId>
    <version>0.1.0</version>
  </skin>

  <custom>
    <supaSkin>
      <defaultTheme>auto</defaultTheme>
      <colorScheme>furo</colorScheme>
      <colorSchemeSelector>true</colorSchemeSelector>
      <sourceRepository>https://github.com/mepcotterell/supa-maven-skin</sourceRepository>
      <sourceBranch>main</sourceBranch>
      <sourceDirectory>src/site</sourceDirectory>
      <sourceEditButton>true</sourceEditButton>
      <sourceViewButton>true</sourceViewButton>
      <tocSidebar>true</tocSidebar>
      <stickyContentHeader>false</stickyContentHeader>
      <prevNextButtons>true</prevNextButtons>
      <copyCodeButton>true</copyCodeButton>
      <syntaxHighlighting>true</syntaxHighlighting>
      <search>true</search>
      <mermaid>auto</mermaid>
      <katex>auto</katex>
    </supaSkin>
  </custom>
</site>
```

## Building & Testing

```bash
# Fast frontend inner loop (ESLint, SCSS WCAG 2.2 AA/AAA contrast linter, Velocity linter, Docs version linter, Vitest)
npm run lint && npm test && npm run build

# Full Maven build + Vitest unit tests + maven-invoker-plugin integration test + self-site render
mvn -B -ntp clean verify site
```

## License

MIT License. See [LICENSE](LICENSE) for details.
