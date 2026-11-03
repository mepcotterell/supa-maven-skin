#!/usr/bin/env node
/**
 * @fileoverview Documentation, CHANGELOG.md, link target, code fence, and version alignment linter
 * for Supa Maven Skin. Ensures that version numbers stated across README.md, CHANGELOG.md,
 * AGENTS.md, and src/site/ strictly align with the authoritative sources in pom.xml and
 * package.json, verifies Keep a Changelog 1.1.0 conventions, and checks internal doc links and
 * Markdown code fences. Skin install snippets must show the latest *released* version (the newest
 * dated release heading in CHANGELOG.md), because the development `-SNAPSHOT` on main only exists
 * in the Central snapshot repository that consumer builds do not have configured.
 */
import fs from 'node:fs';
import path from 'node:path';

interface PackageJsonShape {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const ROOT_DIR: string = process.cwd();
const POM_PATH: string = path.join(ROOT_DIR, 'pom.xml');
const PKG_PATH: string = path.join(ROOT_DIR, 'package.json');
const CHANGELOG_PATH: string = path.join(ROOT_DIR, 'CHANGELOG.md');
const SITE_MARKDOWN_DIR: string = path.join(ROOT_DIR, 'src/site/markdown');

/** POM property holding the latest released skin version, read by `index.md.vm`. */
const RELEASE_VERSION_PROPERTY = 'latest-release.version';
/** Velocity expression `.md.vm` pages use to interpolate {@link RELEASE_VERSION_PROPERTY}. */
const RELEASE_VERSION_VELOCITY_EXPR = `\${project.properties.getProperty("${RELEASE_VERSION_PROPERTY}")}`;

const VALID_CHANGELOG_CATEGORIES = new Set<string>([
  'Added',
  'Changed',
  'Deprecated',
  'Removed',
  'Fixed',
  'Security',
]);

const MAVEN_REPORT_PAGES = new Set<string>([
  'project-info.html',
  'summary.html',
  'licenses.html',
  'team.html',
  'scm.html',
  'ci-management.html',
  'plugins.html',
  // Illustrative page name used inside the Quickstart Tutorial's example site.xml snippet
  'install.html',
]);

const errors: string[] = [];

/**
 * Extracts the trimmed text content of the first matching XML tag.
 *
 * @param xml - Raw XML source string to search.
 * @param tagName - XML element tag name without angle brackets.
 * @returns Trimmed text content of the tag, or null if not found.
 */
function extractXmlTag(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));
  return match ? match[1].trim() : null;
}

/**
 * Validates CommonMark backtick code fences in a Markdown file so that nested 3-backtick fences
 * cannot prematurely close an outer block and swallow subsequent prose into a bare code block,
 * and checks that `.md.vm` files escape `##`–`######` headings as `#[[##]]#`–`#[[######]]#` outside fences.
 *
 * @param relPath - Relative file path for error reporting.
 * @param content - Full markdown text content of the file.
 */
function validateMarkdownCodeFences(relPath: string, content: string): void {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let fenceLen = 0;
  let fenceStartLine = 0;
  const isVelocityMarkdown = relPath.endsWith('.md.vm');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const match = line.match(/^\s*(`{3,})(.*)$/);
    if (match) {
      const ticks = match[1] ?? '';
      const info = (match[2] ?? '').trim();

      if (!inFence) {
        if (!info) {
          errors.push(
            `${relPath}:${i + 1}: Opening code fence "${ticks}" is missing a language identifier (or an earlier nested code block prematurely closed its outer fence; use \`\`\`\` for outer fences wrapping \`\`\` blocks).`
          );
        }
        inFence = true;
        fenceLen = ticks.length;
        fenceStartLine = i + 1;
      } else if (ticks.length >= fenceLen && info === '') {
        inFence = false;
        fenceLen = 0;
        fenceStartLine = 0;
      }
      continue;
    }

    if (!inFence && isVelocityMarkdown && /^\\?#{2,6}\s+\S/.test(line)) {
      errors.push(
        `${relPath}:${i + 1}: Unescaped Markdown heading "${line.trim()}" in .md.vm file; wrap hashes in Velocity unparsed syntax (e.g., "#[[##]]# Heading") so Apache Velocity does not strip it as a comment.`
      );
    }
  }

  if (inFence) {
    errors.push(
      `${relPath}:${fenceStartLine}: Unclosed code fence starting on line ${fenceStartLine}.`
    );
  }
}

