# Migrating from Apache Maven Fluido Skin

This how-to guide moves an existing Maven site from the [Apache Maven Fluido Skin](https://maven.apache.org/skins/maven-fluido-skin/) (`org.apache.maven.skins:maven-fluido-skin`) to **Supa Maven Skin**. Both skins read their settings from `<custom>` in `src/site/site.xml` and render the same Doxia content, so most of the work is editing the site descriptor and reviewing any hand-written HTML that relies on Fluido's bundled Bootstrap v2.3.2.

> [!NOTE] Which Fluido Versions This Guide Covers
> This guide was checked against the released Fluido templates for **2.1.0** (the latest release on Maven Central, March 2025) and **1.12.0** (the last 1.x release). Fluido's unreleased development branch (2.2.0-SNAPSHOT) switches to Bootstrap v5.3.8 and adds a light/dark theme switch; the two options that exist only there are marked *(development branch)* below.

---

## Before You Begin

### Check Your Toolchain

**Supa Maven Skin** targets `maven-site-plugin` `3.21.0+` with Doxia `2.0` and Doxia Sitetools `2.0`. Find your current Fluido version in the `<skin>` element of `src/site/site.xml`, then use this table to see what has to change:

| Skin | Bundled CSS framework | `skin.xml` Doxia Sitetools prerequisite | `maven-site-plugin` used by the skin's own build |
| :--- | :--- | :--- | :--- |
| Fluido 1.12.0 | Bootstrap v2.3.2 + jQuery 1.11.2 | `[1.11.1,2.0.0-M1)` | `3.12.0` |
| Fluido 2.0.0, 2.0.1, 2.1.0 | Bootstrap v2.3.2 + jQuery 1.11.2 | `2.0.0` | `3.21.0` |
| **Supa Maven Skin** | Bootstrap 6 (`6.0.0-alpha.1`), Bootstrap Icons, Highlight.js | `2.0.0` | `3.21.0` |

Earlier releases declare older prerequisites: for example, Fluido 1.11.1 requires Doxia Sitetools `1.11.1` and Fluido 1.9 requires `1.9.1`, while the 2.0.0-M milestones (2.0.0-M2 to 2.0.0-M11) require Doxia Sitetools 2.0.0-M milestones such as `2.0.0-M18`.

- **Coming from Fluido 2.0.0 or newer:** your build already runs `maven-site-plugin` 3.21.0 or newer. Skip to [Step 2](#step-2-replace-the-skin), unless the build log warns that your site model "is still using the old pre-version 2.0.0 model"; in that case, migrate the descriptor as described in Step 1.
- **Coming from Fluido 1.x:** you are on `maven-site-plugin` 3.12.x or older (Doxia Sitetools 1.x) with a Decoration 1.x descriptor. Do [Step 1](#step-1-upgrade-the-site-toolchain) first.
- **Coming from a Fluido 2.0.0-M milestone:** your build may run a `maven-site-plugin` older than 3.21.0 (Fluido 2.0.0-M11's own build uses 3.20.0). Do the plugin upgrade in item 1 of [Step 1](#step-1-upgrade-the-site-toolchain), then continue with Step 2.

> [!TIP] Keep a Baseline Build
> Run `mvn site` once with Fluido before you start and keep a copy of `target/site/`. Comparing the two builds page by page is the quickest way to spot a menu, link, or image that did not survive the switch.

---

## Step 1: Upgrade the Site Toolchain

*Fluido 1.x (and, for item 1 only, Fluido 2.0.0-M milestones).* Doxia Sitetools 2.0 still converts an old Decoration 1.x descriptor, but it logs a warning that the old model "will break in the future". Upgrade the plugin and the descriptor together:

1. **Upgrade the plugins.** Set `maven-site-plugin` to `3.21.0` (or newer) and add `doxia-module-markdown` `2.2.0` if you write Markdown pages. The [Quickstart Tutorial](getting-started.html#step-1-configure-pomxml) has a complete `pom.xml` block, including `maven-project-info-reports-plugin`.
2. **Switch the descriptor schema.** The root element changes from `<project>` (namespace `http://maven.apache.org/DECORATION/1.x.0`) to `<site>` (namespace `http://maven.apache.org/SITE/2.0.0`):

    ```xml
    <site xmlns="http://maven.apache.org/SITE/2.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SITE/2.0.0 https://maven.apache.org/xsd/site-2.0.0.xsd"
          name="${project.name}">
      <!-- skin, custom, and body elements go here -->
    </site>
    ```

3. **Fix elements that Site 2.0.0 dropped or reshaped.** The 2.0.0 schema has no `<googleAnalyticsAccountId>` element (see [Social, Analytics, and Ribbons](#social-analytics-and-ribbons) below), and the `img` / `alt` attributes on menus, menu items, links, and `poweredBy` logos became an `<image src="..." alt="..."/>` child element.
4. **Rewrite the banners.** In Decoration 1.x, `<bannerLeft>` and `<bannerRight>` hold `<name>`, `<src>`, `<alt>`, and `<href>` child elements. In Site 2.0.0, `name` and `href` are attributes and the logo is an `<image>` child element. **Supa Maven Skin** builds its sidebar brand from `<bannerLeft>`, so convert it:

    ```xml
    <!-- Before (Decoration 1.x) -->
    <bannerLeft>
      <name>My Project</name>
      <src>images/logo.png</src>
      <href>https://example.org/</href>
    </bannerLeft>

    <!-- After (Site 2.0.0) -->
    <bannerLeft name="My Project" href="https://example.org/">
      <image src="images/logo.png" alt="My Project"/>
    </bannerLeft>
    ```

Validate the result against the [site descriptor reference](https://maven.apache.org/doxia/doxia-sitetools/doxia-site-model/site.html). If you want to separate toolchain problems from skin problems, build once with Fluido 2.1.0 at this point: its `skin.xml` requires Doxia Sitetools `2.0.0`, and its own site build uses `maven-site-plugin` 3.21.0.

---

## Step 2: Replace the Skin

Replace the Fluido `<skin>` element in `src/site/site.xml`:

```xml
<!-- Before -->
<skin>
  <groupId>org.apache.maven.skins</groupId>
  <artifactId>maven-fluido-skin</artifactId>
  <version>2.1.0</version>
</skin>
```

```xml
<!-- After -->
<skin>
  <groupId>io.github.mepcotterell</groupId>
  <artifactId>supa-maven-skin</artifactId>
  <version>0.1.0</version>
</skin>
```

Check for a newer release of [`io.github.mepcotterell:supa-maven-skin` on Maven Central](https://central.sonatype.com/artifact/io.github.mepcotterell/supa-maven-skin); the [Quickstart Tutorial](getting-started.html#step-2-create-srcsitesitexml) shows the complete `site.xml`. **Supa Maven Skin** packages its CSS, JavaScript, and icon fonts inside the skin JAR, so consumer projects do not need Node.js or any extra build plugin.

---

## Step 3: Rename the Configuration Block

**Supa Maven Skin** reads `<custom><supaSkin>` (or the legacy `<custom><furoSkin>`) and ignores `<custom><fluidoSkin>`. Fluido reads only `<fluidoSkin>` (plus the top-level `<custom><matomo>` block). That means you can keep both blocks while you migrate and switch back by changing only `<skin>`:

```xml
<custom>
  <!-- Read by Supa Maven Skin -->
  <supaSkin>
    <defaultTheme>auto</defaultTheme>
    <colorScheme>furo</colorScheme>
    <sourceRepository>https://github.com/your-org/your-repo</sourceRepository>
    <sourceBranch>main</sourceBranch>
    <lightLogo>images/logo.svg</lightLogo>
    <navIcons>
      <icon>
        <href>https://github.com/your-org/your-repo</href>
        <title>GitHub Repository</title>
        <html><![CDATA[<i class="bi bi-github" aria-hidden="true"></i>]]></html>
      </icon>
    </navIcons>
  </supaSkin>

  <!-- Read by Fluido only; delete once the migration is done -->
  <fluidoSkin>
    <topBarEnabled>true</topBarEnabled>
    <gitHub>
      <projectId>your-org/your-repo</projectId>
    </gitHub>
  </fluidoSkin>
</custom>
```

Do not just rename `<fluidoSkin>` to `<supaSkin>`: almost none of the option names overlap. Translate each option with the [option mapping reference](#option-mapping-reference), and see the [Configuration Reference](configuration.html#configuration-options) for every `<supaSkin>` option and its default.

---

## Step 4: Review Custom CSS and Resources

- **`css/site.css` still loads.** Both skins link `css/site.css` after their own stylesheet, so an existing `src/site/resources/css/site.css` is picked up unchanged. Remove rules that target Fluido markup (`#banner`, `#breadcrumbs`, `#leftColumn`, `#bodyColumn`, `.sidebar-nav`, `#poweredBy`). They no longer match anything, and some may fight the new layout.
- **Fluido's images are not shipped.** The Fluido JAR provides files such as `images/logos/maven-feather.png`, `images/accessories-text-editor.png`, `images/icon_info_sml.gif`, and the Glyphicons sprites in `img/`. The **Supa Maven Skin** JAR ships only `css/`, `js/`, and `css/fonts/`. If a page references one of Fluido's images, copy your own version into `src/site/resources/images/`.
- **No jQuery.** Fluido bundles jQuery 1.11.2 and the Bootstrap v2.3.2 jQuery plugins. **Supa Maven Skin** bundles neither, so inline scripts that call `$(...)` or rely on `data-toggle` plugins need a rewrite (see [Updating Hand-Written Markup](#updating-hand-written-markup)).

---

## Option Mapping Reference

Every option that Fluido 2.1.0 and 1.12.0 read from `<custom><fluidoSkin>`, with its **Supa Maven Skin** replacement. Options marked "No equivalent" are ignored by **Supa Maven Skin**, so you can safely leave them in place until you delete the `<fluidoSkin>` block.

### Layout and Branding

| Fluido option | Supa Maven Skin equivalent | Notes |
| :--- | :--- | :--- |
| `<topBarEnabled>` / `<sideBarEnabled>` | No equivalent | The layout is always three columns: the left navigation sidebar (inline on large screens, a drawer below `lg`), the article, and the "On this page" table of contents. Use `<tocSidebar>false</tocSidebar>` to remove the right column. Menus are never rendered as a top navigation bar. |
| `<topBarIcon>` (`name`, `alt`, `src`, `href`) | `<lightLogo>` / `<darkLogo>` | The logo appears in the left sidebar brand area. `<bannerLeft>` provides the brand link and name (see [Site Descriptor Elements](#how-site-descriptor-elements-render)). |
| `<topBarContainerStyle>` | No equivalent | Change the prose width with `--supa-content-max-width` in `site.css` (see below). |
| `<navBarStyle>navbar-inverse</navBarStyle>` | `<defaultTheme>dark</defaultTheme>` | There is no top navigation bar to invert. `<defaultTheme>` sets the initial polarity (`auto`, `light`, or `dark`) for the whole page, and readers can change it from the theme menu. |
| `<leftColumnClass>` / `<bodyColumnClass>` | No equivalent | Column widths are CSS custom properties rather than grid classes: override `--supa-sidebar-width` (default `16rem`), `--supa-toc-width` (`14rem`), or `--supa-content-max-width` (`56rem`) in `site.css`. |
| `<profile>` (`pre-release`, `sandbox`, `retired`) | `<announcement>` | Instead of a watermark background image, put a banner above every page, for example `<announcement>This project is retired.</announcement>`. |
| `<copyrightClass>` | No equivalent | Style `.supa-copyright` in `site.css`, or replace the copyright line with `<body><footer>`. |
| `<breadcrumbDivider>` | No equivalent | The skin draws the divider as a chevron CSS mask from the `--breadcrumb-divider-icon` property, which is declared on `.breadcrumb` (so setting it on `:root` has no effect). Override it on the skin's breadcrumb list in `site.css`, for example `.supa-breadcrumb { --breadcrumb-divider-icon: url("data:image/svg+xml,..."); }`. |
| `<darkThemeEnabled>` *(development branch)* | `<defaultTheme>auto</defaultTheme>` | `auto` is already the default and follows the operating system preference. |
| `<themeSwitch>false</themeSwitch>` *(development branch)* | No equivalent | The Light / Dark / Auto menu is always rendered. `<colorSchemeSelector>false</colorSchemeSelector>` hides only the color scheme picker. |

For example, to make the sidebar wider and the prose column wider (`html:root` outranks the skin's own `:root` declarations):

```css
/* src/site/resources/css/site.css */
html:root {
  --supa-sidebar-width: 18rem;
  --supa-content-max-width: 64rem;
}
```

### Search, Code, and Headings

| Fluido option | Supa Maven Skin equivalent | Notes |
| :--- | :--- | :--- |
| `<googleSearch>` (`sitesearch`) | `<search>true</search>` (default) | Replaces the Google form with built-in client-side search. Open it with <kbd>/</kbd>, <kbd>⌘K</kbd>, or <kbd>Ctrl+K</kbd>; it searches navigation entries, headings on the current page, and the first 30 pages linked from the sidebar, which it fetches in the browser. Unlike Google site search, pages that are not in the sidebar, or that come after the first 30, are not indexed, so a large site (for example, a plugin site with many goal pages) is only partly searchable. No `<url>` in `pom.xml` is required. |
| `<sourceLineNumbersEnabled>` | No site-wide equivalent | Add line numbers to individual blocks with `<pre class="line-numbers">` (see [Styling Code Blocks](authoring-guide.html#styling-code-blocks)). Highlighting itself is on by default (`<syntaxHighlighting>`), using bundled Highlight.js instead of Google Code Prettify. |
| `<anchorJs>` (`cssSelector`, `options`) | `<headingPermalinks>true</headingPermalinks>` (default) | Adds a permalink to every `h2`–`h6` in the article. Change the symbol with `<headingPermalinkSymbol>`. The heading selector is fixed. |
| `<skipGenerationDate>` | Not needed | The generator comment at the top of each page never includes a date. To hide the visible "Last updated on" date in the footer, set `<footerTimestamp>false</footerTimestamp>`. |

### Social, Analytics, and Ribbons

| Fluido option | Supa Maven Skin equivalent | Notes |
| :--- | :--- | :--- |
| `<gitHub>` (`projectId`, `ribbonOrientation`, `ribbonColor`) | `<navIcons>` and `<sourceRepository>` | There is no "Fork me on GitHub" ribbon. Add a footer icon link with `<navIcons>` (see the example in [Step 3](#step-3-rename-the-configuration-block)) and set `<sourceRepository>` to get "View page source" and "Edit this page" buttons on every page rendered from a Markdown, APT, or XDoc source (generated report pages have none). |
| `<twitter>` (`user`, `showUser`, `showFollowers`) | `<navIcons>` | Use a plain icon link such as `bi-twitter-x` or `bi-mastodon`. No third-party widget script is loaded. |
| `<facebookLike>` (`layout`, `recommend`, `shareButton`) | `<navIcons>` | Use a plain `bi-facebook` icon link. |
| `<googleAnalytics>` (`accountId`, `anonymizeIp`, `forceSSL`) | `<body><head>` | No built-in analytics. Paste your provider's current tracking snippet into `<body><head>`, which is evaluated into every page's `<head>`. |
| `<custom><matomo>` (outside `<fluidoSkin>`) | `<body><head>` | Same approach as Google Analytics: paste the Matomo tracking code into `<body><head>`. |
| `<piwik>`, `<flattr>` (1.x only) | No equivalent | Both were already removed in Fluido 2.x. Use `<body><head>` for Matomo (formerly Piwik). |
| `<googleAnalyticsAccountId>` (Decoration 1.x root element) | `<body><head>` | Removed from the Site 2.0.0 schema. |

Since `maven-site-plugin` 3.5, HTML inside `<body><head>` must be escaped, for example in a CDATA section (see [Configuring the Site Descriptor](https://maven.apache.org/plugins/maven-site-plugin/examples/sitedescriptor.html)). For example, to inject a tracking script into every page:

```xml
<body>
  <head>
    <![CDATA[<script async src="https://analytics.example.com/tracker.js"></script>]]>
  </head>
</body>
```

---

## How Site Descriptor Elements Render

Fluido and **Supa Maven Skin** both read the standard `site.xml` elements, but **Supa Maven Skin** renders some of them differently and ignores others:

| `site.xml` element | Fluido | Supa Maven Skin |
| :--- | :--- | :--- |
| `<bannerLeft>` | Top-left banner heading with link and image | Left sidebar brand: `name` becomes the brand text, `href` the brand link, and `<image src>` the logo (only when `<lightLogo>` is not set). The image `alt` text comes from `name`. |
| `<bannerRight>` | Top-right banner | **Not rendered.** Move the logo to `<lightLogo>` / `<darkLogo>` or the link to `<navIcons>`. |
| `<publishDate position format>` | "Last Published" at the chosen position | **Position and format are ignored.** The footer shows "Last updated on YYYY-MM-DD"; hide it with `<footerTimestamp>false</footerTimestamp>`. |
| `<version position>` | "Version" at the chosen position | **Position is ignored.** The project version appears as a badge next to the sidebar brand; hide it with `<footerVersion>false</footerVersion>`. |
| `<poweredBy>` | Logos in the sidebar or footer (Maven feather by default) | **Not rendered.** The footer always ends with a "Built with Maven Site and Supa Maven Skin" line. Use `<navIcons>` for extra logos or links. |
| `<edit>` | Edit icon next to the page title in the breadcrumb bar | **Ignored.** Configure `<sourceRepository>`, `<sourceBranch>`, and `<sourceDirectory>` instead; the skin builds `/blob/<branch>/` and `/edit/<branch>/` links for every page rendered from a Doxia source file. See [Source Repository](configuration.html#source-repository). |
| `<body><breadcrumbs>` | Breadcrumb bar with a configurable divider; hrefs are resolved relative to the current page | Breadcrumb trail in the content header: a home link to `index.html`, your items, then the current page. Item hrefs are **not adjusted for the current page**, so a relative href such as `guide.html` breaks on pages in subdirectories. Writing an absolute URL does not help on its own: when `pom.xml` sets `<url>`, `maven-site-plugin` turns same-site absolute URLs back into relative ones (see [Pages in Subdirectories](#pages-in-subdirectories)). Turn the trail off with `<breadcrumb>false</breadcrumb>`. |
| `<body><links>` | Links in the breadcrumb bar (or a top-bar dropdown) | **Not rendered.** Move each link into a `<menu>` or into `<navIcons>`. |
| `<body><menu>` | Sidebar list or top-bar dropdowns | Left sidebar tree. Items with children become expandable groups, and the group that contains the current page is always open. Menu item `<image>` elements are not rendered, and `target` applies only to items without children. `ref="reports"`, `ref="modules"`, and `ref="parent"` menus are supported. **Unlike Fluido, menu hrefs are not adjusted for the current page**, so sidebar links break on pages in subdirectories (see [Pages in Subdirectories](#pages-in-subdirectories)). |
| `<item collapse="true">` | Children hidden until you visit a page in the group | Groups at a depth of `<sidebarCollapseDepth>` (default `1`) or shallower are always expanded, so `collapse="true"` affects only deeper groups by default. Set `<sidebarCollapseDepth>0</sidebarCollapseDepth>` to make top-level `collapse="true"` groups start closed, as they did in Fluido. |
| `<body><head>` | Evaluated with Velocity into `<head>` | Same: evaluated with Velocity into `<head>` on every page. |
| `<body><footer>` | Replaces the copyright paragraph | Replaces the copyright line. The "Built with" line and the "Last updated" date still follow it. |

### Pages in Subdirectories

Fluido rewrites every menu, link, and breadcrumb href for the directory of the page being rendered. **Supa Maven Skin** does not: it rewrites only the skin's own CSS and JavaScript, the logos, the home and brand links, and the synthetic `/project-info.html` and `/project-reports.html` report links. Menu items and breadcrumbs are emitted as they appear in the site model, which `maven-site-plugin` makes relative to the site root. On a page such as `target/site/guides/install.html`, a menu item written as `faq.html` therefore points to the missing `guides/faq.html`.

If all of your pages sit at the top level of the site, nothing changes. If you have pages in subdirectories, pick one of these:

- **Move the pages to the top level** (for example, `guides-install.md` instead of `guides/install.md`). This keeps sidebar highlighting and local previews working.
- **Use absolute URLs and turn off link relativization.** Write menu and breadcrumb hrefs as full URLs (`https://example.org/my-project/faq.html`) and set `<relativizeSiteLinks>false</relativizeSiteLinks>` in the `maven-site-plugin` `<configuration>` (or pass `-DrelativizeSiteLinks=false`). The links then work from every page, but they point to the deployed site even in a local build, and the sidebar no longer highlights the current page for those items.

---

## Updating Hand-Written Markup

Doxia-generated content (headings, lists, tables, code blocks, and report pages) needs no changes. **Supa Maven Skin** restyles it at runtime: Doxia tables become responsive Bootstrap 6 tables, `<pre><code>` blocks are highlighted, and headings get a table-of-contents entry and a permalink. **Supa Maven Skin** keeps the `id` anchors that Doxia generates for headings, so deep links that work with Fluido 2.x keep working. Coming from Fluido 1.x also means moving from Doxia 1.x to Doxia 2, which encodes some characters differently: Doxia 1.x's `DoxiaUtils.encodeId` kept `:` in anchors (`Step_2:_Install`), while the Doxia 2 version encodes it (`Step_2.3A_Install`). Recheck deep links to headings that contain punctuation.

Hand-written HTML in `.md`, `.xhtml`, or `.xdoc` pages is a different story. Fluido styled it with Bootstrap v2.3.2, whose class names are mostly gone in Bootstrap 6:

| Fluido-era markup (Bootstrap v2.3.2) | Replace with |
| :--- | :--- |
| `<div class="alert alert-info">`, `alert-success`, `alert-error`, plain `alert` | A Markdown admonition such as `> [!NOTE]`, `> [!TIP]`, `> [!DANGER]`, or `> [!WARNING]`, or the `> [!ALERT:info]` shorthand. In raw HTML, use `<div class="alert theme-info" role="alert">` (`theme-success`, `theme-danger`, `theme-warning`). See [Writing Admonitions and Alerts](authoring-guide.html#writing-admonitions-and-alerts). |
| `<div class="well">` | `<div class="card"><div class="card-body">...</div></div>`, or an admonition. |
| `<span class="label label-info">` | `<span class="badge theme-info">` (add `badge-subtle` or `badge-outline` for lighter variants). |
| `class="btn btn-primary"`, `btn-large`, `btn-small`, `btn-mini` | `class="btn btn-solid theme-primary"` (or `btn-outline` / `btn-subtle`), with `btn-lg`, `btn-sm`, or `btn-xs` for sizes. |
| `<i class="icon-download"></i>` (Glyphicons sprite) | A Bootstrap Icons shortcode such as `:bi-download:` in Markdown, or `<i class="bi bi-download" aria-hidden="true"></i>`. See [Adding Bootstrap Icons](authoring-guide.html#adding-bootstrap-icons). |
| `row-fluid` with `span6` / `span4` | `row` with responsive columns such as `col-12 md:col-6` (Bootstrap 6 uses a `breakpoint:` prefix). |
| `pull-left`, `pull-right`, `hide` | `float-start`, `float-end`, `d-none`. |
| `muted`, `text-error` | `fg-3` (the skin's muted text token), `text-danger`. |
| `data-toggle="tab"` / `data-toggle="collapse"` jQuery plugins | Synchronized `.supa-tabs` and declarative `.supa-accordion` blocks. See [Creating Synchronized Content Tabs](authoring-guide.html#creating-synchronized-content-tabs) and [Building Accordions and Steppers](authoring-guide.html#building-accordions-and-steppers). |
| `<pre class="prettyprint linenums">` | `<pre class="line-numbers"><code class="language-java">`. Fenced Markdown code needs only the language after the opening fence. |
| `class="nohighlight nocode"` on a code block | `class="language-plaintext"` (Highlight.js also skips `nohighlight`). |

> [!TIP] Wrap Raw Components in `.not-prose`
> The article column applies Bootstrap 6 prose typography (margins, list spacing, heading sizes) to everything inside it. Add `not-prose` to a hand-written component wrapper (for example `<div class="card not-prose">`) so those rules skip it. Headings inside a `.not-prose` element are also left out of the "On this page" table of contents.

---

## Verification Checklist

After `mvn site` succeeds, preview the site over HTTP with `mvn site:run` (or `python3 -m http.server 8000 --directory target/site`) and check the following. Pages opened from `file://` skip the skin's JavaScript, so search, the theme and color scheme controls, the "On this page" table of contents, and other enhancements would look broken; see [Previewing Your Site](troubleshooting.html#previewing-your-site).

- [ ] The build log shows no errors from parsing `site.xml`, and the generator comment at the top of each page reads "Rendered using Supa Maven Skin".
- [ ] The sidebar brand shows the right name and logo, and every menu, including `ref="reports"` and `ref="modules"`, appears in the left sidebar.
- [ ] Every link that used to live in `<links>`, `<bannerRight>`, or `<poweredBy>` has a new home in a `<menu>` or `<navIcons>`.
- [ ] Sidebar and breadcrumb links work from pages in subdirectories, not only from top-level pages (see [Pages in Subdirectories](#pages-in-subdirectories)).
- [ ] "View page source" and "Edit this page" open the right files, if you configured `<sourceRepository>`.
- [ ] Hand-written alerts, wells, labels, buttons, and icons render with Bootstrap 6 classes, and no image request points at Fluido's `images/` or `img/` folders.
- [ ] Analytics or other scripts moved to `<body><head>` load once per page.
- [ ] Search finds your pages. It fetches up to 30 sidebar-linked pages in the browser.
- [ ] Pages read well in Light and Dark mode and in at least one high-contrast color scheme (`modus`).

Next, tune colors and layout in the [Configuration Reference](configuration.html), or browse [Authoring Rich Content](authoring-guide.html) for the components that replace Fluido-era markup.
