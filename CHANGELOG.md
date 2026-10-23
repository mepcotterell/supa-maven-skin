# Changelog

All notable changes to **Supa Maven Skin** (`io.github.mepcotterell:supa-maven-skin`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-23

### Added

- **Canonical 3-Column Furo Layout**:
  - Sticky left navigation sidebar (`280px` on `lg+`) with dual-theme brand logos (`<lightLogo>` / `<darkLogo>`), version badge, quick search trigger (`/` or `⌘K`), and collapsible `<details>` / `<summary>` menu hierarchy.
  - Center prose article column (`48rem` max measure) powered by Bootstrap 6 `.prose` typography, top breadcrumb and source action bar (**View source** / **Edit this page**), and Furo-styled **Previous / Next** navigation cards.
  - Sticky right **"On this page"** Table of Contents (`240px` on `xl+`) with automatic `h2`–`h4` heading extraction, slug permalinks, and Bootstrap 6 `ScrollSpy` active-section tracking.
  - Responsive off-canvas `<dialog>` drawers for both the left sidebar (`#furoSidebarDrawer.drawer-start`) and right TOC (`#furoTocDrawer.drawer-end`) with configurable `data-bs-scroll` and `data-bs-backdrop` options in `site.xml`.
- **Adaptive Light / Dark / Auto Theme Engine & 6 Accessible Palettes**:
  - Zero-FOUC inline `<head>` theme & palette initializer persisted via `localStorage` (`furo-theme`, `furo-palette`).
  - Built-in WCAG 2.2 AA & AAA accessible color schemes: `furo` (AA), `bootstrap` (AA), `modus` (AAA), `modus-tinted` (AAA), `modus-deuteranopia` (AAA), and `modus-tritanopia` (AAA).
  - Support for custom CSS variable overrides in `site.xml` via `<lightCssVariables>` and `<darkCssVariables>`.
- **Full Bootstrap 6 (`6.0.0-alpha.1`) Component & Plugin Support**:
  - Bundled all 28 Bootstrap 6 component families and all 20 interactive JS plugins on `window.bootstrap` (`Alert`, `Button`, `Carousel`, `Chips`, `Collapse`, `Combobox`, `Datepicker`, `Dialog`, `Drawer`, `Menu`, `NavOverflow`, `OtpInput`, `Popover`, `Range`, `ScrollSpy`, `Strength`, `Tab`, `Toast`, `Toggler`, `Tooltip`).
  - Automatic `.not-prose` isolation for Bootstrap 6 components inside documentation articles.
  - Automatic upgrade of native `[title]` attributes to Bootstrap 6 `Tooltip` instances.
  - Interactive **Bootstrap 6 Component Playground** (`[data-furo-playground]`) and unified live preview + syntax showcase cards (`.furo-component-example`) with collapsible code blocks and multi-syntax tabs (`Markdown Shorthand`, `Markdown + HTML`, `Velocity Macro (.md.vm)`).
  - 11 `#bs*` Velocity macros (`#bsAlert`, `#bsBadge`, `#bsButton`, `#bsCallout`, `#bsCard`, `#bsChip`, `#bsProgress`, `#bsSpinner`, `#bsAccordionStart` / `#bsAccordionItem` / `#bsAccordionEnd`, `#bsStepper`) for `.md.vm` pages.
- **Rich Technical Authoring & Doxia 2.0 Normalization**:
  - GitHub-Flavored Markdown blockquote admonitions (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) and Bootstrap 6 alert shorthands (`> [!ALERT:theme dismissible]`).
  - Synchronized content tabs (`.furo-tabs`), declarative accordions (`.furo-accordion`), and multi-step workflow steppers (`ol.furo-stepper`).
  - Smart Doxia table normalization (`table.bodyTable` → responsive Bootstrap 6 `.table`) with automatic compact vs. prose column sizing.
  - Offline `highlight.js` syntax highlighting (including unified `diff` addition/deletion line highlighting and automatic `plaintext` highlighting on `licenses.html`), language pill badges, optional titles, line numbers, and one-click Copy to Clipboard buttons.
  - Built-in client-side `<dialog>` search modal indexing sidebar links, page headings, and site pages.
  - Optional lazy-loaded **Mermaid** diagrams (`<mermaid>auto</mermaid>`) and **KaTeX** mathematical notation (`<katex>auto</katex>`).

[Unreleased]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mepcotterell/supa-maven-skin/releases/tag/v0.1.0
