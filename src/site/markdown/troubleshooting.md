# Troubleshooting

This guide collects problems that site authors commonly run into when building documentation with **Supa Maven Skin**. Each entry names the **symptom** you see, explains the **cause**, and gives a **fix**. If you have not set up the skin yet, start with the **[Quickstart Tutorial](getting-started.html)**.

> [!TIP] Check the Browser Console First
> Most rendering features (admonitions, tabs, the "On this page" table of contents, syntax highlighting, search, Mermaid, and KaTeX) are applied in the browser after the page loads. When several of them are missing at once, open your browser's developer tools and look at the console before changing any Markdown.

---

## Previewing Your Site

### Admonitions, Tabs, and the Table of Contents Are Missing

The page has the skin's colors and layout, but `> [!NOTE]` blocks are plain blockquotes, `.supa-tabs` panels are stacked, headings have no `#` permalink, and the right-hand "On this page" column is empty.

**Cause:** You opened the page straight from disk (a `file://` URL such as `target/site/index.html`). Supa Maven Skin loads its script as a JavaScript module (`<script type="module">`), and browsers such as Chrome and Firefox do not run module scripts on pages opened from `file://`. Chrome reports it in the console as `Access to script at '…/js/supa-maven-skin.min.js' from origin 'null' has been blocked by CORS policy`. The stylesheet and the small inline theme script in `<head>` still run, which is why the page looks partly styled.

**Fix:** Preview the site over HTTP instead:

```bash
# Render and serve the site on http://localhost:8080
mvn site:run

# Or serve an already-generated site with any static file server
python3 -m http.server 8000 --directory target/site
```

### Search Results Are Out of Date After a Rebuild

You rebuilt the site, but the search dialog still lists old headings or misses new pages.

**Cause:** The first time you open search, Supa Maven Skin fetches the other pages and caches the index in the tab's `sessionStorage` under the key `supa-search-index-<project version>`. When you rebuild with the same version (for example a `-SNAPSHOT`), the cache key stays the same, so that tab keeps using the old index.

**Fix:** Open the site in a new tab (each tab has its own `sessionStorage`), or remove the `supa-search-index-…` entry under *Session Storage* in your browser's developer tools.

---

## Velocity Pages (`.md.vm`)

Files ending in `.md.vm` pass through Apache Velocity before the Markdown parser sees them. In Velocity, `##` starts a line comment, `#name` can start a directive, and `$name` is a variable reference. See **[Choosing Markdown vs. Velocity Templates](authoring-guide.html#choosing-markdown-md-vs-velocity-templates-mdvm)** for when to use each format.

### A Second-Level Heading Disappeared

A `## Section` line in a `.md.vm` file is missing from the rendered page and from the table of contents.

**Cause:** Velocity treats everything from `##` to the end of the line as a comment and removes it before Markdown parsing. A level-1 heading (`# Title`) survives because `#` followed by a space is not a directive.

**Fix:** Wrap the hash marks in Velocity's unparsed-content syntax so they reach the Markdown parser unchanged:

```velocity
#[[##]]# Maven Coordinates
#[[###]]# Subsection
```

### A Code Sample Shows a Real Value Instead of `${project.version}`

You wanted readers to see a literal Maven placeholder in a code block, but the rendered page shows `1.0.0-SNAPSHOT` (or whatever your project version is).

**Cause:** Velocity replaces every reference it can resolve, including references inside fenced code blocks. References it cannot resolve, such as `$HOME`, are left as written. That is why only some dollar signs change.

**Fix:** Wrap the whole fenced block in `#[[ ... ]]#` so Velocity copies it unchanged. For a single reference you can also escape the dollar sign (`\${project.version}` renders as `${project.version}`). Escape only references Velocity would otherwise replace: inside a code block, Velocity keeps the backslash in front of an undefined reference, so `\$HOME` stays `\$HOME`.

````velocity
#[[
```xml
<version>${project.version}</version>
```
]]#
````

### The Build Fails With "Error parsing … as a Velocity template"

`mvn site` stops with `BUILD FAILURE` and a message such as `Failed to render site: Error parsing src/site/markdown/page.md.vm as a Velocity template: Encountered "DEBUG"` or `The #define directive requires one argument`.