/**
 * Validates internal `.html` and `src/site/markdown/` links in documentation files and `site.xml`.
 *
 * @param relPath - Relative file path for error reporting.
 * @param content - Full text content of the file.
 * @param validSiteHtmlPages - Set of valid `.html` page basenames generated from `src/site/markdown/`.
 */
function validateInternalLinks(
  relPath: string,
  content: string,
  validSiteHtmlPages: Set<string>
): void {
  // Check href="page.html#..." and Markdown [label](page.html#...)
  const htmlLinkRegex =
    /(?:href=["']|\[[^\]]+\]\()([a-z0-9_-]+\.html)(?:#[a-z0-9_-]+)?(?:["')])/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlLinkRegex.exec(content)) !== null) {
    const targetHtml = (match[1] ?? '').toLowerCase();
    if (
      !validSiteHtmlPages.has(targetHtml) &&
      !MAVEN_REPORT_PAGES.has(targetHtml)
    ) {
      errors.push(
        `${relPath}: Broken internal page link "${targetHtml}" (no matching file in src/site/markdown/ or configured Maven report).`
      );
    }
  }

  // Check relative links to src/site/markdown/*.md
  const mdPathRegex = /\bsrc\/site\/markdown\/([a-z0-9_.-]+\.md(?:\.vm)?)\b/gi;
  let mdMatch: RegExpExecArray | null;
  while ((mdMatch = mdPathRegex.exec(content)) !== null) {
    const mdFile = mdMatch[1] ?? '';
    // Skip glob/placeholder/consumer-tutorial examples like page.md, index.md, or install.md.vm
    if (
      mdFile === 'page.md' ||
      mdFile === 'page.md.vm' ||
      mdFile === 'index.md' ||
      mdFile === 'install.md.vm'
    ) {
      continue;
    }
    const targetPath = path.join(SITE_MARKDOWN_DIR, mdFile);
    if (!fs.existsSync(targetPath)) {
      errors.push(
        `${relPath}: Referenced documentation file "src/site/markdown/${mdFile}" does not exist.`
      );
    }
  }
}

/**
 * Finds the newest release in CHANGELOG.md: the first dated `## [x.y.z] - YYYY-MM-DD` heading.
 * Keep a Changelog lists releases newest first, and `[x.y.z]: https://...` link reference lines
 * are not headings, so they never match. A `## [x.y.z]` heading without a valid date is reported
 * because it would otherwise be skipped silently and leave install snippets on an older release.
 *
 * @param content - Full markdown text content of CHANGELOG.md.
 * @returns The newest released version, or null when no release heading exists yet.
 */
function findLatestChangelogRelease(content: string): string | null {
  const headingRegex = /^## \[([^\]]+)\](.*)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(content)) !== null) {
    const label = match[1] ?? '';
    if (label === 'Unreleased') {
      continue;
    }
    const suffix = match[2] ?? '';
    if (
      !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(label) ||
      !/^ - \d{4}-\d{2}-\d{2}\s*$/.test(suffix)
    ) {
      errors.push(
        `CHANGELOG.md: Malformed release heading "## [${label}]${suffix}"; expected "## [x.y.z] - YYYY-MM-DD".`
      );
      continue;
    }
    return label;
  }
  return null;
}

/**
 * Compares the numeric `major.minor.patch` parts of two versions, ignoring qualifiers such as
 * `-SNAPSHOT` or `-alpha.1`.
 *
 * @param a - First version string.
 * @param b - Second version string.
 * @returns A negative number if a < b, zero if equal, or a positive number if a > b.
 */
