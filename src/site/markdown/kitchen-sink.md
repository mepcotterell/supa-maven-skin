# Kitchen Sink Showcase

This page demonstrates all typography, Furo admonitions, syntax-highlighted code blocks, synchronized content tabs, responsive Doxia tables, Bootstrap 6 components, Bootstrap Icons, Mermaid diagrams, and KaTeX math provided by **Supa Maven Skin**.

## Furo Admonitions

GitHub-Flavored Markdown blockquote alerts are automatically transformed into Furo admonition cards with semantic icons, tinted headers, and colored left borders:

> [!NOTE]
> Useful information that users should know, even when skimming content. Furo admonitions adapt automatically between Light and Dark themes using CSS `light-dark()`.

> [!TIP] Pro Tip: Instant Keyboard Search
> Press <kbd>/</kbd> or <kbd>⌘K</kbd> (<kbd>Ctrl+K</kbd>) anywhere on the page to open the native `<dialog class="dialog">` search modal.

> [!IMPORTANT]
> Key information users need to know to achieve their goal, such as requiring `maven-site-plugin` `3.21.0+` (Doxia 2.0 / Doxia Sitetools 2.0).

> [!WARNING]
> Urgent information that needs immediate user attention to avoid subtle configuration issues.

> [!CAUTION]
> Advises about risks or negative outcomes of destructive operations.

## Syntax Highlighting & Copy Button

Code blocks display a subtle language badge (`JAVA`, `TS`, `DIFF`, `XML`) in the top-right corner that cross-fades into the **Copy to clipboard** button on hover.

### Synchronized Content Tabs (`sphinx-inline-tabs`)

Switch between tabs below—active tab selection is automatically persisted and synchronized across tab groups:

<div class="furo-tabs" title="jvm-lang" data-tab-group="jvm-lang">
  <div title="Java 21" data-tab="Java 21">
    <pre><code class="language-java">package io.github.mepcotterell.skins;
import java.util.List;
public record SupaSkinConfig(
    String defaultTheme,
    boolean tocSidebar,
    int tocMaxDepth,
    List&lt;String&gt; languages
) {
    public static SupaSkinConfig defaults() {
        return new SupaSkinConfig("auto", true, 4, List.of("java", "kotlin", "xml", "ts"));
    }
}</code></pre>
  </div>
  <div title="Kotlin" data-tab="Kotlin">
    <pre><code class="language-kotlin">package io.github.mepcotterell.skins
data class SupaSkinConfig(
    val defaultTheme: String = "auto",
    val tocSidebar: Boolean = true,
    val tocMaxDepth: Int = 4,
    val languages: List&lt;String&gt; = listOf("java", "kotlin", "xml", "ts")
)</code></pre>
  </div>
</div>

### TypeScript & Bootstrap 6 ESM Example

```typescript
import Dialog from 'bootstrap/js/dist/dialog.js';
import Drawer from 'bootstrap/js/dist/drawer.js';
import ScrollSpy from 'bootstrap/js/dist/scrollspy.js';

export function openSearchModal(dialogEl: HTMLDialogElement): void {
  const modal = Dialog.getOrCreateInstance(dialogEl);
  modal.show();
}
```

### Unified Diff Example

```diff
 <skin>
-  <groupId>org.apache.maven.skins</groupId>
-  <artifactId>maven-fluido-skin</artifactId>
-  <version>2.0.0-M11</version>
+  <groupId>io.github.mepcotterell</groupId>
+  <artifactId>supa-maven-skin</artifactId>
+  <version>0.1.0-SNAPSHOT</version>
 </skin>
```

## Responsive Doxia Tables

Standard Markdown and Doxia `table.bodyTable` elements are automatically normalized into responsive Bootstrap 6 tables:

| Component | Desktop (`xl+` / 1280px+) | Laptop (`lg` / 1024px–1279px) | Tablet & Mobile (`< 1024px`) |
| :--- | :--- | :--- | :--- |
| **Left Navigation Sidebar** | Sticky `280px` column | Sticky `280px` column | Off-canvas `<dialog class="lg:drawer drawer-start">` |
| **Center Prose Article** | Centered `48rem` max measure | Centered `48rem` max measure | Fluid width with responsive padding |
| **Right "On this page" TOC** | Sticky `240px` ScrollSpy column | Off-canvas `<dialog class="xl:drawer drawer-end">` | Off-canvas `<dialog class="xl:drawer drawer-end">` |
| **Documentation Search** | `<dialog class="dialog">` modal | `<dialog class="dialog">` modal | `<dialog class="dialog">` modal |

## Bootstrap 6 UI Components

Because `supa-maven-skin` bundles **all 28 Bootstrap `6.0.0-alpha.1` component families, 20 interactive JS plugins, and 2,000+ Bootstrap Icons**, you can use Bootstrap 6 buttons, badges, avatars, chips, accordions, steppers, menus, dialogs, drawers, comboboxes, datepickers, cards, and icons directly in documentation pages:

<div class="not-prose my-4">
  <div class="d-flex flex-wrap gap-2 mb-3">
    <span class="badge theme-primary"><i class="bi bi-rocket-takeoff me-1" aria-hidden="true"></i>Primary Badge</span>
    <span class="badge theme-secondary"><i class="bi bi-gear me-1" aria-hidden="true"></i>Secondary Badge</span>
    <span class="badge theme-success"><i class="bi bi-check-circle-fill me-1" aria-hidden="true"></i>Success</span>
    <span class="badge theme-info"><i class="bi bi-info-circle-fill me-1" aria-hidden="true"></i>Info</span>
    <span class="badge theme-warning"><i class="bi bi-exclamation-triangle-fill me-1" aria-hidden="true"></i>Warning</span>
    <span class="badge theme-danger"><i class="bi bi-shield-exclamation me-1" aria-hidden="true"></i>Danger</span>
  </div>
  <div class="card p-3" style="background-color: var(--color-background-secondary); border-color: var(--color-background-border); border-radius: 0.5rem;">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div>
        <div class="fw-semibold mb-1"><i class="bi bi-grid-1x2-fill text-primary me-1" aria-hidden="true"></i>Full Bootstrap 6 Component Catalog</div>
        <p class="mb-0 text-secondary" style="font-size: 0.9rem;">Explore all 28 Bootstrap 6 component families, variants, and interactive JS widgets.</p>
      </div>
      <a href="bootstrap-components.html" class="btn btn-sm btn-solid theme-primary">Explore All 28 Components &rarr;</a>
    </div>
  </div>
</div>

### Bootstrap Icons (Markdown Shortcodes, HTML & Velocity Macros)

