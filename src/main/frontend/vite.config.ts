/**
 * @fileoverview Vite bundler and Vitest unit test configuration for Supa Maven Skin.
 */
import fs from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import {
  BUNDLED_LICENSES,
  findUnlicensedPackages,
  packageNameFromModuleId,
  packageNameFromSassSpecifier,
  sassModuleSpecifiers
} from '../../../scripts/bundled-licenses.ts';

const rootDir = resolve(import.meta.dirname, '../../..');
const outDir = resolve(rootDir, 'target/classes');
/** Base name of the JS entry; lazily loaded chunks are named `<base>-<chunk>.min.js` beside it. */
const JS_ENTRY_NAME = 'supa-maven-skin';

/**
 * Returns whether an npm package is installed in the repository's `node_modules/`.
 *
 * @param name - npm package name, possibly scoped.
 * @returns `true` when `node_modules/<name>/package.json` exists.
 */
function isInstalledPackage(name: string): boolean {
  return fs.existsSync(resolve(rootDir, 'node_modules', name, 'package.json'));
}

/**
 * Collects the npm packages the skin's Sass partials load with `@use`/`@forward`/`@import`.
 * Sass resolves these outside the bundler's module graph, so they never appear in a chunk's
 * module ids and must be found from the sources instead.
 *
 * @returns Package names loaded by the Sass sources.
 */
function sassBundledPackages(): Set<string> {
  const scssDir = resolve(import.meta.dirname, 'scss');
  const packages = new Set<string>();
  for (const file of fs.readdirSync(scssDir).filter((f) => f.endsWith('.scss'))) {
    for (const specifier of sassModuleSpecifiers(fs.readFileSync(resolve(scssDir, file), 'utf8'))) {
      const name = packageNameFromSassSpecifier(specifier, isInstalledPackage);
      if (name) {
        packages.add(name);
      }
    }
  }
  return packages;
}

/**
 * Prepends a `/*! ... * /` legal attribution banner to a bundled asset file if not already present.
 *
 * @param filePath - Absolute path to the emitted CSS or JS bundle file.
 * @param banner - Multi-line `/*! ... * /` comment header to prepend.
 */
function prependLicenseBanner(filePath: string, banner: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const existing = fs.readFileSync(filePath, 'utf8');
  if (existing.startsWith(banner)) {
    return;
  }
  fs.writeFileSync(filePath, `${banner}\n${existing}`, 'utf8');
}

/**
 * Deletes JS files under `target/classes/js/` that the current build did not emit. The output
 * directory is not emptied between builds (it also holds `META-INF/`), so a chunk that was renamed
 * or merged would otherwise linger and be packaged into the skin JAR.
 *
 * @param emitted - File names (relative to `target/classes/`) the build emitted.
 */
function removeStaleScripts(emitted: ReadonlySet<string>): void {
  const jsDir = resolve(outDir, 'js');
  if (!fs.existsSync(jsDir)) {
    return;
  }
  for (const file of fs.readdirSync(jsDir)) {
    if (file.endsWith('.js') && !emitted.has(`js/${file}`)) {
      fs.rmSync(resolve(jsDir, file));
    }
  }
}

/**
 * Builds a `/*! ... * /` legal attribution banner.
 *
 * @param skinVersion - Supa Maven Skin version from `package.json`.
 * @param packageSummaries - `name version (SPDX)` of each npm package compiled into the asset.
 * @returns Banner comment without a trailing newline.
 */
function legalBanner(skinVersion: string, packageSummaries: readonly string[]): string {
  const lines = [
    '/*!',
    ` * Supa Maven Skin v${skinVersion} (https://github.com/mepcotterell/supa-maven-skin)`,
    ' * Copyright (c) 2026 Michael E. Cotterell. Licensed under the MIT License (META-INF/LICENSE).'
  ];
  if (packageSummaries.length > 0) {
    lines.push(` * Bundles ${packageSummaries.join(', ')} — see META-INF/THIRD-PARTY-LICENSES.txt.`);
  }
  lines.push(' */');
  return lines.join('\n');
}

/**
 * Creates a Vite plugin that fails the build when the bundles contain an npm package missing from
 * the license manifest (`scripts/bundled-licenses.ts`), copies the project's `LICENSE` and every
 * bundled package's license into `target/classes/META-INF/`, prepends a legal attribution banner
 * to the emitted CSS and JS bundles and to every lazily loaded JS chunk, and removes JS files a
 * previous build left behind.
 *
 * @returns Vite plugin instance.
 */
