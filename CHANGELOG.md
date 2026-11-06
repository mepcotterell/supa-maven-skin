# Changelog

All notable changes to **Supa Maven Skin** (`io.github.mepcotterell:supa-maven-skin`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-06

### Added

- **Translatable Labels**: Every piece of text the skin writes, about 80 labels from "Skip to content" to the admonition titles, can now be replaced with `<custom><supaSkin><labels>` in `site.xml`, one flat camelCase key per label (`<searchPlaceholder>`, `<backToTop>`, `<admonitionNote>`, ...). Sentences with links or data use placeholders such as `{date}`, `{count}`, and `{query}`. Values are plain text; an empty value keeps the English, and an unknown key, or a label containing markup, is reported once in the browser console. A site rendered in several languages sets each language's labels in its `site_<lang>.xml`. The skin ships no translations of its own, and Bootstrap's own widget text stays English. The full key table is in the configuration reference, and the customizing guide has a how-to.
- **Page Language**: The new `<language>` option (`de`, `pt-BR`, or `pt_BR`) sets `<html lang>` on sites built without Maven's `<locales>`, so screen readers pronounce a non-English site correctly. A locale Maven renders, such as `/fr/`, takes precedence, and a malformed value is ignored.
- **Localized Site Test**: A second Maven Invoker project, `src/it/localized-site`, builds a German default site and a French `/fr/` site and checks their labels and page language.

### Changed

- **One Label per Control**: Each control now uses one text for both its tooltip and its accessible name, so a few English names changed. Examples: "Copy code" instead of "Copy code to clipboard", "Back to top" instead of "Scroll back to top", "Color theme: Auto" instead of "Select color theme (Light / Dark / Auto)", "Color scheme" for the color-scheme menu and the drawer's list, and "Permalink to …" as the permalink tooltip. The sidebar search button is now named by its visible text "Search". The component preview's Show/Hide code toggle no longer has a tooltip, since its text already names it.
- **Search Status Wording**: The search dialog now says "Results: 3" and "No results for “query”", which read the same in any language without plural forms.
- **TOC Toggle Tooltip**: The table of contents toggle's tooltip is now "Toggle table of contents", matching its accessible name, instead of `<tocTitle>`. Sites that translated `<tocTitle>` should also set `<labels><tocToggle>`.
- **Datepicker Language**: Datepicker month and day names follow the page's `<html lang>` instead of the reader's browser language. An author's `data-bs-locale` still wins.

## [0.1.7] - 2026-11-06

### Changed

- **Accessibility Scan Coverage**: `npm run test:a11y` now fails when two elements on a page share an `id`, and adds scenarios for the fixes below: deep links on desktop and phone with and without reduced motion, a reader who scrolls before the page is ready or reloads after scrolling (`deep-link*`), a Markdown link to a heading that starts with a digit (`numbered-heading-link`), the Datepicker's month view (`datepicker-months`), and the printed component showcase (`print-components`). It now scans 151 variants.
- **Shorter README**: The README is now a short introduction for site authors, with badges, screenshots, a brief feature list, the install snippet, and links to the published documentation. The build and test commands moved to a new `CONTRIBUTING.md`.

### Fixed

- **Deep Links Land on Their Heading**: A link to a heading far down a page landed up to about 550px short, because Mermaid diagrams, KaTeX styles, late images, and web fonts changed the layout above the heading after the skin had scrolled. The skin now scrolls to the heading once more after the page has settled, unless the reader has already scrolled, clicked, touched, or typed, and it leaves the browser's restored position alone after a reload or Back.
- **Reduced Motion**: Page scrolls (in-page links, the table of contents, and the back-to-top button) are smooth only when the reader has not asked for reduced motion.
- **Search Links to Repeated Headings**: Search results could link to the wrong heading, or to nothing, when a page repeated a heading text, for example in an `h5` above a repeated `h2`, or when another element already had the heading's ID. Search now computes the same IDs as the page itself. Results for headings marked with a different language (`<span lang="ja">`) now carry that language, as the table of contents already does.
- **Markdown Links to Headings Starting With a Digit**: Doxia rewrites a Markdown link to `#1-install` as `#a1-install`, which no element had, so such links did nothing. The skin now adds that anchor too, after every heading has its ID, so no heading's ID changes.
- **Datepicker Month Names (WCAG 2.5.3)**: The month buttons showed "Jan" but announced "January", so voice-control users could not pick a month by saying what they saw. They are now named by their visible text. A picker created with its own `vcpOptions` keeps the calendar's original labels; see the Datepicker notes in the components reference.
- **State Kept in Printouts**: The active nav pill, the current and disabled pagination links, breadcrumb dividers, checked switches, checkboxes, and radios, range sliders, strength meters, placeholders, and active list-group items now keep the fills that show their state on paper. Dark mode no longer prints heavier shadows, and floating toasts are left out of printouts.
- **Switch and Check Demo**: The forms demo in the components reference used the older `.form-check` and `.form-switch` markup, which Bootstrap 6 leaves as plain checkboxes; it now uses Bootstrap 6's `.switch` and `.check`.
- **Themed Sections Documented**: The customizing guide now says that `data-bs-theme` on part of a page, or the Datepicker's `datepickerTheme` option, does not recolor the skin's or Bootstrap's colors there.

## [0.1.6] - 2026-11-05

### Fixed

- **Datepicker Calendar Contrast**: The open calendar faded days outside the shown month to 50% opacity, as low as 3.3:1 in the light palettes and 5.3:1 in `modus` dark, and days inside a selected range to 80% (4.4:1 in `furo` light). Both are clickable, so days outside the month now use the muted text color at full opacity, and days inside a range keep their full selected colors. Both meet AA (`furo`, `bootstrap`) or AAA (`modus*`). Disabled days now fade to 50%, which is allowed for controls that cannot be used, so they still look different from the muted days that can be picked. The calendar's `color-scheme` now follows the page's after a switch out of Auto mode rather than the operating system's; no calendar color depends on it today. The new `datepicker-open` scenario scans the calendar in all 12 palette and polarity variants, `datepicker-range-switched` scans a range picker after a switch out of Auto mode, and the contrast linter checks the calendar's colors (now 2,496 pairs).
- **Search on Multi-Language Sites**: A site rendered in several locales (`<locales>default,fr</locales>`) shared one cached search index between `/` and `/fr/`, so results could show the other language's titles and link into its pages. The cache is now kept per language and site root, which also separates a module site from its parent, and cached entries no longer store display text.
- **Table of Contents Landmark Name**: The table of contents region is now named by `<tocTitle>`, like its navigation, instead of always "On this page".
- **Color-Scheme Button Name**: The color-scheme button announced "Accessible color scheme: Furo Default (AA)" while showing "Furo (AA)", so voice-control users could not activate it by saying what they see (WCAG 2.5.3, Level A). Its name and tooltip are now "Color scheme: Furo (AA)", matching the visible text. Before scripts run, the button, the color-scheme menu, and the drawer's color-scheme list now all start on the configured `<colorScheme>` instead of Furo. `npm run test:a11y` checks this on every unscoped scan.
- **Heading Anchors in Every Script**: Heading anchors dropped every non-ASCII letter, so "Überblick" became `#berblick` and headings in Japanese, Chinese, Cyrillic, Greek, or Hindi became `#section`, `#section-2`, and so on. Anchors now keep letters and digits from every script (`#überblick`, `#概要`), and Markdown links to them work even though Doxia rewrites their fragments. Links to the affected headings change once; the troubleshooting guide lists the old and new forms. Anchors of ASCII headings are unchanged, except that on a page mixing both kinds, a repeated ASCII heading's `-2` suffix can shift. Links to these headings, and to Doxia's own anchors in front of every heading, now land with the same gap below the header as a link to an ASCII heading. Table of contents entries now keep a heading's language (`lang`), and a malformed `#` fragment such as `#100%` no longer stops the table of contents from building.

## [0.1.5] - 2026-11-05

### Added

- **Print Styles**: Printing a page, or saving it as PDF, now prints only the article. The sidebar, TOC, drawers, headers, search, color-scheme and theme controls, previous/next cards, back-to-top button, copy buttons, and heading permalinks are left out; the copyright line stays. Every page prints in the active color scheme's light polarity, even in dark mode or Auto mode with a dark operating system, so text never prints light on white paper. Long code lines and table cells wrap instead of being cut off, external links print their URL after the link text, and the browser avoids breaking inside code blocks, admonitions, alerts, figures, and table rows. See "Adjusting the Printed Page" in the customizing guide.
- **Print and Lazy-Widget Accessibility Scenarios**: `npm run test:a11y` now prints `index.html` and `kitchen-sink.html` with backgrounds dropped, as browsers print them, in explicit light and dark mode and in Auto mode with a dark operating system, and checks the printed layout and contrast. It also opens the Combobox on `components.html`, which proves an on-demand widget script loads and initializes in a real browser.
- **README Screenshots**: The README shows the desktop layout, the phone layout with its drawer open, and all six color schemes, each in the light or dark version that matches the reader's GitHub theme. `npm run screenshots` (`scripts/screenshots.ts`) regenerates them from the built self-site.

### Changed

- **On-Demand Bootstrap Widgets**: The scripts for the Bootstrap 6 widgets only author content uses (`Carousel`, `Chips`, `Combobox`, `Datepicker`, `NavOverflow`, `OtpInput`, `Range`, `Strength`, `Tab`, and the Component Playground) now ship as separate `js/supa-maven-skin-<name>.min.js` files in the skin JAR and load only on pages whose markup contains them. The main script drops from 100.5 KiB to 68.6 KiB gzipped. These plugins appear on `window.bootstrap` only on pages that load them, and `data-supa-ready` is set once their scripts have loaded. Widget markup that a script adds after the page starts does not load its widget's script; the customizing guide describes the workaround.
- **Dark CSS Variables on Screen Only**: `<darkCssVariables>` overrides now apply only on screen, since printed pages use the light polarity.
- **Bundle Size Budgets**: The size check now budgets the JS entry (73 KiB gzipped) and the on-demand chunks together (42 KiB), and fails if a script in `js/` is not covered by a budget.
- **Build Dependencies**: Updated eslint to 10.14.0, postcss to 8.5.32, sass-embedded to 1.107.1, typescript-eslint to 8.72.1, and vite to 8.3.6. The built CSS is byte-identical.

## [0.1.4] - 2026-11-04

### Added

- **AAA Contrast in the Accessibility Scan**: `npm run test:a11y` now also runs axe's `color-contrast-enhanced` (7:1) rule on every `modus*` page scan and interaction scenario, and fails if a palette's `--supa-wcag-level` disagrees with that list. New scenarios hover sidebar links, search results, and Bootstrap components. Before each check, the scan waits for CSS transitions to finish, so it measures settled colors instead of a frame mid-fade.
- **Navigation and Control State Tokens**: `--supa-nav-hover-fg`, `--supa-nav-active-fg`, `--supa-nav-active-bg`, `--supa-search-mark-fg`, `--supa-search-mark-bg`, `--supa-bg-active`, and `--supa-chip-selected-hover-opacity` set the colors of hovered and current sidebar links, search highlights, and hovered or toggled-on unthemed buttons and chips. They default to the previous colors and are documented in the Configuration Reference.

### Changed

- **Contrast Linter Coverage**: `scripts/lint-scss.ts` now also checks sidebar links at rest, hovered, and current; the TOC's current section; the active search result and search highlights; and, for every Bootstrap 6 theme, solid, outline, subtle, and text buttons, links, chips, and nav and list-group items at rest, hovered, and toggled on. It now checks 2,400 pairs, up from 732.
- **Hovered Text and Subtle Buttons in Dark Mode**: In every palette's dark polarity, themed text and subtle buttons keep their resting text color when hovered or toggled on. Bootstrap darkens that text, which lowers contrast on a dark fill. A toggled-on solid button now darkens its fill to `l * 0.9`, matching Bootstrap's toggled-on outline button, instead of `l * 0.88`.

### Fixed

- **Remaining Modus AAA Failures**: In the four `modus*` palettes, these now meet 7:1: the current page in the sidebar (5.94–6.97:1 before), hovered sidebar links and the active search result, solid `secondary` buttons, badges, and avatars in dark mode (5.84:1), active outline buttons (5.39:1), hovered unthemed buttons and chips, hovered chips and nav or list-group items, and hovered selected chips. New colors come from the Modus Vivendi palettes where one had to change; `furo` and `bootstrap` tokens are unchanged.
- **Search Highlights**: Highlighted matches in search result titles were brand-colored text on a brand tint, as low as 3.8:1 in `furo` dark. They now use the main text color.
- **Dark Hover States in Furo and Bootstrap**: Hovered `secondary` and `accent` text buttons (3.48–4.06:1), hovered `inverse` chips (1.31:1), and hovered `secondary` chips and nav items (3.1:1) now meet AA.
- **Disabled Pagination Links**: Doxia strips `aria-*` and `tabindex` from raw HTML in Markdown pages, so disabled pagination links were announced as ordinary links. The skin now adds `aria-disabled="true"` and `tabindex="-1"` to `.page-item.disabled > .page-link` when the page loads.

## [0.1.3] - 2026-11-04

### Added

- **Interactive-State Accessibility Scan**: `npm run test:a11y` now also scans the skin's interactive chrome in its open state. That covers the search dialog (empty and with an active result), the sidebar drawer at 390×844, the TOC drawer below `xl`, the color-scheme and theme menus in every placement, a copy button's tooltip and its "Copied!" state, a re-expanded sidebar group, and an expanded accordion and switched tab on `components.html`. It runs in `furo` light/dark and `modus` dark. Each scenario checks that it really reached its state, so a broken selector fails the run instead of scanning a closed state. Append page or scenario names (`npm run test:a11y -- palette-menu`) to narrow a run.

### Changed

- **Drawer Color-Scheme Picker**: Below 1024px, the color-scheme control in the sidebar drawer's Appearance footer is now a native `<select>`. The menu it replaces opened upward over the navigation tree and left slivers of links tappable under its edges (WCAG 2.5.8). The content-header menus are unchanged.

### Fixed

- **Links on Pages in Subdirectories**: Sidebar, breadcrumb, previous/next, and relative `<navIcons>` links are now resolved for the directory of the page being rendered, as in Fluido. Before, a menu item `faq.html` on `guides/install.html` pointed to the missing `guides/faq.html`, and the current page was not highlighted. Search results now work whichever page built the cached index, and pages outside the site root that the sidebar links to (such as a parent site from `<menu ref="parent">`) are still indexed. The Fluido migration guide no longer lists this as a limitation.
- **Contrast Linter Checked Nothing**: `scripts/lint-scss.ts` looked for `[data-supa-palette="furo"]`, but Dart Sass writes that selector without quotes, so since 0.1.0 the audit matched no palette and passed every color. It now reads each palette's tokens from the compiled CSS, as the browser applies them, and also checks text, link, and icon colors on admonition title bars, admonition bodies, and `.alert.theme-*` surfaces. Translucent tints are blended over the surface beneath before measuring.
- **Modus AAA Contrast**: The corrected audit found pairs below 7:1 in all four `modus*` palettes, including links in custom admonition titles and in alerts. In dark mode, the note, tip, and warning title bars are darker with the same hue, the brand color is Modus Vivendi `blue-cooler` (`#00bcff`), and the caution accent is `red-faint` (`#ff9580`). The `modus-deuteranopia` tip accent is now `#82b0ec`, `.theme-secondary` uses the muted text on the secondary surface, and the light `.theme-inverse` surface in `modus-tritanopia` uses the item surface. `furo` and `bootstrap` are unchanged.
- **Color-Scheme Menu Headers**: The "WCAG 2.2 AA Standard" and "WCAG 2.2 AAA High Contrast" headers inside the color-scheme menu are hidden from assistive technology, because a `role="menu"` may only contain menu items (WCAG 4.1.2). Every option name already states its level.
- **Back-to-Top Button Under Reduced Motion**: With `prefers-reduced-motion: reduce`, the button appears without its slide and fade, so it is never shown half-faded below the contrast minimum.

## [0.1.2] - 2026-11-04

### Fixed

- **`<headingPermalinks>false</headingPermalinks>` Had No Effect**: The TOC script read a `<body>` attribute (`data-supa-heading-permalinks`) that `site.vm` never emitted, so headings always got permalink anchors. It now reads `data-supa-permalinks`, and a unit test checks that every `data-supa-*` attribute the enhancers read from `<body>` is emitted by `site.vm`.
- **Copy Button Reported Copies That Did Not Happen**: When the Clipboard API is missing (pages served over plain HTTP from a host other than `localhost`) or denied, the code-block copy button still showed "Copied!". It now falls back to `document.execCommand('copy')`, shows "Copied!" only when a copy succeeded, and otherwise shows "Copy failed" with a cross icon. The fallback also works in code blocks inside modal dialogs and drawers, and keyboard focus returns to the button.
- **Double-Escaped Admonition and Alert Titles**: Custom titles on GFM admonitions (`> [!TIP] Colors & Brands`) and `> [!ALERT:...]` headings rendered entities and inline markup as literal text (`&amp;`, `<code>`). They now render as written, including code spans and emphasis. Unlabeled synced tabs now infer their label from the fenced code block only, so inline code in an admonition title or in prose cannot change the label.

## [0.1.1] - 2026-11-03

### Added

- **Rendered-Page Accessibility Checks**: `npm run test:a11y` runs axe-core (WCAG 2.0/2.1/2.2 A & AA) in Playwright Chromium against the built self-site: every page in `furo` light/dark, `index.html` in all 12 palette × polarity variants and at a 390×844 phone viewport. It uses the new exact-pinned `playwright` and `@axe-core/playwright` devDependencies and runs in CI on the JDK 21 leg before snapshot publishing. It is not part of `npm test` or `mvn verify`, so neither consumer sites nor `mvn verify` need a browser.
- **`html[data-supa-ready]` Signal**: `initSupaSkin()` sets `data-supa-ready="true"` on `<html>` once every enhancer, including the lazy Mermaid/KaTeX loaders, has settled (also when a load fails). The Customizing guide shows how a consumer script can wait for it.
- **Keyboard-Scrollable Code and Tables**: Overflowing `.supa-code-block > pre` and `.supa-table-responsive` regions get `tabindex="0"` and a focus ring while they overflow, so keyboard users can scroll them (WCAG 2.1.1). An author's own `tabindex` is never changed.
- **Bundle Size Budget**: `npm run build`, and therefore `mvn verify`, now runs `scripts/check-bundle-size.ts`, which reports the raw and gzip size of `supa-maven-skin.min.css` and `supa-maven-skin.min.js` and fails the build when either exceeds its gzip budget (80 KiB CSS, 104 KiB JS).
- **Self-Hosting & CSP Guidance**: The Authoring Guide has a new self-hosting recipe for Mermaid and KaTeX that works on pages in subdirectories (use root-relative or absolute URLs), and the Configuration Reference lists the Content Security Policy origins to allow.
- **Customizing Guide (`customizing.md`)**: New How-To page on layering consumer CSS (`css/site.css`), `<body><head>` content with `$relativePath`, and design-token overrides (global, per polarity, per color scheme) on top of Supa Maven Skin. Also covers logos and favicons, page furniture, stable selector hooks, and contrast caveats.
- **Fluido Migration Guide (`migrating-from-fluido.md`)**: New How-To page for moving a site from Apache Maven Fluido Skin 1.x/2.x. It covers toolchain prerequisites (including the Site 2.0.0 banner rewrite), a `<fluidoSkin>` → `<supaSkin>` option mapping, how Supa Maven Skin renders each `site.xml` element, pages in subdirectories, Bootstrap v2.3.2 markup replacements, and a verification checklist.
- **Troubleshooting Guide (`troubleshooting.md`)**: New How-To page with symptom, cause, and fix entries for site authors. It covers `file://` previews, stale search caches, Velocity pitfalls in `.md.vm` pages (vanishing `##` headings, C preprocessor lines that fail the build), CommonMark HTML blocks, admonition markers, icon shortcodes, syntax highlighting, heading anchors, theme and palette persistence, Mermaid and KaTeX loading and self-hosting, responsive drawers, search coverage, and `css/site.css` placement.

### Changed

- **CI / Release Workflows**: Switched `actions/setup-java` from the deprecated `server-username` / `server-password` inputs to `server-username-env-var` / `server-password-env-var` in `.github/workflows/ci.yml` and `release.yml`.
- **Sidebar Parent Links**: A linked parent item (`li.has-link`) now renders its `<a>` before its `<details>` element, and the `<summary>` holds only the chevron (`aria-label="<name> section"`). Before, the link sat inside `<summary>`, which nested two interactive controls (WCAG 4.1.2). The current page's parent link also gets the same active background as leaf links. Custom CSS that targets `.supa-nav-summary .supa-nav-link` on linked parents needs updating.
- **`<html lang>` Format**: The page language now comes from `Locale.toLanguageTag()`, so regional locales render as BCP 47 tags (for example `pt-BR`).
- **CDN Override Loading**: `<mermaidCdnUrl>` and `<katexJsCdnUrl>` values that are ES modules (`.mjs`, jsDelivr `/+esm`, or `esm.sh`) still load with `import()`. Other URLs load as a classic `<script>`, fall back to `import()` if they define no library global, and a classic `auto-render(.min).js` URL loads `../katex.min.js` first. The built-in defaults are defined once in `optional.ts`, so `site.vm` emits `data-supa-*-url` attributes only for overrides.
- **Getting Started Preview Step**: Recommends previewing over HTTP (`mvn site:run`) instead of opening `target/site/index.html` from disk, which skips the skin's JavaScript.
- **Docs Version Linter (`scripts/lint-docs.ts`)**: Skin `<version>` snippets (raw, HTML-escaped or `+` diff lines, including ones with an XML comment before `<version>`), `vX.Y.Z` badges, "Version X.Y.Z" example copy and `<latest-release.version>` in `pom.xml` must now equal the newest `## [x.y.z] - YYYY-MM-DD` release heading in `CHANGELOG.md`. A release commit (pom version without `-SNAPSHOT`) must add its own dated heading and bump all of these. A `-SNAPSHOT` of the skin (the pom version, or one sharing its base version with the latest release or the pom, or on a line naming the skin) may not appear in `README.md` or `src/site/`, while other projects' SNAPSHOT versions remain allowed in prose, and malformed release headings are reported.

### Fixed

- **Third-Party License Notices**: `META-INF/THIRD-PARTY-LICENSES.txt`, `META-INF/licenses/`, and the `/*! ... */` bundle banners now cover every npm package compiled into the bundles. The 0.1.0 JAR shipped Bootstrap 6's peer dependencies `vanilla-calendar-pro`, `@floating-ui/dom`, `@floating-ui/core`, and `@floating-ui/utils` (all MIT) inside `js/supa-maven-skin.min.js` without their notices. The build now fails when a bundled package is missing from the license manifest (`scripts/bundled-licenses.ts`), and each notice names the installed version that was compiled in.
- **Footer Links Underlined**: Inline links in the copyright line, custom `<body><footer>` content from `site.xml`, and the "Built with" credit are now underlined so they stand out from muted footer text by more than color alone (WCAG 1.4.1).
- **Missing Page Language**: `<html lang>` now falls back to `en` when `maven-site-plugin` renders the default (ROOT) locale, instead of an empty `lang=""` (WCAG 3.1.1).
- **Search Trigger Label in Name**: The sidebar search button is named "Search documentation", exposes its shortcuts via `aria-keyshortcuts`, and draws the `⌘K` hint with CSS so the visible label matches the accessible name (WCAG 2.5.3).
- **Tablist Roles**: The "Hide code" toggle in component examples and the playground now sits beside the tablist instead of inside it, so tablists contain only tabs (WCAG 4.1.2).
- **Team Report Avatars**: Gravatar images that `maven-project-info-reports-plugin` emits without `alt` are marked decorative (`alt=""`) (WCAG 1.1.1).
- **Install Snippets Show the Released Version**: Install snippets, badges and example copy in `README.md` and `src/site/` now show the latest release on Maven Central. Before, they showed the development `-SNAPSHOT`, which consumer builds cannot resolve. The landing-page Quickstart (`index.md.vm`) reads the version from the new `<latest-release.version>` POM property.
- **Self-Site Menu Anchors**: The "Markdown vs. Velocity", "Full site.xml Example", and "Velocity Macros" menu links now use the heading ids the skin actually generates (the slugifier drops `.`), so they land on their sections.

### Security

- **Pinned, Integrity-Checked Mermaid & KaTeX Defaults**: Mermaid now loads from an exact version (`mermaid@11.17.2`) instead of the floating `mermaid@11` major, and the KaTeX defaults move from `katex@0.16.21` to `katex@0.16.47`. Both switch from ES modules (`mermaid.esm.min.mjs`, `contrib/auto-render.mjs`) to classic single-file builds (`mermaid.min.js`, `katex.min.js` + `contrib/auto-render.min.js`) and a stylesheet, loaded with `sha384` Subresource Integrity and `crossorigin="anonymous"`, so every byte that runs is verified. Sites that override only one of `<katexCssCdnUrl>` / `<katexJsCdnUrl>` should keep both on the same KaTeX version.

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

[Unreleased]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.7...v0.2.0
[0.1.7]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/mepcotterell/supa-maven-skin/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mepcotterell/supa-maven-skin/releases/tag/v0.1.0
