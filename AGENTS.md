Supa Maven Skin (`io.github.mepcotterell:supa-maven-skin`) is a modern, responsive, accessible three-column documentation skin for **Apache Maven Site Plugin 3.21.0+** and **Maven Doxia 2.0+ (`2.2.0`)**, built with **Bootstrap 6 (`6.0.0-alpha.1`)**, **Bootstrap Icons**, **TypeScript**, and **Vite**.

Here are the four pillars we never compromise on:

### 1. Accessibility without compromise (WCAG 2.2 AA/AAA)
Supa ships with 6 built-in accessible color schemes (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, and `modus-tritanopia`) across both `light` and `dark` polarities (12 theme variants). Every semantic color token, and every text, link, and icon color on the admonition and `.alert.theme-*` surfaces, the sidebar, TOC, and search-result states, and every Bootstrap 6 component with and without a theme, at rest, hovered, and toggled on (translucent tints and faded elements composited over what lies beneath), is audited automatically at build time by `scripts/lint-scss.ts` against WCAG 2.2 AA (4.5:1 for `furo` and `bootstrap`) and AAA (7.0:1 for the four `modus*` schemes), and the rendered self-site is scanned with axe-core by `npm run test:a11y`, which also enforces axe's AAA `color-contrast-enhanced` rule on every `modus*` scan. Changes that regress contrast or keyboard/screen-reader navigation do not ship.

### 2. Zero-config Doxia 2.0 compatibility
Standard Maven documentation (`.md`, `.apt`, `.xdoc`, `.fml`) and `maven-project-info-reports-plugin` reports must render cleanly out of the box without requiring custom HTML. Progressive enhancements—GitHub-style markdown alerts (`> [!NOTE]`), `#bi` Velocity icon macros, synchronized tab groups, and opt-in KaTeX math and Mermaid diagrams—layer onto Doxia's output without breaking standard Maven sites.

### 3. Self-contained skin artifact
The entire skin packages into a single JAR containing `META-INF/maven/site.vm`, `META-INF/maven/site-macros.vm`, `META-INF/maven/skin.xml`, `META-INF/LICENSE`, `META-INF/THIRD-PARTY-LICENSES.txt`, `META-INF/licenses/LICENSE-*.txt`, and Vite-bundled assets (`css/supa-maven-skin.min.css`, `js/supa-maven-skin.min.js`, and `css/fonts/bootstrap-icons.woff2`). Consumer projects never need Node.js or a frontend build step to generate their Maven site.

### 4. Fast, deterministic verification
Frontend changes verify in seconds via `npm run lint`, `npm test`, and `npm run build`, backed by an end-to-end Maven Invoker integration test (`src/it/sample-site`) that builds a real multi-page site with the packaged skin JAR and asserts the rendered HTML via `verify.bsh`.

## A note on design philosophy
Prefer simple, direct solutions that work with Doxia 2.0 and Bootstrap 6 (`6.0.0-alpha.1`) rather than fighting them. Keep Velocity templates declarative, SCSS token-driven, and TypeScript enhancements resilient to missing DOM nodes. Fight scope creep and honor the maintainer's intent in a minimal, realistic fashion.

Think of these instructions as strong defaults. Explicit instructions from the maintainer override anything here.

## A small glossary
Use this shared vocabulary when communicating and navigating the repo:

