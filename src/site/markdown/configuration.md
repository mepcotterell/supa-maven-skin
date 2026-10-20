# Configuration Reference

`mvn-furo-skin` is configured inside the `<custom><furoSkin>...</furoSkin></custom>` element of your `src/site/site.xml` descriptor. All settings are optional and have sensible defaults matching Sphinx Furo.

> [!TIP] Customizing Brand Colors
> You can override any Furo or Bootstrap 6 CSS custom property for Light and Dark modes directly from `site.xml` using `<lightCssVariables>` and `<darkCssVariables>` without maintaining a separate CSS file.

## Full `site.xml` Example

```xml
<custom>
  <furoSkin>
    <!-- Theme & Branding -->
    <defaultTheme>auto</defaultTheme>
    <sidebarHideName>false</sidebarHideName>
    <lightLogo>images/logo-light.svg</lightLogo>
    <darkLogo>images/logo-dark.svg</darkLogo>
    <announcement>Version 1.0 is now available!</announcement>

    <!-- Source Repository Links -->
    <sourceRepository>https://github.com/mepcott/mvn-furo-skin</sourceRepository>
    <sourceBranch>main</sourceBranch>
    <sourceDirectory>src/site</sourceDirectory>
    <sourceViewButton>true</sourceViewButton>
    <sourceEditButton>true</sourceEditButton>

    <!-- Layout & Navigation -->
    <breadcrumb>true</breadcrumb>
    <tocSidebar>true</tocSidebar>
    <tocTitle>On this page</tocTitle>
    <tocMaxDepth>4</tocMaxDepth>
    <prevNextButtons>true</prevNextButtons>
    <sidebarCollapseDepth>1</sidebarCollapseDepth>
    <footerTimestamp>true</footerTimestamp>
    <footerVersion>true</footerVersion>

    <!-- Interactive Enhancements -->
    <copyCodeButton>true</copyCodeButton>
    <syntaxHighlighting>true</syntaxHighlighting>
    <headingPermalinks>true</headingPermalinks>
    <headingPermalinkSymbol>#</headingPermalinkSymbol>
    <search>true</search>
    <mermaid>auto</mermaid>
    <katex>auto</katex>

    <!-- Custom Light/Dark CSS Tokens -->
    <lightCssVariables>
      <color-brand-primary>#2962ff</color-brand-primary>
      <color-brand-content>#2a5adf</color-brand-content>
    </lightCssVariables>
    <darkCssVariables>
      <color-brand-primary>#448aff</color-brand-primary>
      <color-brand-content>#5c9aff</color-brand-content>
    </darkCssVariables>
  </furoSkin>
</custom>
```

## Configuration Options

| Option | Default | Description |
| :--- | :--- | :--- |
| `<defaultTheme>` | `auto` | Initial theme mode before user selection (`auto`, `light`, or `dark`). |
| `<announcement>` | *(empty)* | Top announcement banner HTML rendered above the page header. |
| `<sidebarHideName>` | `false` | Hide the project name text under the logo in the left sidebar. |
| `<lightLogo>` | *(empty)* | Relative path or URL to logo shown when the resolved theme is light. |
| `<darkLogo>` | *(empty)* | Relative path or URL to logo shown when the resolved theme is dark. |
| `<sourceRepository>` | *(empty)* | GitHub/GitLab repository URL for "View source" and "Edit this page" buttons. |
| `<sourceBranch>` | `main` | Git branch name used when constructing source view/edit URLs. |
| `<sourceDirectory>` | `src/site` | Relative path to the Maven site directory inside the repository. |
| `<sourceViewButton>` | `true` | Show the "View page source" icon button when `<sourceRepository>` is configured. |
| `<sourceEditButton>` | `true` | Show the "Edit this page" icon button when `<sourceRepository>` is configured. |
| `<breadcrumb>` | `true` | Render breadcrumb navigation trail in the top content utility bar. |
| `<tocSidebar>` | `true` | Enable the right-hand "On this page" table of contents column and mobile drawer. |
| `<tocTitle>` | `On this page` | Heading label for the right-hand table of contents. |
| `<tocMaxDepth>` | `4` | Maximum heading level (`2`–`6`) included in the right-hand TOC. |
| `<prevNextButtons>` | `true` | Render Furo-styled Previous / Next page navigation cards at the bottom of articles. |
| `<sidebarCollapseDepth>` | `1` | Menu nesting depth expanded by default in the left sidebar (`<details open>`). |
| `<footerTimestamp>` | `true` | Display the build/publish date in the page footer. |
| `<copyCodeButton>` | `true` | Add a Copy-to-Clipboard button to all `<pre>` code blocks. |
| `<syntaxHighlighting>` | `true` | Highlight `<pre><code>` blocks offline using bundled `highlight.js`. |
| `<headingPermalinks>` | `true` | Append `#` permalink anchors to article headings (`h2`–`h6`). |
| `<search>` | `true` | Enable the sidebar search box and `/` (`⌘K` / `Ctrl+K`) search dialog. |
| `<mermaid>` | `auto` | Lazy-load Mermaid when `.mermaid` or `code.language-mermaid` is present (`auto`, `true`, `false`). |
| `<katex>` | `auto` | Lazy-load KaTeX when math expressions are present (`auto`, `true`, `false`). |

## Custom CSS Variables (`<lightCssVariables>` & `<darkCssVariables>`)

Just like Sphinx Furo's `light_css_variables` and `dark_css_variables`, any child element inside `<lightCssVariables>` or `<darkCssVariables>` is emitted as `--<tag-name>: <value>;` for the corresponding color scheme:

| Variable Name | Purpose |
| :--- | :--- |
| `color-brand-primary` | Primary brand accent color (active sidebar links, active TOC border, focus rings). |
| `color-brand-content` | Content hyperlink color inside `.prose` articles. |
| `color-background-primary` | Main article and page background surface. |
| `color-background-secondary` | Left sidebar, code block header, and card secondary surface. |
| `color-background-hover` | Hover state surface for navigation items and icon buttons. |
| `color-background-border` | Subtle hairline border color across sidebars, tables, and headers. |
| `color-foreground-primary` | Primary body text and heading color. |
| `color-foreground-secondary` | Secondary metadata, caption, and inactive TOC link color. |