function bundleLicensesPlugin(): Plugin {
  /** npm packages compiled into each emitted JS file, keyed by its path under `target/classes/`. */
  const chunkPackages = new Map<string, Set<string>>();
  return {
    name: 'supa-bundle-licenses',
    // Vitest loads this config too, and its dev server calls `closeBundle` when it shuts down
    // without having bundled anything.
    apply: 'build',
    /**
     * Fails the build when a bundled npm package has no license manifest entry, so a new or
     * transitive dependency (e.g. a Bootstrap peer dependency) cannot ship without its notice.
     * Every emitted chunk is checked, the entry and the lazily loaded ones alike.
     *
     * @param _options - Output options (unused).
     * @param bundle - Emitted chunks and assets.
     */
    generateBundle(_options, bundle) {
      const bundled = sassBundledPackages();
      chunkPackages.clear();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue;
        }
        const packages = new Set<string>();
        for (const moduleId of output.moduleIds) {
          const name = packageNameFromModuleId(moduleId);
          if (name) {
            bundled.add(name);
            packages.add(name);
          }
        }
        chunkPackages.set(output.fileName, packages);
      }
      const missing = findUnlicensedPackages(bundled);
      if (missing.length > 0) {
        this.error(
          `Bundled npm package(s) without a license entry: ${missing.join(', ')}. ` +
            'Add each to BUNDLED_LICENSES in scripts/bundled-licenses.ts so its notice ships in ' +
            'META-INF/THIRD-PARTY-LICENSES.txt.'
        );
      }
    },
    /**
     * Writes `META-INF/LICENSE`, `META-INF/THIRD-PARTY-LICENSES.txt`, individual
     * `META-INF/licenses/LICENSE-*.txt` files, and CSS/JS legal banners after bundling.
     */
    closeBundle() {
      // Only after a bundle was generated: a build that failed earlier emitted nothing to keep.
      if (chunkPackages.size > 0) {
        removeStaleScripts(new Set(chunkPackages.keys()));
      }

      const metaInfDir = resolve(outDir, 'META-INF');
      const licensesDir = resolve(metaInfDir, 'licenses');
      fs.mkdirSync(licensesDir, { recursive: true });

      const projectLicensePath = resolve(rootDir, 'LICENSE');
      if (fs.existsSync(projectLicensePath)) {
        fs.copyFileSync(projectLicensePath, resolve(metaInfDir, 'LICENSE'));
      }

      const pkgJson = JSON.parse(
        fs.readFileSync(resolve(rootDir, 'package.json'), 'utf8')
      ) as { version?: string };

      const summarySections: string[] = [
        'Supa Maven Skin - Third-Party Bundled Asset Licenses',
        '====================================================',
        '',
        'This JAR bundles compiled CSS, JavaScript, and font assets from the following',
        'open-source packages:',
        ''
      ];

      const pkgSummaries = new Map<string, string>();

      for (const pkg of BUNDLED_LICENSES) {
        // Read the installed package rather than the package.json range: transitive packages
        // (@floating-ui/core, @floating-ui/utils) have no range there, and the notice should name
        // the version that was actually compiled in.
        const pkgDir = resolve(rootDir, 'node_modules', pkg.name);
        const installed = JSON.parse(
          fs.readFileSync(resolve(pkgDir, 'package.json'), 'utf8')
        ) as { version?: string };
        const version = installed.version ?? '';
        const licenseText = fs.readFileSync(resolve(pkgDir, 'LICENSE'), 'utf8').trim();
        fs.writeFileSync(resolve(licensesDir, pkg.outputFileName), `${licenseText}\n`, 'utf8');

        pkgSummaries.set(pkg.name, `${pkg.name}${version ? ` ${version}` : ''} (${pkg.spdx})`);

        summarySections.push(
          '--------------------------------------------------------------------------------',
          `Package: ${pkg.name}${version ? ` (${version})` : ''}`,
          `License: ${pkg.spdx}`,
          `Source:  ${pkg.url}`,
          `File:    META-INF/licenses/${pkg.outputFileName}`,
          '--------------------------------------------------------------------------------',
          '',
          licenseText,
          ''
        );
      }

      fs.writeFileSync(
        resolve(metaInfDir, 'THIRD-PARTY-LICENSES.txt'),
        `${summarySections.join('\n').trim()}\n`,
        'utf8'
      );

      const skinVersion = pkgJson.version ?? '0.1.0';
      // The stylesheet and the JS entry, which every page loads, name every package the skin
      // bundles. A lazily loaded chunk names only the packages compiled into it, which keeps the
      // banner from outweighing the smaller chunks.
      const banner = legalBanner(skinVersion, [...pkgSummaries.values()]);
      const entryFile = `js/${JS_ENTRY_NAME}.min.js`;

      prependLicenseBanner(resolve(outDir, 'css/supa-maven-skin.min.css'), banner);
      prependLicenseBanner(resolve(outDir, entryFile), banner);
      for (const [fileName, packages] of chunkPackages) {
        if (fileName === entryFile) {
          continue;
        }
        const summaries = BUNDLED_LICENSES.filter((pkg) => packages.has(pkg.name)).map(
          (pkg) => pkgSummaries.get(pkg.name) ?? pkg.name
        );
        prependLicenseBanner(resolve(outDir, fileName), legalBanner(skinVersion, summaries));
      }
    }
  };
}

