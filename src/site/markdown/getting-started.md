# Quickstart Tutorial

This tutorial walks you step-by-step through setting up **Supa Maven Skin** in a Maven project, creating a site descriptor (`src/site/site.xml`), and authoring your first Markdown (`.md`) and Velocity-processed Markdown (`.md.vm`) pages with admonitions, Bootstrap Icons, and synchronized content tabs.

> [!NOTE] What You Will Build
> By the end of this 5-minute tutorial, you will have a responsive 3-column documentation site with Light/Dark/Auto theme switching, 6 WCAG 2.2 AA/AAA accessible color schemes, offline syntax highlighting, client-side search, and Maven Project Info Reports.

---

## Prerequisites

Make sure your environment meets the following requirements:

- **Java Development Kit (JDK)**: JDK 17 or newer (JDK 21+ recommended).
- **Apache Maven**: Maven `3.9.0+`.
- **Maven Site Plugin**: `maven-site-plugin` `3.21.0+` (which uses Doxia `2.0` and Doxia Sitetools `2.0`).

---

## Step 1: Configure `pom.xml`

Add `maven-site-plugin` (with `doxia-module-markdown`) under `<build><plugins>` and `maven-project-info-reports-plugin` under `<reporting><plugins>` in your project's `pom.xml`:

```xml
<build>
  <pluginManagement>
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
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-project-info-reports-plugin</artifactId>
        <version>3.9.0</version>
      </plugin>
    </plugins>
  </pluginManagement>
</build>

<reporting>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-project-info-reports-plugin</artifactId>
      <reportSets>
        <reportSet>
          <reports>
            <report>index</report>
            <report>summary</report>
            <report>licenses</report>
            <report>team</report>
            <report>scm</report>
            <report>ci-management</report>
          </reports>
        </reportSet>
      </reportSets>
    </plugin>
  </plugins>
</reporting>
```

---

## Step 2: Create `src/site/site.xml`

Create the file `src/site/site.xml` to declare **Supa Maven Skin**, configure theme and repository settings under `<custom><supaSkin>`, and define your left-sidebar navigation menus:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<site xmlns="http://maven.apache.org/SITE/2.0.0"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://maven.apache.org/SITE/2.0.0 https://maven.apache.org/xsd/site-2.0.0.xsd"
      name="${project.name}">

  <skin>
    <groupId>io.github.mepcotterell</groupId>
    <artifactId>supa-maven-skin</artifactId>
    <version>0.1.0-SNAPSHOT</version>
  </skin>

  <custom>
    <supaSkin>
      <defaultTheme>auto</defaultTheme>
      <colorScheme>furo</colorScheme>
      <sourceRepository>https://github.com/your-org/your-repo</sourceRepository>
      <sourceBranch>main</sourceBranch>
      <sourceDirectory>src/site</sourceDirectory>
      <sourceViewButton>true</sourceViewButton>
      <sourceEditButton>true</sourceEditButton>
      <breadcrumb>true</breadcrumb>
      <tocSidebar>true</tocSidebar>
      <prevNextButtons>true</prevNextButtons>
      <copyCodeButton>true</copyCodeButton>
      <syntaxHighlighting>true</syntaxHighlighting>
      <search>true</search>
    </supaSkin>
  </custom>

  <body>
    <menu name="Documentation">
      <item name="Overview" href="index.html" />
      <item name="Installation" href="install.html" />
    </menu>
    <menu ref="reports" inherit="bottom" />
  </body>
</site>
```

---

## Step 3: Write Your First Markdown Page (`src/site/markdown/index.md`)

Create `src/site/markdown/index.md`. In standard `.md` files, you can immediately use GitHub-Flavored Markdown admonitions (`> [!NOTE]`, `> [!TIP]`), Bootstrap Icon shortcodes (`:bi-<name>:`), and synchronized content tabs (`.supa-tabs`):

```markdown
# Welcome to My Project

:bi-rocket-takeoff text-primary: **My Project** is a fast, modern JVM library.

> [!TIP] Quick Search
> Press <kbd>/</kbd> or <kbd>⌘K</kbd> anywhere on the site to search pages, headings, and Maven reports.

## Adding the Dependency

Select your build tool below:

<div class="supa-tabs" title="build-tool">
  <div title="Maven">
    <pre><code class="language-xml">&lt;dependency&gt;
  &lt;groupId&gt;com.example&lt;/groupId&gt;
  &lt;artifactId&gt;my-library&lt;/artifactId&gt;
  &lt;version&gt;1.0.0&lt;/version&gt;
&lt;/dependency&gt;</code></pre>
  </div>
  <div title="Gradle (Kotlin)">
    <pre><code class="language-kotlin">implementation("com.example:my-library:1.0.0")</code></pre>
  </div>
</div>
```

---

## Step 4: Write a Velocity-Enhanced Page (`src/site/markdown/install.md.vm`)

When you name a file with the `.md.vm` extension, Doxia runs **Apache Velocity** before parsing the Markdown. This lets you interpolate Maven properties (such as `${project.groupId}`, `${project.artifactId}`, and `${project.version}`) and invoke **Supa Maven Skin**'s built-in Velocity macros (`#bi`, `#bsAlert`, `#bsBadge`, `#bsCard`) by adding `#parse( "META-INF/maven/site-macros.vm" )` at the top of the file.

Create `src/site/markdown/install.md.vm`:

```velocity
#parse( "META-INF/maven/site-macros.vm" )
# Installation Guide #bsBadge( "success" "subtle" "v${project.version}" )

#bi( "download" "text-primary me-1" ) Install **`${project.artifactId}`** version **`${project.version}`** in your build.

#bsAlert( "info" "Maven Central Coordinates" "Always use the latest release version <code>${project.version}</code>." true )

## Maven Coordinates

```xml
<dependency>
  <groupId>${project.groupId}</groupId>
  <artifactId>${project.artifactId}</artifactId>
  <version>${project.version}</version>
</dependency>
```
```

> [!IMPORTANT] Headings Inside `.md.vm` Files
> In Velocity `.md.vm` templates, `##` starts a single-line Velocity comment. For `<h2>`–`<h6>` Markdown headings inside `.md.vm` files, escape the leading hash (`\## Maven Coordinates`) or configure Velocity/Markdown sections accordingly so Velocity does not strip the line as a comment.

---

## Step 5: Build and Preview Your Site

Run the `site` lifecycle to render your Markdown pages, Velocity templates, and Maven reports into `target/site/`:

```bash
mvn site
```

To start a local live-preview HTTP server on `http://localhost:8080`:

```bash
mvn site:run
```

Open `target/site/index.html` (or `http://localhost:8080`) in your browser. You will see:

1. Your **left navigation sidebar** with your custom pages and Project Info Reports.
2. Your **center prose article** with rendered `:bi-rocket-takeoff:` icons, Furo admonitions, and synchronized `Maven` / `Gradle` tabs.
3. Your **right "On this page" table of contents** tracking scroll position automatically.

---

## Next Steps

- Continue to **[Authoring Rich Content](authoring-guide.html)** for practical recipes covering admonitions, Bootstrap Icons (`#bi`), synchronized tabs, accordions, steppers, Mermaid diagrams, and KaTeX math.
- Browse the **[Configuration Reference](configuration.html)** to customize palettes, logos, drawers, and CSS variables.
- Explore **[Bootstrap 6 Components](bootstrap-components.html)** for all 28 component families and the interactive component playground.
