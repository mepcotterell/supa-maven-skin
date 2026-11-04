/**
 * @fileoverview SCSS syntax, formatting, and WCAG 2.2 AA/AAA contrast linter for Supa Maven Skin.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ChildNode, Declaration, Root, Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import * as sass from 'sass-embedded';
import {
  auditContrast,
  collectRootTokens,
  type ContrastAuditResult,
  PALETTE_IDS,
  POLARITIES
} from './contrast-audit.ts';

const rootDir: string = resolve(import.meta.dirname, '..');
const scssDir: string = join(rootDir, 'src/main/frontend/scss');

/**
 * Recursively collects all `.scss` files under a directory.
 *
 * @param dir - Absolute directory path to search.
 * @returns Sorted array of absolute `.scss` file paths.
 */
function findScssFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath: string = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findScssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.scss')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

const files: string[] = findScssFiles(scssDir);
const violations: string[] = [];

for (const filePath of files) {
  const relPath: string = relative(rootDir, filePath);
  const content: string = readFileSync(filePath, 'utf8');
  const lines: string[] = content.split('\n');

  // 1. Line-level checks: no tab characters, no trailing whitespace
  lines.forEach((line: string, idx: number) => {
    const lineNo: number = idx + 1;
    if (line.includes('\t')) {
      violations.push(`${relPath}:${lineNo}: Line contains a tab character (use spaces).`);
    }
    if (/[ \t]+$/.test(line.replace(/\r$/, ''))) {
      violations.push(`${relPath}:${lineNo}: Line has trailing whitespace.`);
    }
  });

  // 2. Parse SCSS AST with postcss-scss
  let root: Root;
  try {
    root = postcssScss.parse(content, { from: filePath });
  } catch (err: unknown) {
    const syntaxErr = err as { line?: number; column?: number; reason?: string; message?: string };
    violations.push(
      `${relPath}:${syntaxErr.line ?? 1}:${syntaxErr.column ?? 1}: SCSS syntax error: ${syntaxErr.reason ?? syntaxErr.message ?? String(err)}`
    );
    continue;
  }

  // 3. AST-level checks: empty blocks, duplicate properties within same block, invalid hex colors
  root.walkRules((rule: Rule) => {
    const nonCommentNodes: ChildNode[] = (rule.nodes ?? []).filter(
      (n: ChildNode) => n.type !== 'comment'
    );
    if (nonCommentNodes.length === 0) {
      const lineNo: number = rule.source?.start?.line ?? 1;
      violations.push(`${relPath}:${lineNo}: Empty rule block '${rule.selector}' (block-no-empty).`);
    }

    const seenProps = new Map<string, number>();
    for (const node of rule.nodes ?? []) {
      if (node.type === 'decl') {
        const prop: string = node.prop.toLowerCase();
        // Custom properties are case-sensitive
        const key: string = node.prop.startsWith('--') ? node.prop : prop;
        if (seenProps.has(key)) {
          const lineNo: number = node.source?.start?.line ?? 1;
          violations.push(
            `${relPath}:${lineNo}: Duplicate property '${node.prop}' in '${rule.selector}' (first declared on line ${seenProps.get(key)}).`
          );
        } else {
          seenProps.set(key, node.source?.start?.line ?? 1);
        }
      }
    }
  });

  root.walkDecls((decl: Declaration) => {
    const hexMatches = decl.value.matchAll(/#([0-9a-fA-F]+)\b/g);
    for (const match of hexMatches) {
      const hex: string = match[1] ?? '';
      if (![3, 4, 6, 8].includes(hex.length)) {
        const lineNo: number = decl.source?.start?.line ?? 1;
        violations.push(
          `${relPath}:${lineNo}: Invalid hex color '#${hex}' in '${decl.prop}: ${decl.value}'.`
        );
      }
    }
  });
}

// 4. Compile entrypoint with Dart Sass and verify WCAG 2.2 AA / AAA contrast across all built-in palettes
const mainScss: string = join(scssDir, 'main.scss');
let compiledCss = '';
try {
  const result = sass.compile(mainScss, {
    loadPaths: [join(rootDir, 'node_modules')],
    quietDeps: true,
    logger: {
      warn(message: string, options: sass.LoggerWarnOptions) {
        const spanUrl: string = options.span?.url?.pathname ?? '';
        if (!spanUrl.includes('node_modules')) {
          const lineNo: number = (options.span?.start?.line ?? 0) + 1;
          violations.push(`src/main/frontend/scss:${lineNo}: Sass warning: ${message}`);
        }
      }
    }
  });
  compiledCss = result.css;
} catch (err: unknown) {
  const message: string = err instanceof Error ? err.message : String(err);
  violations.push(`src/main/frontend/scss/main.scss: Sass compilation failed: ${message}`);
}

// 5. WCAG 2.2 contrast audit of every surface in SURFACE_AUDITS, for all 6 built-in palettes in
// both polarities (see contrast-audit.ts for how tokens are resolved and composited)
let contrastPairs = 0;
if (compiledCss) {
  const cssRoot: Root = postcssScss.parse(compiledCss);
  for (const paletteId of PALETTE_IDS) {
    // Dart Sass prints `[data-supa-palette=furo]` without quotes. Matching only the quoted form
    // once made this audit find no palette and pass without measuring anything, so a palette
    // whose rule cannot be found is itself a violation.
    const selectorPattern = new RegExp(`\\[data-supa-palette=(["']?)${paletteId}\\1\\]`);
    const hasPaletteRule: boolean = (cssRoot.nodes ?? []).some(
      (node: ChildNode) =>
        node.type === 'rule' && node.selectors.some((s: string) => selectorPattern.test(s))
    );
    if (!hasPaletteRule) {
      violations.push(
        `Palette '${paletteId}' has no [data-supa-palette="${paletteId}"] rule in the compiled CSS.`
      );
      continue;
    }
    for (const polarity of POLARITIES) {
      const tokens: Map<string, string> = collectRootTokens(cssRoot, {
        'data-supa-palette': paletteId,
        'data-bs-theme': polarity
      });
      const result: ContrastAuditResult = auditContrast(tokens, paletteId, polarity);
      contrastPairs += result.checked;
      violations.push(...result.violations);
    }
  }
}

if (violations.length > 0) {
  console.error(`SCSS Linter found ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log(
    `SCSS Linter checked ${files.length} files and verified WCAG 2.2 AA/AAA contrast of ${contrastPairs} foreground/surface pairs across ${PALETTE_IDS.length} palettes (${PALETTE_IDS.length * POLARITIES.length} polarities) with 0 violations.`
  );
}
