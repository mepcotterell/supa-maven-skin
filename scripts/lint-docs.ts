#!/usr/bin/env node
/**
 * @fileoverview Documentation, CHANGELOG.md, and version alignment linter for Supa Maven Skin.
 * Ensures that version numbers stated across README.md, CHANGELOG.md, AGENTS.md, and src/site/
 * strictly align with the authoritative sources in pom.xml and package.json, and verifies that
 * CHANGELOG.md follows Keep a Changelog 1.1.0 conventions.
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

const VALID_CHANGELOG_CATEGORIES = new Set<string>([
  'Added',
  'Changed',
  'Deprecated',
  'Removed',
  'Fixed',
  'Security',
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
const bootstrapVersion: string = (pkgJson.dependencies?.bootstrap ?? '').replace(
  /^[\^~]/,
  ''
);
const bootstrapMajor: string = bootstrapVersion.split('.')[0] ?? '';

if (!fs.existsSync(CHANGELOG_PATH)) {
  errors.push('CHANGELOG.md: File does not exist.');
} else {
  validateChangelog(
    fs.readFileSync(CHANGELOG_PATH, 'utf8'),
    pomVersion,
    pomBaseVersion
  );
}

const docFiles: string[] = [
  'README.md',
  'CHANGELOG.md',
  'AGENTS.md',
  'src/site/site.xml',
  ...fs
    .readdirSync(path.join(ROOT_DIR, 'src/site/markdown'))
    .filter((f: string) => f.endsWith('.md') || f.endsWith('.md.vm'))
    .map((f: string) => path.join('src/site/markdown', f)),
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

  // 1. Disallow wrong Bootstrap major version (e.g. "Bootstrap 5" when package.json is 6.x)
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

  // 2. Verify explicit Bootstrap 6.x.y(-alpha.z) version strings match package.json
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

  // 3. Verify <artifactId>supa-maven-skin</artifactId> version snippets match pom.xml <version>
  const skinBlockRegex =
    /(?:<artifactId>|&lt;artifactId&gt;)supa-maven-skin(?:<\/artifactId>|&lt;\/artifactId&gt;)\s*(?:<version>|&lt;version&gt;)([^<&]+)(?:<\/version>|&lt;\/version&gt;)/g;
  let skinMatch: RegExpExecArray | null;
  while ((skinMatch = skinBlockRegex.exec(content)) !== null) {
    const statedSkinVer: string = (skinMatch[1] ?? '').trim();
    if (statedSkinVer !== pomVersion) {
      errors.push(
        `${relPath}: supa-maven-skin <version>${statedSkinVer}</version> does not match pom.xml <version>${pomVersion}</version>.`
      );
    }
  }

  // 4. Verify <artifactId>maven-site-plugin</artifactId> version snippets match pom.xml
  const sitePluginRegex =
    /<artifactId>maven-site-plugin<\/artifactId>\s*<version>([^<]+)<\/version>/g;
  let sitePluginMatch: RegExpExecArray | null;
  while ((sitePluginMatch = sitePluginRegex.exec(content)) !== null) {
    const statedSiteVer: string = (sitePluginMatch[1] ?? '').trim();
    if (statedSiteVer !== mavenSitePluginVersion) {
      errors.push(
        `${relPath}: maven-site-plugin <version>${statedSiteVer}</version> does not match pom.xml <maven-site-plugin.version>${mavenSitePluginVersion}</maven-site-plugin.version>.`
      );
    }
  }

  // 5. Verify <artifactId>doxia-module-markdown</artifactId> version snippets match pom.xml
  const doxiaBlockRegex =
    /<artifactId>doxia-module-markdown<\/artifactId>\s*<version>([^<]+)<\/version>/g;
  let doxiaMatch: RegExpExecArray | null;
  while ((doxiaMatch = doxiaBlockRegex.exec(content)) !== null) {
    const statedDoxiaVer: string = (doxiaMatch[1] ?? '').trim();
    if (statedDoxiaVer !== doxiaVersion) {
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
  `Docs Version Linter checked ${docFiles.length} documentation file(s) against pom.xml (${pomVersion}) and package.json (bootstrap ${bootstrapVersion}) with 0 violations.`
);