- **you** means the coding agent reading this file and working on Supa Maven Skin.
- **skin** means the packaged Maven artifact (`io.github.mepcotterell:supa-maven-skin`) consumed by `maven-site-plugin`.
- **consumer site** means any downstream Maven project declaring Supa Maven Skin in its `src/site/site.xml`.
- **self-site** means this repository's own documentation site under `src/site/`, rendered into `target/site/`.
- **sample-site** means the Maven Invoker integration test project in `src/it/sample-site/`, verified by `src/it/sample-site/verify.bsh`.
- **polarity (`theme`)** means the light/dark mode (`light`, `dark`, or `auto`), stored on `html[data-bs-theme]` and persisted in `localStorage['supa-theme']`.
- **color scheme (`palette`)** means one of the 6 accessible palettes (`furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, `modus-tritanopia`), stored on `html[data-supa-palette]` and persisted in `localStorage['supa-palette']`.
- **synthetic href** means a root-relative report link emitted by Doxia (such as `/project-info.html` or `/summary.html`) that must be relativized by `#supaResolveHref` in Velocity and `normalizeSyntheticReportHref()` in `search.ts`. Every other relative `site.xml` href is also relative to the site root, and `#supaResolveHref` rewrites it for the directory of the page being rendered (`$relativePath`).

## The five ways to hurt yourself
1. **Editing `target/classes/` or `target/site/` directly.** Vite writes compiled assets to `target/classes/css/` and `target/classes/js/`, and `maven-site-plugin` renders HTML into `target/site/`. Any manual edits in `target/` are overwritten on the next build. Always edit sources under `src/` and rebuild.
2. **Renaming the `'furo'` palette ID.** The skin's CSS classes (`.supa-*`), CSS custom properties (`--supa-*`), data attributes (`data-supa-*`), and DOM IDs (`#supa*`) use the `supa` prefix, **but the default Sphinx Furo color scheme ID is `'furo'`** (`[data-supa-palette="furo"]`, `<colorScheme>furo</colorScheme>`). Never rename the `'furo'` scheme ID to `'supa'`.
3. **Guessing dependency or artifact versions instead of reading `pom.xml` and `package.json`, or leaving `CHANGELOG.md` stale.** This project targets **Bootstrap 6 (`6.0.0-alpha.1`)**. Always treat `pom.xml` and `package.json` as the single sources of truth for version information, update `CHANGELOG.md` under `## [Unreleased]`, and run `npm run lint:docs` (`scripts/lint-docs.ts`) to verify version alignment and changelog compliance across `README.md`, `AGENTS.md`, `CHANGELOG.md`, and `src/site/`. Skin install snippets, `vX.Y.Z` badges, and "Version X.Y.Z" example copy show the **latest released** version (the newest `## [x.y.z] - YYYY-MM-DD` heading in `CHANGELOG.md`), and no `-SNAPSHOT` appears in `README.md` or `src/site/`.
4. **Breaking Velocity directive balance or Doxia `<pre>` blocks.** Velocity parses `#if`/`#else`/`#end` tokens strictly (even inside certain comment forms). Run `npm run lint:vm` after editing `.vm` files. In TypeScript (`code.ts`), always skip Highlight.js when a `<pre>` block contains child elements (such as `<pre><a class="externalLink">` generated by Doxia's `verbatimLink`), or Highlight.js will log unescaped HTML warnings and clobber the link.
5. **Killing processes by pattern.** Never run `pkill -f`, `pgrep | kill`, or kill a PID matched by worktree path. If you start a local HTTP server to preview `target/site/`, record the exact PID you spawned and stop only that PID.

## Hit every surface
A change that only updates one layer often leaves Velocity, SCSS, TypeScript, tests, or documentation out of sync. Before calling a task done, walk this list:

- **Velocity templates (`src/main/resources/META-INF/maven/`)** — `site.vm` and `site-macros.vm` own the HTML skeleton, `<head>` anti-FOUC inline script, `#bi` and `#supa*` macros, and `<custom><supaSkin>` configuration reading (with `<custom><furoSkin>` retained as a legacy fallback).
- **SCSS (`src/main/frontend/scss/`)** — `_variables.scss` defines color tokens for all 6 palettes × 2 polarities; `_bootstrap-supa.scss` bridges them to Bootstrap 6 `--bs-*` and `light-dark()` tokens; `_layout.scss`, `_sidebar.scss`, `_toc.scss`, and `_content.scss` style the 3-column layout and Doxia output.
- **TypeScript (`src/main/frontend/ts/`)** — `index.ts` boots modular enhancers (`theme.ts`, `doxia.ts`, `code.ts`, `toc.ts`, `search.ts`, `bootstrap-components.ts`, `optional.ts`). Every enhancer must safely no-op when its target elements are absent.
- **Tests (`src/test/frontend/supa.test.ts` & `src/it/sample-site/verify.bsh`)** — Unit tests run in Vitest + JSDOM; integration assertions in `verify.bsh` inspect the real HTML rendered by `maven-site-plugin`.
- **Documentation, Changelog & Version Alignment (`README.md`, `CHANGELOG.md`, `AGENTS.md`, & `src/site/`)** — **Mandatory:** `README.md`, `CHANGELOG.md`, and `src/site/` (`src/site/site.xml` and `src/site/markdown/*.md*`) must always stay up-to-date with the codebase, and every version number stated in `README.md`, `CHANGELOG.md`, `AGENTS.md`, or `src/site/` must align with `pom.xml` and `package.json`.

## Documentation
`README.md`, `CHANGELOG.md`, and `src/site/` are first-class deliverables of this repository—`src/site/` is rendered with the skin itself as both user documentation and the live visual showcase, and `.github/workflows/release.yml` extracts release notes directly from `CHANGELOG.md`.

- **Refer to the project as "Supa Maven Skin" in documentation prose.** Reserve the artifact slug strictly for XML `<artifactId>supa-maven-skin</artifactId>` tags, Maven coordinates (`io.github.mepcotterell:supa-maven-skin`), repository URLs, and asset filenames (`supa-maven-skin.min.css`, `supa-maven-skin.min.js`, `supa-maven-skin.jar`).
- **Keep `CHANGELOG.md` updated.** Every user-facing, authoring, configuration, accessibility, or build/toolchain change must record an appropriate entry under `## [Unreleased]` in `CHANGELOG.md` using [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) categories (`### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`).
- **Keep `README.md` and `src/site/` synchronized.** Any change to `<custom><supaSkin>` options, color schemes, Velocity macros (`#bi`, `#bs*`, `#supa*`), CSS custom properties, `.supa-*` component classes, or build commands must be reflected in `README.md` and `src/site/markdown/` before the task is complete.
- **Keep version numbers aligned with `pom.xml` and `package.json`.** Whenever dependency, plugin, or artifact versions are stated in `README.md`, `CHANGELOG.md`, `AGENTS.md`, or `src/site/` (or bumped in `pom.xml` / `package.json`), verify that all documentation references match `pom.xml` (`<version>`, `<bootstrap.version>`, `<maven-site-plugin.version>`, `<doxia.version>`, `<maven-project-info-reports-plugin.version>`) and `package.json` (`version`, `bootstrap`, `bootstrap-icons`, `highlight.js`, `vite`, `vitest`). Exception: Supa Maven Skin's own `<version>` in install snippets (raw or HTML-escaped), badges, and example copy in `README.md` and `src/site/` must equal the newest dated release heading in `CHANGELOG.md`, and `.md.vm` pages read it from the `<latest-release.version>` POM property (`${project.properties.getProperty("latest-release.version")}`); `src/site/site.xml` keeps `${project.version}` so the self-site renders with the skin built in the same reactor. A release commit (non-SNAPSHOT pom) must add the matching `## [x.y.z] - YYYY-MM-DD` heading with the `## [Unreleased]` entries moved under it, and bump `<latest-release.version>`, every snippet, badge, and example copy to match. `scripts/lint-docs.ts` enforces this automatically during `npm run lint`.
- **Preserve the Diátaxis structure in `src/site/markdown/`:**
  - **Overview:** `index.md.vm` — landing page, feature highlights, and quick navigation.
  - **Tutorial:** `getting-started.md` — step-by-step guide to configuring a new Maven site from scratch.
  - **How-To Guides:** `authoring-guide.md` — task-oriented recipes for alerts, `#bi` icons, code blocks, synced tabs, accordions and steppers, Mermaid, and KaTeX; `customizing.md` — consumer CSS, `<head>` content, and design-token overrides; `migrating-from-fluido.md` — moving a site from Apache Maven Fluido Skin; `troubleshooting.md` — symptom → cause → fix entries for site authors.
  - **Reference:** `configuration.md` (`<supaSkin>` options, palettes, CSS variables, Velocity macros), `components.md` (interactive Bootstrap 6 showcase), and `kitchen-sink.md` (Doxia stress test).
  - **Explanation:** `architecture.md` — build pipeline, anti-FOUC theme engine, WCAG 2.2 contrast enforcement, and Doxia normalization design.

## Dev, testing, and verification loops
- **Fast inner loop (~3s):**
  - `npm run lint` — runs ESLint (`lint:ts`), the WCAG 2.2 AA/AAA SCSS token & contrast linter (`lint:scss`), the Velocity template linter (`lint:vm`), and the documentation & changelog linter (`lint:docs`).
  - `npm test` — runs Vitest unit tests (`src/test/frontend/supa.test.ts`) in JSDOM.
  - `npm run build` — runs `tsc --noEmit`, bundles CSS/JS/fonts via Vite into `target/classes/`, then runs the gzip size budget check (`check:size`, `scripts/check-bundle-size.ts`), so `mvn verify` fails on a bundle size regression. Raise a budget only deliberately, in the `BUDGETS` constant of that script.
- **Full Maven verification & site build (~20–30s):**
  - `mvn -B -ntp clean verify site` — executes the Vite build, Checkstyle, all four linters, Vitest unit tests, packages the skin JAR, runs `maven-invoker-plugin` against `src/it/sample-site` (`verify.bsh`), and generates the project's own documentation site in `target/site/`.
  - Run `mvn -B -ntp clean verify site` before finishing any change that touches Velocity templates, build configuration, or site documentation.
- **Rendered-page accessibility (~30s, needs Chromium):**
  - `npm run test:a11y` — serves the already-built `target/site/` in-process and runs axe-core (WCAG 2.0/2.1/2.2 A & AA tags) in Playwright Chromium on every top-level page (`furo` light/dark), `index.html` in all 12 palette × polarity variants, and `index.html` at a 390×844 viewport. Every `modus*` job, page scans and interaction scenarios alike, also runs axe's AAA `color-contrast-enhanced` rule (7:1), the only AAA rule enabled, and fails if the palette's declared `--supa-wcag-level` disagrees with `AAA_PALETTES`. It then scans the interaction scenarios in `SCENARIOS` (`furo` light/dark and `modus` dark, unless a scenario lists its own `variants`): the search dialog (empty, and with highlighted matches in titles and an active result), the sidebar drawer at 390×844, the TOC drawer below `xl`, the color-scheme and theme menus in the content header, the mobile header, and the sidebar drawer, a focused copy button's tooltip, a copy button and its tooltip showing "Copied!", a re-expanded sidebar group, an expanded accordion and switched tab on `components.html`, and, in `furo` light/dark, `modus` light/dark, and `modus-tinted` dark, a hovered themed chip, chip-input chip, and text button there (each scan scoped to the hovered component). Each scenario asserts its state before and after the scan, so a broken selector fails the run instead of scanning the closed state, and every scan first waits for running CSS transitions to finish, so axe measures settled colors; add a scenario when you add or restyle interactive chrome. Build the site first and run `npx playwright install chromium` once. Append page or scenario names (`npm run test:a11y -- palette-menu`) to narrow the run. It is intentionally outside `npm test` and the Maven build (CI runs it on the JDK 21 leg); run it after any change to Velocity markup, SCSS, or TypeScript enhancers. Fix violations in the skin rather than excluding rules.
- **Proof for bug fixes:**
  - Logic, DOM transformation, search indexing, and theme/palette bugs get a focused unit test in `src/test/frontend/supa.test.ts` (or an assertion in `src/it/sample-site/verify.bsh` for Velocity template bugs) alongside the fix.

## How it works
During `mvn site`, `maven-site-plugin` (`3.21.0+`) parses the project's `pom.xml`, `src/site/site.xml`, and Doxia documents (`.md`, `.apt`, `.xdoc`, `.fml`), then evaluates `META-INF/maven/site.vm` and `site-macros.vm`. An inline script in `<head>` immediately resolves the active polarity (`data-bs-theme`) and color scheme (`data-supa-palette`) before first paint to prevent FOUC. Once the DOM loads, `initSupaSkin()` in `src/main/frontend/ts/index.ts` normalizes Doxia tables/anchors/alerts (`doxia.ts`), highlights code blocks and adds copy buttons (`code.ts`), initializes sticky ScrollSpy TOC (`toc.ts`), indexes pages for client-side Ctrl/Cmd+K search (`search.ts`), wires interactive Bootstrap 6 widgets and synced tabs (`bootstrap-components.ts`), and lazily initializes opt-in libraries (`optional.ts`).

Full pipeline details and design rationale: [`src/site/markdown/architecture.md`](src/site/markdown/architecture.md). Configuration and token reference: [`src/site/markdown/configuration.md`](src/site/markdown/configuration.md).

## Where code lives
- `README.md` — repository overview, feature summary, quick-start `site.xml` snippet, and build commands.
- `CHANGELOG.md` — Keep a Changelog 1.1.0 release history and `## [Unreleased]` change tracking, parsed by `.github/workflows/release.yml` when publishing GitHub Releases.
- `src/main/resources/META-INF/maven/` — `site.vm` (main layout template), `site-macros.vm` (reusable Velocity macros `#bi`, `#bs*`, and `#supa*`), and `skin.xml`.
- `src/main/frontend/scss/` — `_variables.scss` (6 palettes × 2 polarities), `_bootstrap-supa.scss`, `_layout.scss`, `_sidebar.scss`, `_toc.scss`, `_content.scss`, and `main.scss`.
- `src/main/frontend/ts/` — TypeScript modules (`index.ts`, `theme.ts`, `doxia.ts`, `code.ts`, `toc.ts`, `search.ts`, `bootstrap-components.ts`, `optional.ts`).
- `src/main/frontend/vite.config.ts` — Vite bundler, `META-INF/` license bundler plugin (fails the build when a bundled npm package is missing from `scripts/bundled-licenses.ts`), and Vitest configuration.
- `package.json` — `@floating-ui/dom` and `vanilla-calendar-pro` have no imports under `src/` but are required: they are Bootstrap 6 peer dependencies imported by the bundled `Tooltip`/`Popover`/`Menu` and `Datepicker` plugins. Keep them declared so the build does not depend on npm auto-installing peers; with `--legacy-peer-deps`, or whenever they are not installed, Vite fails to resolve their imports.
- `scripts/` — `lint-scss.ts` (SCSS syntax + WCAG 2.2 AA/AAA contrast verifier), `contrast-audit.ts` (the `SURFACE_AUDITS` surface/foreground list and the compiled-CSS token resolver `lint-scss.ts` audits with), `lint-velocity.ts` (Velocity directive/macro linter), `lint-docs.ts` (documentation version-alignment & `CHANGELOG.md` verifier), `check-bundle-size.ts` (CSS/JS gzip size budget check), `bundled-licenses.ts` (third-party license manifest and coverage check used by `vite.config.ts`), and `a11y-check.ts` (Playwright + axe-core rendered-page WCAG checks behind `npm run test:a11y`).
- `src/test/frontend/supa.test.ts` — Vitest + JSDOM unit test suite.
- `src/it/sample-site/` — Maven Invoker integration test fixture and `verify.bsh` verifier script.
- `src/site/` — Self-site documentation (`site.xml`, self-site-only logos in `src/site/resources/images/`, and Markdown pages in `src/site/markdown/`).

## Taste
- **Semantic tokens over hardcoded colors.** Use `var(--supa-*)` and `--color-*` custom properties in SCSS and components so every element automatically adapts across all 12 palette × polarity combinations.
- **Google TypeScript Style Guide & Google-style TSDoc across `src/**/*.{ts,tsx}` and `scripts/**/*.{ts,tsx}`.** All `.ts` and `.tsx` files under `src/` and `scripts/` must adhere to the Google TypeScript Style Guide (no `any`, `import type` for type-only imports, `T[]` for simple array types, `curly: 'all'`, `eqeqeq: 'always'`, `prefer-const`, `no-var`, `no-namespace`) and include a top-level `/** @fileoverview ... */` docstring plus full Google-style TSDoc (`@param name - description` and `@returns description`, **without** redundant `{type}` annotations) on every function, enforced by `supa/google-tsdoc` in `eslint.config.mjs`.
- **Single Velocity icon macro.** Use `#bi( "icon-name" "extra-classes" "aria-label" )` in Velocity templates and `.md.vm` pages.
- **Comments explain why.** Document external quirks (such as Doxia's synthetic `/project-info.html` hrefs or `verbatimLink` `<pre><a>` markup) and invariants the code cannot express on its own.

## Pull requests and commits
- Never create a commit or open a PR unless the maintainer asks you to.
- Use conventional commit titles in plain language: `fix(code): skip highlight.js on <pre> blocks with child elements` or `refactor(macros): consolidate icon Velocity macros into #bi`.