function compareVersionCores(a: string, b: string): number {
  const parse = (v: string): number[] =>
    v
      .replace(/-.*$/, '')
      .split('.')
      .map((part: string) => Number.parseInt(part, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * Validates that CHANGELOG.md adheres to Keep a Changelog 1.1.0 structure and uses current supa prefixes.
 *
 * @param content - Full markdown text content of CHANGELOG.md.
 * @param currentPomVersion - Current project version from pom.xml.
 * @param currentBaseVersion - Base version without -SNAPSHOT suffix.
 */
function validateChangelog(
  content: string,
  currentPomVersion: string | null,
  currentBaseVersion: string
): void {
  if (!/^# Changelog\b/m.test(content)) {
    errors.push('CHANGELOG.md: Missing top-level "# Changelog" heading.');
  }
  if (!/^## \[Unreleased\]/m.test(content)) {
    errors.push('CHANGELOG.md: Missing required "## [Unreleased]" section.');
  }

  // When developing a -SNAPSHOT version, that base version has not been released yet
  if (
    currentPomVersion &&
    currentPomVersion.endsWith('-SNAPSHOT') &&
    currentBaseVersion
  ) {
    const escapedBase = currentBaseVersion.replace(/\./g, '\\.');
    if (new RegExp(`^## \\[${escapedBase}\\]`, 'm').test(content)) {
      errors.push(
        `CHANGELOG.md: Found "## [${currentBaseVersion}]" while pom.xml is still at ${currentPomVersion}; keep unreleased changes under "## [Unreleased]" until release.`
      );
    }
  }

  // Verify every ### subsection heading is a valid Keep a Changelog 1.1.0 category
  const categoryRegex = /^### (.+)$/gm;
  let catMatch: RegExpExecArray | null;
  let categoryCount = 0;
  while ((catMatch = categoryRegex.exec(content)) !== null) {
    categoryCount++;
    const category = (catMatch[1] ?? '').trim();
    if (!VALID_CHANGELOG_CATEGORIES.has(category)) {
      errors.push(
        `CHANGELOG.md: Invalid category heading "### ${category}". Expected one of: ${Array.from(VALID_CHANGELOG_CATEGORIES).join(', ')}.`
      );
    }
  }
  if (categoryCount === 0) {
    errors.push(
      'CHANGELOG.md: Must contain at least one Keep a Changelog category heading (e.g., "### Added").'
    );
  }

  // Verify reference link definition for [Unreleased]
  if (
    !/^\[Unreleased\]:\s+https:\/\/github\.com\/mepcotterell\/supa-maven-skin\/(?:compare\/|commits\/|tree\/)/m.test(
      content
    )
  ) {
    errors.push(
      'CHANGELOG.md: Missing "[Unreleased]: https://github.com/mepcotterell/supa-maven-skin/..." link reference definition.'
    );
  }

  // Disallow stale .furo-* / #furo* / data-furo-* / furo-theme / furo-palette tokens
  const legacyPrefixMatch = content.match(
    /(?:\.furo-[a-z-]+|#furo[A-Za-z]+|data-furo-[a-z-]+|\bfuro-(?:theme|palette)\b)/
  );
  if (legacyPrefixMatch) {
    errors.push(
      `CHANGELOG.md: Found legacy prefix "${legacyPrefixMatch[0]}"; use "supa" prefix instead.`
    );
  }
}

const pomXml: string = fs.readFileSync(POM_PATH, 'utf8');
const pkgJson: PackageJsonShape = JSON.parse(
  fs.readFileSync(PKG_PATH, 'utf8')
) as PackageJsonShape;

// Extract project-level <version> (before <properties> or <dependencies>)
const projectHeaderXml: string = pomXml.split('<properties>')[0] ?? pomXml;
const pomVersion: string | null = extractXmlTag(projectHeaderXml, 'version');
const pkgVersion: string | undefined = pkgJson.version;

if (!pomVersion) {
  errors.push('pom.xml: Could not extract project <version>.');
}
if (!pkgVersion) {
  errors.push('package.json: Could not extract "version".');
}

const pomBaseVersion: string = pomVersion
  ? pomVersion.replace(/-SNAPSHOT$/, '')
  : '';
if (pomBaseVersion && pkgVersion && pomBaseVersion !== pkgVersion) {
  errors.push(
    `Version mismatch between pom.xml (<version>${pomVersion}</version>) and package.json ("version": "${pkgVersion}").`
  );
}

const mavenSitePluginVersion: string | null = extractXmlTag(
  pomXml,
  'maven-site-plugin.version'
);
const doxiaVersion: string | null = extractXmlTag(pomXml, 'doxia.version');
const pomBootstrapVersion: string | null = extractXmlTag(
  pomXml,
  'bootstrap.version'
);
const bootstrapVersion: string = (pkgJson.dependencies?.bootstrap ?? '').replace(
  /^[\^~]/,
  ''
);
const bootstrapMajor: string = bootstrapVersion.split('.')[0] ?? '';

if (pomBootstrapVersion && pomBootstrapVersion !== bootstrapVersion) {
  errors.push(
    `Version mismatch between pom.xml (<bootstrap.version>${pomBootstrapVersion}</bootstrap.version>) and package.json ("bootstrap": "${bootstrapVersion}").`
  );
}

let changelogRelease: string | null = null;
if (!fs.existsSync(CHANGELOG_PATH)) {
  errors.push('CHANGELOG.md: File does not exist.');
} else {
  const changelogContent: string = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  validateChangelog(changelogContent, pomVersion, pomBaseVersion);
  changelogRelease = findLatestChangelogRelease(changelogContent);
}

// The latest released version is the single source of truth for install snippets. Before the
// first release there is nothing on Maven Central yet, so fall back to the pom version.
const latestReleaseVersion: string = changelogRelease ?? pomVersion ?? '';
const latestReleaseSource: string = changelogRelease
  ? `newest CHANGELOG.md release heading "## [${changelogRelease}]"`
  : `pom.xml <version>${pomVersion}</version>; no release heading in CHANGELOG.md`;

if (
  changelogRelease &&
  pomBaseVersion &&
  compareVersionCores(changelogRelease, pomBaseVersion) > 0
) {
  errors.push(
    `CHANGELOG.md: Newest release heading "## [${changelogRelease}]" is newer than pom.xml <version>${pomVersion}</version>.`
  );
}

// A release commit (non-SNAPSHOT pom) must add its own dated heading. Otherwise every snippet and
// <latest-release.version> would still pass against the previous release, and release.yml would
// extract empty release notes for the new tag.
if (
  pomVersion &&
  !pomVersion.endsWith('-SNAPSHOT') &&
  changelogRelease &&
  changelogRelease !== pomVersion
) {
  errors.push(
    `CHANGELOG.md: pom.xml <version>${pomVersion}</version> is a release, but the newest release heading is "## [${changelogRelease}]"; move the [Unreleased] entries under "## [${pomVersion}] - YYYY-MM-DD".`
  );
}

// index.md.vm interpolates this property, so it must track the newest release too.
const pomReleaseProperty: string | null = extractXmlTag(
  pomXml,
  RELEASE_VERSION_PROPERTY
);
if (!pomReleaseProperty) {
  errors.push(
    `pom.xml: Missing <${RELEASE_VERSION_PROPERTY}> property; set it to the latest released version (${latestReleaseVersion}).`
  );
} else if (pomReleaseProperty !== latestReleaseVersion) {
  errors.push(
    `pom.xml: <${RELEASE_VERSION_PROPERTY}>${pomReleaseProperty}</${RELEASE_VERSION_PROPERTY}> does not match the latest released version ${latestReleaseVersion} (${latestReleaseSource}); bump it when cutting a release.`
  );
}

const siteMarkdownFiles: string[] = fs
  .readdirSync(SITE_MARKDOWN_DIR)
  .filter((f: string) => f.endsWith('.md') || f.endsWith('.md.vm'));

const validSiteHtmlPages = new Set<string>(
  siteMarkdownFiles.map((f: string) =>
    f.replace(/\.md(?:\.vm)?$/, '.html').toLowerCase()
  )
);

const docFiles: string[] = [
  'README.md',
  'CHANGELOG.md',
  'AGENTS.md',
  'src/site/site.xml',
  ...siteMarkdownFiles.map((f: string) => path.join('src/site/markdown', f)),
];

for (const relPath of docFiles) {
  const absPath: string = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    errors.push(`${relPath}: File does not exist.`);
    continue;
  }
  const content: string = fs.readFileSync(absPath, 'utf8');

  // 0. Disallow referring to the project in prose as backticked `supa-maven-skin` instead of "Supa Maven Skin"
  if (content.includes('`supa-maven-skin`')) {
    errors.push(
      `${relPath}: Found backticked \`supa-maven-skin\` in documentation prose; refer to the project as "Supa Maven Skin" instead.`
    );
  }

  // 1. Validate internal page/file links and Markdown code fences
  validateInternalLinks(relPath, content, validSiteHtmlPages);
  if (relPath.endsWith('.md') || relPath.endsWith('.md.vm')) {
    validateMarkdownCodeFences(relPath, content);
  }

  // 2. Disallow wrong Bootstrap major version (e.g. "Bootstrap 5" when package.json is 6.x)
  const bootstrapMajorRegex = /\bBootstrap\s+(\d+)(?:\.\d+)?\b/g;
  let bsMatch: RegExpExecArray | null;
  while ((bsMatch = bootstrapMajorRegex.exec(content)) !== null) {
    const statedMajor: string = bsMatch[1] ?? '';
    if (statedMajor !== bootstrapMajor) {
      errors.push(
        `${relPath}: Found "${bsMatch[0]}", which conflicts with package.json bootstrap "${bootstrapVersion}" (expected Bootstrap ${bootstrapMajor}).`
      );
    }
  }

  // 3. Verify explicit Bootstrap 6.x.y(-alpha.z) version strings match package.json
  const bootstrapExactRegex =
    /[Bb]ootstrap(?:\s+6)?[\s(`"']*(6\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/g;
  let exactMatch: RegExpExecArray | null;
  while ((exactMatch = bootstrapExactRegex.exec(content)) !== null) {
    const statedBootstrapVer: string = exactMatch[1] ?? '';
    if (statedBootstrapVer !== bootstrapVersion) {
      errors.push(
        `${relPath}: Found Bootstrap version "${statedBootstrapVer}", expected "${bootstrapVersion}" from package.json.`
      );
    }
  }

  // 4. Verify skin <version> snippets (raw, HTML-escaped, or "+" diff lines) in README.md and
  // src/site/ show the latest released version that consumers can actually resolve.
  const isUserFacingDoc: boolean =
    relPath === 'README.md' || relPath.startsWith('src/site/');
  const isVelocityPage: boolean = relPath.endsWith('.md.vm');
  const skinBlockRegex =
    /(?:<artifactId>|&lt;artifactId&gt;)(supa-maven-skin|\$\{project\.artifactId\})(?:<\/artifactId>|&lt;\/artifactId&gt;)\s*\+?\s*(?:<version>|&lt;version&gt;)([^<&]+)(?:<\/version>|&lt;\/version&gt;)/g;
  let skinMatch: RegExpExecArray | null;
  while (isUserFacingDoc && (skinMatch = skinBlockRegex.exec(content)) !== null) {
    // ${project.artifactId} only names this skin as an install instruction on our own .md.vm
    // pages. Elsewhere it is skipped: in plain .md tutorials it is a literal placeholder for the
    // reader's own project, and src/site/site.xml declares the self-site skin as
    // ${project.groupId}:${project.artifactId}:${project.version} because the self-site must render
    // with the skin built in this same reactor, not a released one.
    if (skinMatch[1] !== 'supa-maven-skin' && !isVelocityPage) {
      continue;
    }
    const statedSkinVer: string = (skinMatch[2] ?? '').trim();
    const isReleaseProperty: boolean =
      isVelocityPage && statedSkinVer === RELEASE_VERSION_VELOCITY_EXPR;
    if (statedSkinVer !== latestReleaseVersion && !isReleaseProperty) {
      const hint: string = isVelocityPage
        ? ` or ${RELEASE_VERSION_VELOCITY_EXPR}`
        : '';
      errors.push(
        `${relPath}: supa-maven-skin <version>${statedSkinVer}</version> must be the latest released version ${latestReleaseVersion}${hint} (${latestReleaseSource}).`
      );
    }
  }

  // 4b. -SNAPSHOT builds are not resolvable by consumer builds, so no SNAPSHOT version (current or
  // stale) may appear in user-facing docs. The one exception is the pre-release fallback, where the
  // pom SNAPSHOT *is* the expected version because nothing has been released yet.
  if (isUserFacingDoc) {
    const snapshotRegex = /\b\d+\.\d+\.\d+-SNAPSHOT\b/g;
    for (const snapshot of new Set<string>(content.match(snapshotRegex) ?? [])) {
      if (snapshot !== latestReleaseVersion) {
        errors.push(
          `${relPath}: Found development version "${snapshot}"; user-facing docs must show the latest released version ${latestReleaseVersion} (${latestReleaseSource}).`
        );
      }
    }
  }

  // 4c. Skin version badges (`v1.2.3` inside a `.badge`) and "Version 1.2.3" example copy (raw,
  // backticked, or <code>, optionally HTML-escaped) must track the latest release too, so they do
  // not go stale after the next release. The patterns are capitalized and badge-scoped so prose
  // such as "maven-site-plugin version 3.21.0" is not caught.
  const versionCopyRegex =
    /(?:class="(?:[^"]*\s)?badge\b[^"]*"\s*(?:>|&gt;)v|\bVersion\s+(?:`|<code>|&lt;code&gt;)?)(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g;
  let copyMatch: RegExpExecArray | null;
  while (isUserFacingDoc && (copyMatch = versionCopyRegex.exec(content)) !== null) {
    const statedCopyVer: string = copyMatch[1] ?? '';
    if (statedCopyVer !== latestReleaseVersion) {
      errors.push(
        `${relPath}: Skin version badge or copy "${statedCopyVer}" must show the latest released version ${latestReleaseVersion} (${latestReleaseSource}).`
      );
    }
  }

  // 5. Verify <artifactId>maven-site-plugin</artifactId> version snippets match pom.xml
  const sitePluginRegex =
    /<artifactId>maven-site-plugin<\/artifactId>\s*<version>([^<]+)<\/version>/g;
  let sitePluginMatch: RegExpExecArray | null;
  while ((sitePluginMatch = sitePluginRegex.exec(content)) !== null) {
    const statedSiteVer: string = (sitePluginMatch[1] ?? '').trim();
    if (
      statedSiteVer !== mavenSitePluginVersion &&
      statedSiteVer !== '${maven-site-plugin.version}'
    ) {
      errors.push(
        `${relPath}: maven-site-plugin <version>${statedSiteVer}</version> does not match pom.xml <maven-site-plugin.version>${mavenSitePluginVersion}</maven-site-plugin.version>.`
      );
    }
  }

  // 6. Verify <artifactId>doxia-module-markdown</artifactId> version snippets match pom.xml
  const doxiaBlockRegex =
    /<artifactId>doxia-module-markdown<\/artifactId>\s*<version>([^<]+)<\/version>/g;
  let doxiaMatch: RegExpExecArray | null;
  while ((doxiaMatch = doxiaBlockRegex.exec(content)) !== null) {
    const statedDoxiaVer: string = (doxiaMatch[1] ?? '').trim();
    if (statedDoxiaVer !== doxiaVersion && statedDoxiaVer !== '${doxia.version}') {
      errors.push(
        `${relPath}: doxia-module-markdown <version>${statedDoxiaVer}</version> does not match pom.xml <doxia.version>${doxiaVersion}</doxia.version>.`
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Docs Version Linter found version alignment errors:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(
  `Docs Version Linter checked ${docFiles.length} documentation file(s) against pom.xml (${pomVersion}, latest release ${latestReleaseVersion}) and package.json (bootstrap ${bootstrapVersion}) with 0 violations.`
);