**Cause:** Velocity reads `#` followed by a directive name as a directive, even inside fenced code blocks. C preprocessor lines such as `#if DEBUG`, `#else`, and `#define FOO 1` (and lines starting with `#foreach`, `#macro`, `#parse`, or `#end`) are not valid Velocity syntax, so parsing fails and the whole site build stops. Lines such as `#ifdef` and `#endif` are not Velocity directive names and pass through unchanged.

**Fix:** Wrap the code block in `#[[ ... ]]#` as shown above, or move the page to a plain `.md` file if it does not need any Velocity features.

### Part of a Code Sample or Page Vanished

A C sample such as `#include <stdio.h>` renders as ` <stdio.h>`, losing the `#include` part, or everything after a line starting with `#stop` is missing.

**Cause:** These are also Velocity directives. For `#include` without parentheses, Velocity drops the directive name and keeps the rest of the line. `#stop` ends template processing, so the rest of the page is never rendered.

**Fix:** Wrap the code block in `#[[ ... ]]#`, or use a plain `.md` file.

### A Macro Call Appears as Literal Text

The page shows text like `#bi( "rocket" "" "" )` instead of an icon or component.

**Cause:** Helper macros such as `#bi`, `#bsAlert`, `#bsBadge`, and `#bsCard` are Velocity macros. They only run in files processed by Velocity (`.md.vm`). In a plain `.md` file they are ordinary text.

