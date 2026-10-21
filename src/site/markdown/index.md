# Supa Maven Skin

**Supa Maven Skin** (`supa-maven-skin`) is a modern [Apache Maven Site](https://maven.apache.org/plugins/maven-site-plugin/) skin inspired by Pradyun Gedam's [Furo](https://pradyunsg.me/furo/) Sphinx documentation theme and built on **Bootstrap 6 (`6.0.0-alpha.1`)**, **Vite**, **Dart Sass (SCSS)**, and **TypeScript**.

> [!NOTE]
> This documentation site is rendered using `supa-maven-skin` itself! Try toggling between **Light**, **Dark**, and **Auto** themes or switching accessible color schemes in the top utility bar, or pressing `/` (`⌘K` / `Ctrl+K`) to open the search dialog.

## Key Features

### Canonical Furo 3-Column Layout

- **Left Navigation Sidebar (`280px` on `lg+`)**: Sticky full-height navigation sidebar with dual-theme brand logos (`<lightLogo>` / `<darkLogo>`), project title and version badge, quick search trigger (`⌘K` / `/`), and collapsible `<details>` / `<summary>` menu hierarchy. Collapses into a native Bootstrap 6 `<dialog class="lg:drawer drawer-start drawer-sheet">` off-canvas sheet on mobile and tablet viewports.
- **Center Prose Content (`48rem` max measure)**: Clean `.prose` typography powered by Bootstrap 6, top breadcrumb and source action bar ("View source" / "Edit this page"), Furo-styled **Previous / Next** page navigation cards, and customizable footer.
- **Right "On this page" Table of Contents (`240px` on `xl+`)**: Sticky right-hand heading tree (`h2`–`h4`) automatically generated from the article DOM and synchronized with **Bootstrap 6 ScrollSpy**. Accessible via a responsive right-side `<dialog class="xl:drawer drawer-end drawer-sheet">` on tablet/mobile.

### First-Class Dark / Light / Auto Theme Engine & Accessible Palettes

- Built natively on Bootstrap 6's `color-scheme: light dark` and `light-dark()` CSS color functions.
- Includes 6 built-in **WCAG 2.2 AA & AAA** accessible color schemes (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, and `modus-tritanopia`).
- Zero Flash of Unstyled Content (FOUC) via an inline `<head>` initializer that reads `localStorage.getItem('furo-theme')` and `localStorage.getItem('furo-palette')`.
- Supports Furo-style CSS variable overrides directly in `site.xml` via `<lightCssVariables>` and `<darkCssVariables>`.

### Rich Technical Documentation Enhancements

- **Furo Admonitions**: Automatically transforms GitHub-Flavored Markdown blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) into Furo's signature callout cards with semantic icons, tinted header bars, and colored left borders.
- **Offline Syntax Highlighting & Copy Button**: Bundles `highlight.js` for common JVM and web languages (`java`, `xml`, `kotlin`, `groovy`, `bash`, `json`, `yaml`, `properties`, `sql`, `typescript`, `javascript`, `python`, `diff`, `scss`) plus a one-click copy-to-clipboard button.
- **Built-in Client-Side Search Dialog**: Native `<dialog class="dialog">` modal that indexes sidebar navigation, page headings, and site pages (`sessionStorage`-cached) without external SaaS dependencies.

## Quickstart

### 1. Configure `src/site/site.xml`

Add `supa-maven-skin` to your project's `src/site/site.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
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
      <sourceRepository>https://github.com/org/my-project</sourceRepository>
      <sourceBranch>main</sourceBranch>
      <sourceDirectory>src/site</sourceDirectory>
    </supaSkin>
  </custom>

  <body>
    <menu name="Guide">
      <item name="Overview" href="index.html" />
    </menu>
    <menu ref="reports" inherit="bottom" />
  </body>
</site>
```

### 2. Configure `maven-site-plugin` in `pom.xml`

Target `maven-site-plugin` `3.21.0+` (Doxia 2.0 / Doxia Sitetools 2.0):

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-site-plugin</artifactId>
      <version>3.21.0</version>
      <dependencies>
        <dependency>
          <groupId>org.apache.maven.doxia</groupId>
          <artifactId>doxia-module-markdown</artifactId>
          <version>2.2.0</version>
        </dependency>
      </dependencies>
    </plugin>
  </plugins>
</build>
```

### 3. Generate the Site

```bash
mvn site
```
