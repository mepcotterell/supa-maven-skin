# Supa Maven Skin (`supa-maven-skin`)

A modern, responsive [Apache Maven Site Skin](https://maven.apache.org/plugins/maven-site-plugin/examples/creatingskins.html) inspired by [Sphinx Furo](https://github.com/pradyunsg/furo), built with **Bootstrap 6 (`6.0.0-alpha.1`)**, **Vite**, **Dart Sass (SCSS)**, **TypeScript**, and **`frontend-maven-plugin`**.

## Key Features

- **Canonical 3-Column Furo Layout**:
  - **Left Navigation Sidebar (`280px` sticky on `lg+` / `1024px+`)**: Brand/logo header, version pill badge, search modal trigger (`/` or `⌘K`), and collapsible `<details>`/`<summary>` navigation tree. Collapses into a native `<dialog class="lg:drawer drawer-start drawer-sheet">` off-canvas drawer below `1024px`.
  - **Center Prose Content (`48rem` max measure)**: Uses Bootstrap 6 `.prose` typography with refined vertical rhythm, breadcrumb header bar, View/Edit Source action icons, Furo Previous/Next navigation cards, and footer.
  - **Right "On this page" TOC (`240px` sticky on `xl+` / `1280px+`)**: Auto-generated heading outline (`h2`–`h4`) with single-active ScrollSpy tracking. Collapses into a `<dialog class="xl:drawer drawer-end drawer-sheet">` drawer below `1280px`.
- **3-State Adaptive Theme Toggle (`Light` → `Dark` → `Auto`) & 6 Accessible Palettes**:
  - Zero-FOUC inline `<head>` bootstrapper, `localStorage` persistence (`furo-theme`, `furo-palette`), CSS `light-dark()` semantic tokens, and 6 built-in WCAG 2.2 AA/AAA palettes (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, `modus-tritanopia`).
- **Rich Authoring Components**:
  - **Furo Admonitions**: Automatically transforms GitHub-Flavored Markdown blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) into styled Furo callouts.
  - **Synchronized Content Tabs**: `<div class="furo-tabs" data-tab-group="...">` panels (`<div data-tab="Label">`) synchronize active tab selections across the site via `localStorage`.
  - **Code Blocks**: Bundled `highlight.js` syntax highlighting, language badge pill, optional title header (`data-title`), optional line numbers, and one-click Copy to Clipboard button.
  - **Client-Side Search Modal**: Native `<dialog class="dialog">` search modal with `<mark>` query highlighting, keyboard navigation, and category badges.
  - **Optional Mermaid & KaTeX**: Lazy-loaded from CDN when `<mermaid>auto</mermaid>` or `<katex>auto</katex>` detects diagrams or math expressions.

## Usage in `src/site/site.xml`

Requires `maven-site-plugin` `3.21.0+` (Doxia 2.0 / Doxia Sitetools 2.0).

```xml
<site xmlns="http://maven.apache.org/SITE/2.0.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://maven.apache.org/SITE/2.0.0 https://maven.apache.org/xsd/site-2.0.0.xsd"
      name="My Project">

  <skin>
    <groupId>dev.cotterell.maven.skins</groupId>
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
    </supaSkin>
  </custom>
</site>
```

## Building & Testing

```bash
# Full Maven build + Vitest unit tests + maven-invoker-plugin integration test
mvn clean verify

# Generate the self-hosted documentation & Kitchen Sink demo site in target/site/
mvn install site
```

## License

Apache License, Version 2.0.