All [Bootstrap Icons](https://icons.getbootstrap.com/) are bundled offline in `supa-maven-skin` (`bootstrap-icons.woff2`) and can be authored using **Markdown shortcodes** (`:bi-<name>:` or `:bi-<name> <classes>:`), **Markdown + HTML** (`<i class="bi bi-..."></i>`), or **Velocity macros** (`#bi`, `#furoIcon`, `#bsIcon` in `.md.vm` templates):

<div class="furo-component-preview">
  <div class="d-flex flex-wrap align-items-center gap-3">
    <span class="d-inline-flex align-items-center gap-1 fw-medium">:bi-rocket-takeoff text-primary fs-5: Launch</span>
    <span class="d-inline-flex align-items-center gap-1 fw-medium">:bi-check-circle-fill text-success fs-5: Verified</span>
    <span class="d-inline-flex align-items-center gap-1 fw-medium">:bi-lightning-charge-fill text-warning fs-5: Fast Vite Build</span>
    <span class="d-inline-flex align-items-center gap-1 fw-medium"><i class="bi bi-github fs-5" aria-hidden="true"></i> GitHub Actions</span>
    <span class="d-inline-flex align-items-center gap-1 fw-medium"><i class="bi bi-universal-access-circle text-info fs-5" aria-hidden="true"></i> WCAG 2.2 AAA</span>
  </div>
</div>

<div class="furo-tabs" title="authoring-mode">
  <div title="Markdown Shorthand">
    <pre><code class="language-markdown">Inline icons with optional utility classes:
:bi-rocket-takeoff: Launch
:bi-check-circle-fill text-success fs-5: Verified
:bi-lightning-charge-fill text-warning: Fast Vite Build</code></pre>
  </div>
  <div title="Markdown + HTML">
    <pre><code class="language-html">&lt;i class="bi bi-rocket-takeoff text-primary fs-5" aria-hidden="true"&gt;&lt;/i&gt; Launch
&lt;i class="bi bi-check-circle-fill text-success fs-5" aria-hidden="true"&gt;&lt;/i&gt; Verified
&lt;i class="bi bi-github fs-5" aria-hidden="true"&gt;&lt;/i&gt; GitHub Actions</code></pre>
  </div>
  <div title="Velocity Macro (.md.vm)">
    <pre><code class="language-velocity">#parse( "site-macros.vm" )
#bi( "rocket-takeoff" ) Launch
#furoIcon( "check-circle-fill" "text-success fs-5" "" ) Verified
#bsIcon( "universal-access-circle" "text-info fs-5" "Accessible" ) WCAG 2.2 AAA</code></pre>
  </div>
</div>

### Collapsible Details Disclosure

<details class="mb-3">
  <summary class="fw-semibold" style="cursor: pointer;">Click to expand build pipeline details</summary>
  <p class="mt-2 mb-0">
    <code>frontend-maven-plugin</code> runs Vite and Dart Sass during the <code>generate-resources</code> phase, outputting <code>css/supa-maven-skin.min.css</code> and <code>js/supa-maven-skin.min.js</code> into <code>target/classes/</code>.
  </p>
</details>

## Diagrams & Mathematical Notation

### Mermaid Architecture Diagram

When a page contains a `mermaid` code block, `supa-maven-skin` lazily loads Mermaid from CDN and renders it with matching Light/Dark theme variables:

```mermaid
flowchart TD
    A["pom.xml & site.xml"] --> B["frontend-maven-plugin (Vite + SCSS + TS)"]
    B --> C["supa-maven-skin.jar"]
    C --> D["maven-site-plugin 3.21.0 (Doxia 2.0)"]
    D --> E["3-Column Furo HTML5 Site"]
```

### KaTeX Math Rendering

Inline math like $E = mc^2$ and display equations are automatically rendered when `<katex>auto</katex>` detects math delimiters:

$$
\mathcal{L}(\theta) = \frac{1}{N} \sum_{i=1}^{N} \left( y_i - f_\theta(x_i) \right)^2 + \lambda \|\theta\|_2^2
$$

## Typography & Prose Elements

### Inline Formatting, Blockquotes & Lists

> "Documentation should be effortless to read, navigate, and maintain—in both light and dark environments."

- **Bold text**, *italicized text*, ~~strikethrough~~, and `inline code` tokens.
- Keyboard shortcuts: <kbd>⌘</kbd> + <kbd>K</kbd>, <kbd>/</kbd>, and <kbd>Esc</kbd>.
- Automatic heading permalinks (`#`) on `h2` through `h4` headings:
  1. First ordered item
  2. Second ordered item with nested bullets:
     - Sub-item A (`--color-brand-primary`)
     - Sub-item B (`--color-brand-content`)

### Definition Lists

<dl>
  <dt>Doxia Sitetools 2.0</dt>
  <dd>The Apache Maven site rendering engine that processes Velocity templates and Markdown/APT/XDoc content.</dd>
  <dt>Bootstrap 6 (6.0.0-alpha.1)</dt>
  <dd>Next-generation Bootstrap featuring native HTML5 <code>&lt;dialog&gt;</code> modals and drawers, <code>.prose</code> typography, and <code>light-dark()</code> CSS tokens.</dd>
</dl>