/**
 * Creates a Vite plugin that fails the build unless the JS output is one self-contained entry
 * plus lazily loaded chunks. A static import in the entry would make every page fetch a second
 * script before the skin starts, and a chunk that is neither the entry nor loaded by `import()`
 * is a common chunk Rolldown split off on its own (see `codeSplitting` below).
 *
 * @returns Vite plugin instance.
 */
function entryChunkGuardPlugin(): Plugin {
  return {
    name: 'supa-entry-chunk-guard',
    apply: 'build',
    /**
     * Checks the emitted chunks' roles and static imports.
     *
     * @param _options - Output options (unused).
     * @param bundle - Emitted chunks and assets.
     */
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue;
        }
        if (output.isEntry && output.imports.length > 0) {
          this.error(
            `${output.fileName} statically imports ${output.imports.join(', ')}, so every page ` +
              'would load more than one script. Keep shared modules in the entry chunk.'
          );
        }
        if (!output.isEntry && !output.isDynamicEntry) {
          this.error(
            `${output.fileName} is neither the entry nor a lazily loaded chunk. Keep shared ` +
              'modules in the entry chunk.'
          );
        }
      }
    }
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  plugins: [bundleLicensesPlugin(), entryChunkGuardPlugin()],
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true
      }
    }
  },
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: false,
    cssCodeSplit: false,
    minify: 'oxc',
    rolldownOptions: {
      input: {
        [JS_ENTRY_NAME]: resolve(import.meta.dirname, 'ts/index.ts')
      },
      output: {
        format: 'es',
        entryFileNames: `js/${JS_ENTRY_NAME}.min.js`,
        // Widgets only author content uses are split into chunks that `bootstrap-components.ts`
        // imports on demand. `import()` resolves against the importing module's URL, so chunks
        // beside the entry load from pages at any depth, and they import shared code back from
        // the entry under its one URL, so the page keeps a single copy of each module. Names are
        // unhashed like the skin's other assets: the JAR is versioned as a whole, and fixed names
        // let verify.bsh and the size check find each file.
        chunkFileNames: `js/${JS_ENTRY_NAME}-[name].min.js`,
        codeSplitting: {
          // A group that captures `index.ts` also captures every module it imports statically,
          // and holding the entry module makes the group's chunk the entry chunk. Without it,
          // Rolldown moves the modules the entry shares with every lazy chunk (Bootstrap's
          // `base-component.js` and its `dom/` and `util/` helpers) into a common chunk, which
          // every page would then fetch as a second script. `entryChunkGuardPlugin` fails the
          // build if such a chunk reappears.
          groups: [{ name: JS_ENTRY_NAME, test: /[\\/]src[\\/]main[\\/]frontend[\\/]ts[\\/]index\.ts$/ }]
        },
        /**
         * Routes emitted CSS and Bootstrap Icons font assets to their expected
         * Maven skin output paths under `target/classes/`.
         *
         * @param assetInfo - Rollup/Rolldown asset metadata.
         * @returns Relative output path for the emitted asset.
         */
        assetFileNames: (assetInfo) => {
          const names = assetInfo.names ?? (assetInfo.name ? [assetInfo.name] : []);
          if (names.some((n) => n.endsWith('.css'))) {
            return 'css/supa-maven-skin.min.css';
          }
          if (names.some((n) => n.endsWith('.woff2') || n.endsWith('.woff'))) {
            return 'css/fonts/[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  },
  test: {
    root: rootDir,
    environment: 'happy-dom',
    include: ['src/test/frontend/**/*.test.ts']
  }
});
