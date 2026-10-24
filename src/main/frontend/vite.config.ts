/**
 * @fileoverview Vite bundler and Vitest unit test configuration for Supa Maven Skin.
 */
import fs from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const rootDir = resolve(import.meta.dirname, '../../..');
const outDir = resolve(rootDir, 'target/classes');

interface BundledPackageLicense {
  name: string;
  spdx: string;
  url: string;
  licensePath: string;
  outputFileName: string;
}

const BUNDLED_LICENSES: BundledPackageLicense[] = [
  {
    name: 'bootstrap',
    spdx: 'MIT',
    url: 'https://github.com/twbs/bootstrap',
    licensePath: resolve(rootDir, 'node_modules/bootstrap/LICENSE'),
    outputFileName: 'LICENSE-bootstrap.txt'
  },
  {
    name: 'bootstrap-icons',
    spdx: 'MIT',
    url: 'https://github.com/twbs/icons',
    licensePath: resolve(rootDir, 'node_modules/bootstrap-icons/LICENSE'),
    outputFileName: 'LICENSE-bootstrap-icons.txt'
  },
  {
    name: 'highlight.js',
    spdx: 'BSD-3-Clause',
    url: 'https://github.com/highlightjs/highlight.js',
    licensePath: resolve(rootDir, 'node_modules/highlight.js/LICENSE'),
    outputFileName: 'LICENSE-highlight.js.txt'
  }
];

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
 * Creates a Vite plugin that copies the project's `LICENSE` and bundled third-party
 * runtime dependency licenses (`bootstrap`, `bootstrap-icons`, `highlight.js`) into
 * `target/classes/META-INF/` and prepends a legal attribution banner to the emitted
 * CSS and JS bundles.
 *
 * @returns Vite plugin instance.
 */
function bundleLicensesPlugin(): Plugin {
  return {
    name: 'supa-bundle-licenses',
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
      ) as { version?: string; dependencies?: Record<string, string> };

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
        const rawVer = pkgJson.dependencies?.[pkg.name] ?? '';
        const version = rawVer.replace(/^[\^~]/, '');
        const licenseText = fs.readFileSync(pkg.licensePath, 'utf8').trim();
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
