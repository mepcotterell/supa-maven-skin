# Supa Maven Skin

**Supa Maven Skin** (`supa-maven-skin`) is a modern [Apache Maven Site](https://maven.apache.org/plugins/maven-site-plugin/) skin inspired by Pradyun Gedam's [Furo](https://pradyunsg.me/furo/) Sphinx documentation theme and built on **Bootstrap 6 (`6.0.0-alpha.1`)**, **Bootstrap Icons**, **Vite**, **Dart Sass (SCSS)**, and **TypeScript**.

> [!NOTE]
> This documentation site is rendered using `supa-maven-skin` itself! Try toggling between **Light**, **Dark**, and **Auto** themes or switching accessible color schemes in the top utility bar, or pressing `/` (<kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd>) to open the search dialog.

---

## Documentation Guide (Diátaxis Map)

Explore the documentation by goal:

<div class="row g-3 not-prose my-3">
  <div class="col-12 md:col-6">
    <div class="card h-100 p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-rocket-takeoff text-primary fs-5" aria-hidden="true"></i>
        <a href="getting-started.html" class="fw-semibold text-decoration-none">Quickstart Tutorial</a>
        <span class="badge badge-subtle theme-primary ms-auto">Tutorial</span>
      </div>
      <p class="mb-0 text-body-secondary small">Step-by-step guide to configuring <code>pom.xml</code> and <code>site.xml</code> and writing your first <code>.md</code> and <code>.md.vm</code> pages.</p>
    </div>
  </div>
  <div class="col-12 md:col-6">
    <div class="card h-100 p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-journal-code text-success fs-5" aria-hidden="true"></i>
        <a href="authoring-guide.html" class="fw-semibold text-decoration-none">Authoring Rich Content</a>
        <span class="badge badge-subtle theme-success ms-auto">How-To Guide</span>
      </div>
      <p class="mb-0 text-body-secondary small">Practical recipes for Furo admonitions, Bootstrap Icons (<code>:bi-...:</code> &amp; <code>#bi</code>), synchronized tabs, accordions, Mermaid, and KaTeX.</p>
    </div>
  </div>
  <div class="col-12 md:col-6">
    <div class="card h-100 p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-sliders text-info fs-5" aria-hidden="true"></i>
        <a href="configuration.html" class="fw-semibold text-decoration-none">Configuration &amp; Macros</a>
        <span class="badge badge-subtle theme-info ms-auto">Reference</span>
      </div>
      <p class="mb-0 text-body-secondary small">Complete lookup tables for <code>&lt;supaSkin&gt;</code> options, WCAG 2.2 AA/AAA color schemes, CSS variables, and Velocity macros.</p>
    </div>
  </div>
  <div class="col-12 md:col-6">
    <div class="card h-100 p-3">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-layers text-warning fs-5" aria-hidden="true"></i>
        <a href="architecture.html" class="fw-semibold text-decoration-none">Architecture &amp; Color System</a>
        <span class="badge badge-subtle theme-warning ms-auto">Explanation</span>
      </div>
      <p class="mb-0 text-body-secondary small">Deep dive into the 3-column Furo layout, Doxia 2.0 normalization, <code>.prose</code> isolation, and WCAG 2.2 AA/AAA contrast guarantees.</p>
    </div>
  </div>
</div>

---

## Key Features

### Canonical Furo 3-Column Layout

- **Left Navigation Sidebar (`280px` on `lg+`)**: Sticky full-height navigation sidebar with dual-theme brand logos (`<lightLogo>` / `<darkLogo>`), project title and version badge, quick search trigger (`⌘K` / `/`), and collapsible `<details>` / `<summary>` menu hierarchy. Collapses into a native Bootstrap 6 left drawer (`<dialog id="supaSidebarDrawer" class="lg:drawer drawer-start">`) on mobile and tablet viewports.
- **Center Prose Content (`48rem` max measure)**: Clean `.prose` typography powered by Bootstrap 6, top breadcrumb and source action bar ("View source" / "Edit this page"), Furo-styled **Previous / Next** page navigation cards, and customizable footer.
- **Right "On this page" Table of Contents (`240px` on `xl+`)**: Sticky right-hand heading tree (`h2`–`h4`) automatically generated from the article DOM and synchronized with **Bootstrap 6 ScrollSpy**.

### Rich Authoring in Markdown (`.md`) & Velocity (`.md.vm`)

- **Furo Admonitions & Bootstrap 6 Alerts**: Write GitHub-Flavored Markdown blockquote alerts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) or Bootstrap 6 alerts (`> [!ALERT:primary dismissible]`, `#bsAlert`).
- **2,000+ Bundled Bootstrap Icons**: Author icons offline via Markdown shortcodes (`:bi-rocket-takeoff text-primary:`), the `#bi` Velocity macro (`#bi( "rocket-takeoff" "text-primary" )`), or HTML `<i class="bi bi-..."></i>`.
- **Synchronized Content Tabs**: Group multi-language or multi-tool code blocks with `<div class="supa-tabs" title="group-key">` persisted automatically in `localStorage`.
- **Offline Syntax Highlighting & Copy Button**: Bundles `highlight.js` for 14+ JVM and web languages plus a one-click copy-to-clipboard button.
- **Zero-Config Client-Side Search**: Native `<dialog class="dialog">` modal that indexes sidebar navigation, page headings, and Maven reports (`sessionStorage`-cached) without external SaaS dependencies.

---

## Minimal Quickstart

Add `supa-maven-skin` to your project's `src/site/site.xml`:

```xml
<skin>
  <groupId>io.github.mepcotterell</groupId>
  <artifactId>supa-maven-skin</artifactId>
  <version>0.1.0-SNAPSHOT</version>
</skin>
```

Then generate your site with `maven-site-plugin` `3.21.0+`:

```bash
mvn site
```

For a full walkthrough, head to the **[Quickstart Tutorial](getting-started.html)** or jump straight to **[Authoring Rich Content](authoring-guide.html)**.
