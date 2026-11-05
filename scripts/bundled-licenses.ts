/**
 * @fileoverview Third-party license manifest for every npm package compiled into the skin's
 * CSS and JS bundles, plus the coverage check that keeps it complete. `vite.config.ts` uses the
 * manifest to write `META-INF/THIRD-PARTY-LICENSES.txt`, `META-INF/licenses/LICENSE-*.txt`, and
 * the `/*! ... *\/` bundle banners, and fails the build when the bundles contain a package the
 * manifest does not list. The 0.1.0 JAR shipped Bootstrap's peer dependencies
 * (`vanilla-calendar-pro`, `@floating-ui/*`) without their notices because the list was kept by
 * hand; the check exists so transitive packages can no longer slip in silently.
 */

/** License metadata for one npm package compiled into the skin bundles. */
export interface BundledPackageLicense {
  /** npm package name, e.g. `bootstrap` or `@floating-ui/dom`. */
  name: string;
  /** SPDX license identifier. */
  spdx: string;
  /** Upstream source repository URL. */
  url: string;
  /** File name written under `META-INF/licenses/`. */
  outputFileName: string;
}

/**
 * Every package whose code or assets end up in `css/supa-maven-skin.min.css`,
 * `js/supa-maven-skin.min.js`, a lazily loaded `js/supa-maven-skin-*.min.js` chunk, or
 * `css/fonts/`. Bootstrap and Bootstrap Icons reach the CSS via
 * Sass `@use`; the rest are JS modules. `@floating-ui/*` and `vanilla-calendar-pro` are Bootstrap 6
 * peer dependencies imported by the bundled Tooltip/Popover/Menu and Datepicker plugins.
 */
export const BUNDLED_LICENSES: readonly BundledPackageLicense[] = [
  {
    name: 'bootstrap',
    spdx: 'MIT',
    url: 'https://github.com/twbs/bootstrap',
    outputFileName: 'LICENSE-bootstrap.txt'
  },
  {
    name: 'bootstrap-icons',
    spdx: 'MIT',
    url: 'https://github.com/twbs/icons',
    outputFileName: 'LICENSE-bootstrap-icons.txt'
  },
  {
    name: 'highlight.js',
    spdx: 'BSD-3-Clause',
    url: 'https://github.com/highlightjs/highlight.js',
    outputFileName: 'LICENSE-highlight.js.txt'
  },
  {
    name: 'vanilla-calendar-pro',
    spdx: 'MIT',
    url: 'https://github.com/uvarov-frontend/vanilla-calendar-pro',
    outputFileName: 'LICENSE-vanilla-calendar-pro.txt'
  },
  {
    name: '@floating-ui/dom',
    spdx: 'MIT',
    url: 'https://github.com/floating-ui/floating-ui',
    outputFileName: 'LICENSE-floating-ui-dom.txt'
  },
  {
    name: '@floating-ui/core',
    spdx: 'MIT',
    url: 'https://github.com/floating-ui/floating-ui',
    outputFileName: 'LICENSE-floating-ui-core.txt'
  },
  {
    name: '@floating-ui/utils',
    spdx: 'MIT',
    url: 'https://github.com/floating-ui/floating-ui',
    outputFileName: 'LICENSE-floating-ui-utils.txt'
  }
];

/**
 * Extracts the npm package name from a bundler module id. The innermost `node_modules` segment
 * wins, so a nested install (`a/node_modules/b/...`) is attributed to `b`, the package whose code
 * is actually bundled. Query strings, virtual-module `\0` prefixes, and Windows separators are
 * tolerated.
 *
 * @param moduleId - Absolute module id reported by Rollup/Rolldown.
 * @returns Package name, or `null` for the skin's own sources and virtual modules.
 */
export function packageNameFromModuleId(moduleId: string): string | null {
  const normalized: string = moduleId.replace(/\\/g, '/').split('?')[0] ?? '';
  const marker = '/node_modules/';
  const index: number = normalized.lastIndexOf(marker);
  if (index < 0) {
    return null;
  }
  const segments: string[] = normalized.slice(index + marker.length).split('/');
  const first: string = segments[0] ?? '';
  if (!first) {
    return null;
  }
  if (first.startsWith('@')) {
    const second: string = segments[1] ?? '';
    return second ? `${first}/${second}` : null;
  }
  return first;
}

/**
 * Lists the module specifiers that a Sass file loads with `@use`, `@forward`, or `@import`.
 *
 * @param scss - Sass source text.
 * @returns Specifiers in source order, e.g. `bootstrap/scss/bootstrap` or `variables`.
 */
export function sassModuleSpecifiers(scss: string): string[] {
  const specifiers: string[] = [];
  const directiveRegex = /@(?:use|forward|import)\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = directiveRegex.exec(scss)) !== null) {
    specifiers.push(match[1] ?? '');
  }
  return specifiers.filter((specifier) => specifier.length > 0);
}

/**
 * Resolves a Sass specifier to the npm package it loads from, if any. Sass's built-in modules
 * (`sass:math`), URLs, and relative or local partials (`variables`, `./layout`) are not packages.
 * A bare specifier counts as a package only when its first path segment is an installed package,
 * so a local partial is never mistaken for a dependency unless it shares an installed package's
 * name (which then errs on the side of requiring a license entry).
 *
 * @param specifier - Specifier from {@link sassModuleSpecifiers}.
 * @param isInstalledPackage - Returns whether `node_modules/<name>` exists.
 * @returns Package name, or `null` when the specifier is not an npm package.
 */
export function packageNameFromSassSpecifier(
  specifier: string,
  isInstalledPackage: (name: string) => boolean
): string | null {
  const bare: string = specifier.replace(/^(?:pkg:|~)/, '');
  if (/^(?:sass:|[a-z]+:\/\/|\.{1,2}\/|\/)/.test(bare)) {
    return null;
  }
  const segments: string[] = bare.split('/');
  const first: string = segments[0] ?? '';
  const name: string = first.startsWith('@') ? `${first}/${segments[1] ?? ''}` : first;
  return name && isInstalledPackage(name) ? name : null;
}

/**
 * Finds bundled packages that have no entry in the license manifest.
 *
 * @param bundledPackages - Package names found in the bundles.
 * @param manifest - License manifest to check against.
 * @returns Sorted, de-duplicated names of packages missing from the manifest.
 */
export function findUnlicensedPackages(
  bundledPackages: Iterable<string>,
  manifest: readonly BundledPackageLicense[] = BUNDLED_LICENSES
): string[] {
  const licensed = new Set<string>(manifest.map((entry) => entry.name));
  const missing = new Set<string>();
  for (const name of bundledPackages) {
    if (!licensed.has(name)) {
      missing.add(name);
    }
  }
  return [...missing].sort();
}
