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
 * Creates a Vite plugin that fails the build when the bundles contain an npm package missing from
 * the license manifest (`scripts/bundled-licenses.ts`), copies the project's `LICENSE` and every
 * bundled package's license into `target/classes/META-INF/`, and prepends a legal attribution
 * banner to the emitted CSS and JS bundles.
 *
 * @returns Vite plugin instance.
 */
function bundleLicensesPlugin(): Plugin {
  return {
    name: 'supa-bundle-licenses',
    /**
     * Fails the build when a bundled npm package has no license manifest entry, so a new or
     * transitive dependency (e.g. a Bootstrap peer dependency) cannot ship without its notice.
     *
     * @param _options - Output options (unused).
     * @param bundle - Emitted chunks and assets.
     */
    generateBundle(_options, bundle) {
      const bundled = sassBundledPackages();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue;
        }
        for (const moduleId of output.moduleIds) {
          const name = packageNameFromModuleId(moduleId);
          if (name) {
            bundled.add(name);
          }
        }
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

      const pkgSummaries: string[] = [];

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

        pkgSummaries.push(`${pkg.name}${version ? ` ${version}` : ''} (${pkg.spdx})`);

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
      const banner = [
        '/*!',
        ` * Supa Maven Skin v${skinVersion} (https://github.com/mepcotterell/supa-maven-skin)`,
        ' * Copyright (c) 2026 Michael E. Cotterell. Licensed under the MIT License (META-INF/LICENSE).',
        ` * Bundles ${pkgSummaries.join(', ')} — see META-INF/THIRD-PARTY-LICENSES.txt.`,
        ' */'
      ].join('\n');

      prependLicenseBanner(resolve(outDir, 'css/supa-maven-skin.min.css'), banner);
      prependLicenseBanner(resolve(outDir, 'js/supa-maven-skin.min.js'), banner);
    }
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  plugins: [bundleLicensesPlugin()],
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
        'supa-maven-skin': resolve(import.meta.dirname, 'ts/index.ts')
      },
      output: {
        format: 'es',
        entryFileNames: 'js/supa-maven-skin.min.js',
        chunkFileNames: 'js/[name].min.js',
        codeSplitting: false,
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
