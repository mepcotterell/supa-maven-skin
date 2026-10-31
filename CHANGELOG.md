# Changelog

All notable changes to **Supa Maven Skin** (`io.github.mepcotterell:supa-maven-skin`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **CI / Release Workflows**: Switched `actions/setup-java` from the deprecated `server-username` / `server-password` inputs to `server-username-env-var` / `server-password-env-var` in `.github/workflows/ci.yml` and `release.yml`.

## [0.1.0] - 2026-10-31

### Added

- **Opt-in Sticky Content Header (`<stickyContentHeader>`)**: Setting `<stickyContentHeader>true</stickyContentHeader>` in `<supaSkin>` pins the breadcrumb and source/theme utility bar (`.supa-content-header`) to the top of the viewport on `lg+` screens with a translucent blurred background, adds `.supa-sticky-content-header` to `<body>`, and offsets heading `scroll-margin-top` and the TOC ScrollSpy by the new `--supa-content-header-height` token (default `false`).
- **Canonical 3-Column Furo Layout**:
  - Sticky left navigation sidebar (`256px` on `lg+`) with dual-theme brand logos (`<lightLogo>` / `<darkLogo>`), version badge, quick search trigger (`/` or `⌘K`), and collapsible `<details>` / `<summary>` menu hierarchy.
  - Center-aligned `.supa-sidebar-brand` content (logo, project title, and version badge) by default to match Sphinx Furo's canonical brand header, configurable via `<sidebarBrandAlign>` (`center`, `left` / `start`, or `right` / `end`) in `site.xml` and `--supa-sidebar-brand-*` CSS custom properties.
  - Center prose article column (`56rem` / `896px` max measure) powered by Bootstrap 6 `.prose` typography, top breadcrumb and source action bar (**View source** / **Edit this page**), and Furo-styled **Previous / Next** navigation cards.
  - Sticky right **"On this page"** Table of Contents (`224px` on `xl+`) with automatic `h2`–`h4` heading extraction, slug permalinks, and Bootstrap 6 `ScrollSpy` active-section tracking.
  - Responsive off-canvas `<dialog>` drawers for both the left sidebar (`#supaSidebarDrawer.drawer-start`) and right TOC (`#supaTocDrawer.drawer-end`) with configurable `data-bs-scroll` and `data-bs-backdrop` options in `site.xml`.
- **Adaptive Light / Dark / Auto Theme Engine & 6 Accessible Palettes**:
  - Zero-FOUC inline `<head>` theme & palette initializer persisted via `localStorage` (`supa-theme`, `supa-palette`).
  - Built-in WCAG 2.2 AA & AAA accessible color schemes: `furo` (AA), `bootstrap` (AA), `modus` (AAA), `modus-tinted` (AAA), `modus-deuteranopia` (AAA), and `modus-tritanopia` (AAA).
  - Support for custom CSS variable overrides in `site.xml` via `<lightCssVariables>` and `<darkCssVariables>`.
- **All 12 Sphinx Furo Admonition Types with Bootstrap Icons**:
  - Support all 12 admonition types defined by Sphinx Furo (`[!ADMONITION]`, `[!ATTENTION]`, `[!CAUTION]`, `[!DANGER]`, `[!ERROR]`, `[!HINT]`, `[!IMPORTANT]`, `[!NOTE]`, `[!SEEALSO]` / `[!SEE-ALSO]`, `[!TIP]`, `[!TODO]`, and `[!WARNING]`), each rendered with a semantic Bootstrap Icons glyph (`<i class="bi bi-... supa-admonition-icon" aria-hidden="true"></i>`), custom title support, and innermost-first nested blockquote support (`> > [!WARNING]`).
  - Added `--supa-admonition-todo-accent` and `--supa-admonition-todo-bg` tokens across all 6 WCAG 2.2 AA/AAA palettes with automated contrast verification in `scripts/lint-scss.ts`.
  - Support for Bootstrap 6 alert shorthands (`> [!ALERT:theme dismissible]`).
- **Bootstrap Icons Authoring (`:bi-...:` Shortcodes & `#bi` Velocity Macro)**:
  - Bundled `bootstrap-icons.woff2` / `.woff` offline and added inline Markdown shortcode support (`:bi-rocket-takeoff text-primary:`) and the unified `#bi( $name $extraClasses $ariaLabel )` Velocity macro.
- **Full Bootstrap 6 (`6.0.0-alpha.1`) Component & Plugin Support**:
  - Bundled all 28 Bootstrap 6 component families and all 20 interactive JS plugins on `window.bootstrap` (`Alert`, `Button`, `Carousel`, `Chips`, `Collapse`, `Combobox`, `Datepicker`, `Dialog`, `Drawer`, `Menu`, `NavOverflow`, `OtpInput`, `Popover`, `Range`, `ScrollSpy`, `Strength`, `Tab`, `Toast`, `Toggler`, `Tooltip`).
  - Automatic `.not-prose` isolation for Bootstrap 6 components inside documentation articles.
  - Automatic upgrade of native `[title]` attributes to Bootstrap 6 `Tooltip` instances.
  - Interactive **Bootstrap 6 Component Playground** (`[data-supa-playground]`) and unified live preview + syntax showcase cards (`.supa-component-example`) with collapsible code blocks and multi-syntax tabs (`Markdown Shorthand`, `Markdown + HTML`, `Velocity Macro (.md.vm)`).
  - `#bs*` Velocity macros (`#bsAlert`, `#bsBadge`, `#bsCard`, `#bsCardGridStart`, `#bsCardGridEnd`, `#bsGuideCard`) for `.md.vm` pages.
- **Rich Technical Authoring & Doxia 2.0 Normalization**:
  - Synchronized content tabs (`.supa-tabs`), declarative accordions (`.supa-accordion`), and multi-step workflow steppers (`ol.supa-stepper`).
  - Smart Doxia table normalization (`table.bodyTable` → responsive Bootstrap 6 `.table`) with automatic compact vs. prose column sizing.
  - Offline `highlight.js` syntax highlighting (including unified `diff` addition/deletion line highlighting and automatic `plaintext` highlighting on `licenses.html`), language pill badges, optional titles, line numbers, and one-click Copy to Clipboard buttons.
  - Built-in client-side `<dialog>` search modal indexing sidebar links, page headings, and cross-page Maven report sections.
  - Optional lazy-loaded **Mermaid** diagrams (`<mermaid>auto</mermaid>`) and **KaTeX** mathematical notation (`<katex>auto</katex>`).
- **Bundled Project & Third-Party Licenses inside Skin JAR (`META-INF/`) & Asset Headers**:
  - Packaged the project's `LICENSE` (`META-INF/LICENSE`) alongside `META-INF/THIRD-PARTY-LICENSES.txt` and individual upstream license files (`META-INF/licenses/LICENSE-bootstrap.txt`, `META-INF/licenses/LICENSE-bootstrap-icons.txt`, `META-INF/licenses/LICENSE-highlight.js.txt`) inside `supa-maven-skin.jar`, and prepended `/*! ... */` legal attribution banners to `css/supa-maven-skin.min.css` and `js/supa-maven-skin.min.js`.
- **Self-Site Documentation (`src/site/`) & Automated Linters (`scripts/`)**:
  - Organized `src/site/markdown/` around the Diátaxis framework (`index.md.vm`, `getting-started.md`, `authoring-guide.md`, `configuration.md`, `components.md`, `kitchen-sink.md`, `architecture.md`) with custom dual-theme `rocket-takeoff` logos (`src/site/resources/images/logo-light.svg` and `logo-dark.svg`).
  - Added automated TypeScript linters for SCSS WCAG 2.2 AA/AAA contrast (`scripts/lint-scss.ts`), Velocity directive balance (`scripts/lint-velocity.ts`), and documentation version alignment + Keep a Changelog 1.1.0 compliance (`scripts/lint-docs.ts`), enforced alongside the Google TypeScript Style Guide and Google-style TSDoc (`supa/google-tsdoc`).

[Unreleased]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mepcotterell/supa-maven-skin/releases/tag/v0.1.0