**Fix:** Rename the file to `.md.vm` (and escape any `##` headings as described above), or use the plain-Markdown equivalents: `:bi-rocket:` shortcodes for icons and `> [!ALERT:primary]` blockquotes for alerts. See **[Adding Bootstrap Icons](authoring-guide.html#adding-bootstrap-icons)**.

---

## Markdown and Embedded HTML

### Part of an HTML Block Renders as a Code Block

Inside a raw HTML wrapper such as `<div class="supa-tabs">`, some of your HTML appears as escaped source text in a grey code block.

**Cause:** In CommonMark, a blank line ends a raw HTML block. The parser treats the lines after it as Markdown again, and lines indented by four or more spaces become an indented code block.

**Fix:** Keep multi-line HTML wrappers free of blank lines. If you need an empty line inside an HTML `<pre><code>` block, write `&#10;` instead.

```html
<div class="supa-tabs" title="build-tool">
  <div title="Maven">
    <p>First paragraph.</p>
    <p>Second paragraph, with no blank line in between.</p>
  </div>
</div>
```

### A Blockquote Did Not Become an Admonition

A blockquote that starts with an admonition marker renders as a plain quote.

**Cause:** Supa Maven Skin only converts a blockquote when its first paragraph starts with one of the supported markers. Markers are case-insensitive, but they must be the very first text and must not be wrapped in formatting. Unsupported types such as `[!INFO]` and formatted markers such as `**[!WARNING]**` are left as blockquotes.

**Fix:** Use one of the supported markers on the first line: `[!NOTE]`, `[!SEEALSO]` (or `[!SEE-ALSO]`), `[!TIP]`, `[!HINT]`, `[!IMPORTANT]`, `[!ADMONITION]`, `[!WARNING]`, `[!CAUTION]`, `[!ATTENTION]`, `[!DANGER]`, `[!ERROR]`, `[!TODO]`, or `[!ALERT:<theme>]`. See **[Writing Admonitions and Alerts](authoring-guide.html#writing-admonitions-and-alerts)**.

### An Admonition Shows a Title but No Body

The admonition box shows your sentence in its title bar and nothing underneath.

**Cause:** Any text after the marker *on the same line* becomes the admonition's custom title.

**Fix:** Start the body on the next line:

```markdown
> [!NOTE] Optional Custom Title
> The body starts on the second line.
```

### An Icon Shortcode Renders Nothing or Stays as Text

A `:bi-...:` shortcode leaves a blank gap, or stays as literal text.

**Cause:** Shortcode icon names must be lowercase (`:bi-ROCKET:` is left as text). A lowercase name that is not a real Bootstrap Icons name still produces an `<i>` element, but the icon font has no glyph for it, so nothing is visible. Shortcodes inside inline code, code blocks, `<kbd>`, and `<samp>` are intentionally left as text.

**Fix:** Copy the exact icon name from the [Bootstrap Icons](https://icons.getbootstrap.com/) catalogue and write it in lowercase, for example `:bi-rocket-takeoff:`.

---

## Code Blocks

### A Code Block Is Not Syntax Highlighted

A fenced code block renders in a single color.

**Cause:** One of the following:

- The fence has no language. Doxia marks such blocks `nohighlight`, so they are never highlighted.
- The language is not one of the grammars bundled with Supa Maven Skin. The browser console then shows *"Could not find the language '…'"*, and the block falls back to plain text. The bundled grammars are Bash (`bash`, `sh`, `zsh`), shell sessions with prompts (`shell`, `console`), `css`, `diff` (`patch`), `groovy`, `java`, JavaScript (`javascript`, `js`, `jsx`, `mjs`, `cjs`), `json`, Kotlin (`kotlin`, `kt`, `kts`), Markdown (`markdown`, `md`), plain text (`plaintext`, `text`, `txt`), `properties`, Python (`python`, `py`), `scss`, `sql`, TypeScript (`typescript`, `ts`, `tsx`), XML and HTML (`xml`, `html`, `svg`, `xsd`, `xsl`), and `yaml` (`yml`). The `velocity` and `vm` names are accepted but use the XML highlighter, so Velocity directives themselves are not colored.
- The block contains HTML elements, for example a raw `<pre><code>` block with `<b>` tags, or the linked URLs that Maven project reports put inside `<pre>`. Supa Maven Skin deliberately skips highlighting such blocks so that the links and markup stay intact.
- `<syntaxHighlighting>` is set to `false` in `site.xml`.

**Fix:** Add a bundled language name after the opening fence (for example `java` or `xml`), or use `text` for output that should stay plain. Blocks that contain HTML elements are left unhighlighted on purpose.

### The Copy Button Says "Copied!" but Nothing Was Copied

**Cause:** Browsers only provide the asynchronous Clipboard API (`navigator.clipboard`) in [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): pages served over HTTPS, or from `localhost` and `127.0.0.1`. When a site is served over plain HTTP from another host (an internal staging server, for example), the API is missing, so no text is copied, but the button still shows its confirmation.

**Fix:** Serve the site over HTTPS, or preview it from `localhost`.

---

## Links and Anchors

### A Link to a Heading Does Not Jump to It

A link such as `page.html#my-section`, perhaps a sub-item in `site.xml`, opens the page but does not scroll to the heading.

**Cause:** Heading IDs are assigned in the browser by Supa Maven Skin, and they may differ from the slug you guessed. The rules are:

- The text is lowercased, and every character other than ASCII letters, digits, `_`, spaces, and hyphens is removed. Dots, parentheses, and backticks disappear, so `(.md.vm)` becomes `mdvm`. Accented and non-Latin letters are removed too, so a heading with no ASCII letters at all gets the ID `section`.
- Runs of spaces, underscores, and hyphens become a single `-`.
- Repeated headings get `-2`, `-3`, and so on.

Doxia's own anchors (such as `#My_Section`) are kept, so older links keep working.

**Fix:** Do not guess the ID. Open the rendered page, hover over the heading, and copy the link from its `#` permalink, or copy the entry from the "On this page" column.

---

## Theme and Color Scheme

### Changing `<colorScheme>` or `<defaultTheme>` Has No Visible Effect

You edited `site.xml` and rebuilt, but your browser still shows the old palette or light/dark mode.

**Cause:** One of the following:

- **A saved preference wins.** When a reader picks a theme or color scheme, Supa Maven Skin saves it in `localStorage` (`supa-theme` and `supa-palette`), and saved values take precedence over the `site.xml` defaults. `localStorage` is shared by every page on the same origin, so a choice made while previewing another project on `http://localhost:8080`, or on another project under the same `github.io` domain, also applies to your site.
- **The value is misspelled.** Color scheme IDs are exact and lowercase: `furo`, `bootstrap`, `modus`, `modus-tinted`, `modus-deuteranopia`, or `modus-tritanopia`. Any other value (including `Modus`) falls back to `furo`. Any `<defaultTheme>` value other than `light` or `dark` behaves like `auto`.

**Fix:** Correct the value, then remove the `supa-theme` and `supa-palette` entries under *Local Storage* in your browser's developer tools (or run `localStorage.removeItem('supa-palette')` and `localStorage.removeItem('supa-theme')` in the console) and reload. See **[Configuration Options](configuration.html#configuration-options)**.

### The Theme or Color Scheme Resets on Every Page

Readers pick a theme or color scheme, but the next page goes back to the site default.

**Cause:** The browser is not allowing the site to store data. Browsers block access to `localStorage` when the user has set them to stop the site from saving data (cookies and site data). Supa Maven Skin catches the error and falls back to the `site.xml` defaults.

**Fix:** There is nothing to fix on the site side. Readers who want their choice to stick need to allow site data for your documentation domain.

### The Site Uses High-Contrast Colors Instead of Furo

Your site uses the default `furo` color scheme, but a reader sees the black-and-white Modus palette.

**Cause:** This is intentional. When the operating system or browser asks for more contrast (the `prefers-contrast: more` media query, such as macOS *Increase contrast*), the default `furo` scheme switches to the WCAG AAA `modus` tokens. This only happens while the reader has not picked a color scheme themselves.

**Fix:** Readers can choose any color scheme from the palette menu in the header, and that choice is kept. See **[Built-In Accessible Color Schemes](configuration.html#built-in-accessible-color-schemes)**.

### A Custom Brand Color Looks Wrong in Dark Mode

**Cause:** Values in `<lightCssVariables>` are written as plain CSS custom properties that apply in every mode. Only `<darkCssVariables>` overrides them in dark mode. If you set a color only in `<lightCssVariables>`, the light-mode color is also used on the dark background. The build-time WCAG contrast check only covers the built-in color schemes, not your overrides.

**Fix:** Set every overridden color in both `<lightCssVariables>` and `<darkCssVariables>`, and check its contrast against both backgrounds yourself. See **[Extending Palettes](configuration.html#extending-palettes-via-lightcssvariables-darkcssvariables)**.

### Settings in `<furoSkin>` Are Ignored

**Cause:** Supa Maven Skin reads `<custom><supaSkin>` and only falls back to the legacy `<custom><furoSkin>` element when there is no `<supaSkin>` element. The two are not merged: if both are present, everything inside `<furoSkin>` is ignored.

**Fix:** Move all options into `<supaSkin>` and delete the `<furoSkin>` element.

---

## Diagrams and Math

### A Mermaid Diagram Shows Its Source Text

**Cause:** One of the following:

- `<mermaid>false</mermaid>` is set, so the fenced block stays a plain `<pre>` block without the usual code-block header, copy button, or highlighting.
- The Mermaid library could not be loaded. By default Supa Maven Skin loads a version-pinned `mermaid.min.js` from `cdn.jsdelivr.net` with Subresource Integrity (SRI); `<mermaidCdnUrl>` only overrides that URL. With no network access, a blocked CDN, a `Content-Security-Policy` whose `script-src` does not allow that host (or your override's host), or an integrity mismatch (for example from a proxy that rewrites the file), loading fails quietly and the diagram source is left on the page as plain text. An integrity mismatch shows up in the browser console as an integrity error, not a 404.
- The block is not marked as Mermaid. Only fenced blocks with the `mermaid` language, or elements with the `mermaid` class, are rendered.

**Fix:** Use a ```` ```mermaid ```` fence, keep `<mermaid>` at `auto` or `true`, and make sure readers' browsers can reach `cdn.jsdelivr.net` (or your override). For offline or locked-down sites, follow **[Self-Hosting Mermaid & KaTeX](authoring-guide.html#self-hosting-mermaid-katex)**: copy the single `mermaid.min.js` file into your site and point `<mermaidCdnUrl>` at its root-relative or absolute URL. An `.mjs` override still loads with `import()`, but the ES module build imports chunk files by relative path, so its `chunks/` folder must be copied next to it. If diagrams render but look unstyled, your `style-src` lacks `'unsafe-inline'`; see [Content Security Policy](configuration.html#content-security-policy).

### Dollar Amounts Render as Italic Math

A sentence like the one below shows "5perseatand" run together in italic math type, because math mode ignores spaces:

```text
The plan costs $5 per seat and $10 per admin.
```

**Cause:** With `<katex>auto</katex>` (the default), any text that looks like `$...$` makes Supa Maven Skin load KaTeX, which then renders the text between each pair of dollar signs as inline math. Escaping the dollar sign does not help: Markdown turns `\$` and `&#36;` into a plain `$` before KaTeX sees the text.

**Fix:** Put one of the amounts in inline code (KaTeX skips `<code>` and `<pre>`), wrap a dollar sign in its own element, or turn math off with `<katex>false</katex>` if the site has no formulas:

```markdown
The plan costs `$5` per seat and `$10` per admin.
The plan costs <span>$</span>5 per seat and <span>$</span>10 per admin.
```

### KaTeX Math Does Not Render

**Cause:** One of the following:

- **Markdown removed a backslash.** In CommonMark, `\(` and `\[` are escapes for `(` and `[`, so `\(a+b\)` reaches the browser as `(a+b)`.
- **Markdown added emphasis.** Asterisks inside math, as in `$a*b*c$`, are turned into `<em>` tags before KaTeX runs.
- **The page was not detected as containing math.** In `auto` mode, inline math needs a non-space character straight after the opening `$`. A page whose only formula is `$ x $` never loads KaTeX.
- **KaTeX could not be loaded.** `<katex>false</katex>` is set, the CDN is unreachable, a `Content-Security-Policy` blocks the jsDelivr defaults (or your `<katexJsCdnUrl>` / `<katexCssCdnUrl>` overrides) in `script-src`, `style-src`, or `font-src`, or a file fails its integrity check. When you self-host a classic `contrib/auto-render.min.js`, the skin first loads `katex.min.js` from the folder above it (`../katex.min.js`), so copying only `contrib/` leaves a 404 in the console.

**Fix:** Double the backslashes (`\\(a+b\\)`, `\\[ ... \\]`), escape asterisks inside math (`\*`), write inline math without a space after the opening `$` (`$x$`), or set `<katex>true</katex>` to always load KaTeX. Prefer `$$ ... $$` for display math. To serve KaTeX yourself, keep its `dist/` layout as described in [Self-Hosting Mermaid & KaTeX](authoring-guide.html#self-hosting-mermaid-katex), and allow the origins listed under [Content Security Policy](configuration.html#content-security-policy).

---

## Layout and Navigation

### The Sidebar or "On this page" Column Is Missing

**Cause:** One of the following:

- **The window is narrow.** Below `1024px` the left navigation moves into a drawer opened from the menu button in the top bar. Below `1280px` the "On this page" column moves into a drawer opened from the table-of-contents button. `<stickyContentHeader>` only pins the content header at `1024px` and wider, because the mobile header is already sticky below that width.
- **The page has no section headings.** The table of contents lists `h2` headings and deeper, down to `<tocMaxDepth>` (default `4`). A page with only a title has no table of contents, and its table-of-contents buttons are hidden.
- **The column is turned off.** `<tocSidebar>false</tocSidebar>` removes it on every page.

**Fix:** Widen the window or use the drawer buttons, add `##` sections to long pages, and check `<tocSidebar>` and `<tocMaxDepth>`.

### Search Does Not Find Text on Other Pages

**Cause:** Search indexes the current page's headings plus up to 30 pages linked from the left navigation. For those other pages it only indexes the title, the first few hundred characters of text, and `h1`–`h4` headings, not the full text. Pages that are not linked from the navigation menu in `site.xml` are not indexed at all.

**Fix:** Add every page you want to be searchable to a `<menu>` in `site.xml` (sub-items count), and put the terms readers will search for in headings or near the top of the page.

---

## Custom Styles

### Rules in `css/site.css` Are Not Applied

**Cause:** Supa Maven Skin links exactly one custom stylesheet, `css/site.css`, after its own stylesheet so that your rules can override its styles. Maven copies `src/site/resources/` into the root of the generated site, so the source file must be `src/site/resources/css/site.css`. If you do not provide the file, `maven-site-plugin` writes a placeholder `css/site.css` that contains only a comment.

**Fix:** Save the stylesheet as `src/site/resources/css/site.css` and rebuild. For colors, prefer `<lightCssVariables>` and `<darkCssVariables>` in `site.xml` (see **[Extending Palettes](configuration.html#extending-palettes-via-lightcssvariables-darkcssvariables)**) over restyling individual components.
