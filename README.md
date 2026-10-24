# Supa Maven Skin (`supa-maven-skin`)

A modern, responsive, accessible three-column [Apache Maven Site Skin](https://maven.apache.org/plugins/maven-site-plugin/examples/creatingskins.html) inspired by [Sphinx Furo](https://github.com/pradyunsg/furo), built with **Bootstrap 5.3**, **Bootstrap Icons**, **Vite**, **Dart Sass (SCSS)**, **TypeScript**, and **`frontend-maven-plugin`**.

## Key Features

- **Canonical 3-Column Layout**:
  - **Left Navigation Sidebar (`280px` sticky on `lg+`)**: Brand/logo header, version pill badge, search modal trigger (`/` or `⌘K`), and collapsible `<details>`/`<summary>` navigation tree. Collapses into a Bootstrap offcanvas drawer on mobile/tablet viewports.
  - **Center Prose Content (`48rem` max measure)**: Uses refined vertical rhythm, breadcrumb header bar, View/Edit Source action icons, Previous/Next navigation cards, and customizable footer.
  - **Right "On this page" TOC (`240px` sticky on `xl+`)**: Auto-generated heading outline (`h2`–`h4`) with single-active ScrollSpy tracking and mobile collapsible drawer.
- **3-State Adaptive Theme Toggle (`Light` → `Dark` → `Auto`) & 6 Accessible Palettes**:
  - Zero-FOUC inline `<head>` bootstrapper, `localStorage` persistence (`supa-theme`, `supa-palette`), `--supa-*` semantic CSS custom properties, and 6 built-in WCAG 2.2 AA/AAA color-blind-safe schemes (`furo`, `tol-bright`, `tol-muted`, `ibm-carbon`, `viridis`, `solarized-high`).
- **Rich Authoring Components**:
  - **GitHub-Flavored Markdown Admonitions**: Automatically transforms blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) into accessible `.supa-admonition` callouts.
  - **Bootstrap Icons (`#bi` Velocity Macro)**: Embeds bundled `bootstrap-icons.woff2` glyphs via `#bi( "rocket-takeoff" )` in `.md.vm` pages or `<i class="bi bi-rocket-takeoff"></i>` in standard Markdown.
  - **Synchronized Content Tabs**: `<div class="supa-tabs" data-tab-group="...">` panels (`<div data-tab="Label">`) synchronize active tab selections across the entire site via `localStorage['supa-tab-sync']`.
  - **Code Blocks**: Bundled `highlight.js` syntax highlighting, language badge pill, optional title header (`data-title`), optional line numbers (`data-line-numbers`), and one-click Copy to Clipboard button.
  - **Client-Side Search Modal**: Instant cross-page search (`/` or `⌘K`) with `<mark>` query highlighting, keyboard navigation, and section deep-linking.
  - **Opt-In Integrations**: Bundled KaTeX (`<katex>`), Mermaid (`<mermaid>`), Chart.js (`<charts>`), and Vanilla Calendar Pro (`<calendar>`) activated on demand (`auto` or `true`).

## Documentation (`src/site/`)

The full documentation is organized following the [Diátaxis](https://diataxis.fr/) framework in [`src/site/markdown/`](src/site/markdown/):

- **[Getting Started (Tutorial)](src/site/markdown/getting-started.md)** — Configure a Maven project with Supa Maven Skin from scratch.
- **[Authoring Guide (How-To)](src/site/markdown/authoring-guide.md)** — Practical recipes for admonitions, `#bi` icons, synced tabs, code blocks, math, diagrams, charts, and calendars.
- **[Configuration & Tokens (Reference)](src/site/markdown/configuration.md)** — Complete lookup tables for `<supaSkin>` options, WCAG 2.2 AA/AAA palettes, `--supa-*` CSS variables, and Velocity macros.
- **[Bootstrap Components (Reference)](src/site/markdown/bootstrap-components.md)** — Live interactive showcase of Bootstrap 5.3 components styled across all 12 palette × polarity themes.
- **[Kitchen Sink (Reference)](src/site/markdown/kitchen-sink.md)** — End-to-end stress test of Doxia typography, tables, alerts, code blocks, and optional integrations.
- **[Architecture (Explanation)](src/site/markdown/architecture.md)** — How the Vite + Velocity + Doxia 2.0 build pipeline, zero-FOUC theme engine, and automated WCAG contrast verifier work.

## Usage in `src/site/site.xml`

Requires `maven-site-plugin` `3.21.0+` (Doxia 2.0 / Doxia Sitetools 2.0).

```xml
<site xmlns="http://maven.apache.org/SITE/2.0.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://maven.apache.org/SITE/2.0.0 https://maven.apache.org/xsd/site-2.0.0.xsd"
      name="My Project">

  <skin>
    <groupId>io.github.mepcotterell</groupId>
    <artifactId>supa-maven-skin</artifactId>
    <version>0.1.0-SNAPSHOT</version>
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
      <prevNextButtons>true</prevNextButtons>
      <copyCodeButton>true</copyCodeButton>
      <syntaxHighlighting>true</syntaxHighlighting>
      <search>true</search>
      <mermaid>auto</mermaid>
      <katex>auto</katex>
      <charts>auto</charts>
      <calendar>auto</calendar>
    </supaSkin>
  </custom>
</site>
```

## Building & Testing

```bash
# Fast frontend inner loop (ESLint, SCSS WCAG 2.2 AA/AAA contrast linter, Velocity linter, Vitest)
npm run lint && npm test && npm run build

# Full Maven build + Vitest unit tests + maven-invoker-plugin integration test + self-site render
mvn -B -ntp clean verify site
```

## License

MIT License. See [LICENSE](LICENSE) for details.
