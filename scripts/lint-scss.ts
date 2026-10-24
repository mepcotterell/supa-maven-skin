/**
 * @fileoverview SCSS syntax, formatting, and WCAG 2.2 AA/AAA contrast linter for Supa Maven Skin.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { ChildNode, Declaration, Root, Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import * as sass from 'sass-embedded';

interface LightDarkHexPair {
  light: string;
  dark: string;
}

type Polarity = 'light' | 'dark';

interface PaletteTokenEntry {
  hexPair?: LightDarkHexPair;
  wcagLevel?: string;
}

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

/**
 * Computes WCAG 2.2 relative luminance for a 6-digit hex color (`#rrggbb`).
 *
 * @param hex - Six-digit hex color string (with or without leading `#`).
 * @returns Relative luminance in the range `[0, 1]`.
 */
function hexLuminance(hex: string): number {
  const clean: string = hex.replace(/^#/, '');
  const r: number = parseInt(clean.slice(0, 2), 16) / 255;
  const g: number = parseInt(clean.slice(2, 4), 16) / 255;
  const b: number = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes the WCAG 2.2 contrast ratio between two 6-digit hex colors.
 *
 * @param hex1 - First 6-digit hex color string.
 * @param hex2 - Second 6-digit hex color string.
 * @returns Contrast ratio in the range `[1, 21]`.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1: number = hexLuminance(hex1);
  const l2: number = hexLuminance(hex2);
  const lighter: number = Math.max(l1, l2);
  const darker: number = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extracts light and dark hex colors from a CSS `light-dark(#light, #dark)` expression.
 *
 * @param value - Raw CSS declaration value string.
 * @returns Parsed polarity hex pair, or null if not matched.
 */
function parseLightDarkHex(value: string): LightDarkHexPair | null {
  const match = value.match(
    /light-dark\(\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)/
  );
  if (!match || !match[1] || !match[2]) {
    return null;
  }
  return { light: match[1], dark: match[2] };
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

// 5. WCAG 2.2 Contrast Audit across all 6 built-in accessible palettes (12 light/dark polarities)
if (compiledCss) {
  const cssRoot: Root = postcssScss.parse(compiledCss);
  const paletteTokens = new Map<string, Map<string, PaletteTokenEntry>>();

  cssRoot.walkRules((rule: Rule) => {
    for (const paletteId of [
      'furo',
      'bootstrap',
      'modus',
      'modus-tinted',
      'modus-deuteranopia',
      'modus-tritanopia'
    ]) {
      const selectorToken = `[data-supa-palette="${paletteId}"]`;
      if (rule.selector.includes(selectorToken)) {
        if (!paletteTokens.has(paletteId)) {
          paletteTokens.set(paletteId, new Map<string, PaletteTokenEntry>());
        }
        const map = paletteTokens.get(paletteId)!;
        for (const node of rule.nodes ?? []) {
          if (node.type === 'decl' && node.prop.startsWith('--')) {
            const parsed: LightDarkHexPair | null = parseLightDarkHex(node.value);
            if (parsed) {
              map.set(node.prop, { hexPair: parsed });
            } else if (node.prop === '--supa-wcag-level') {
              map.set(node.prop, {
                wcagLevel: node.value.replace(/["']/g, '').trim()
              });
            }
          }
        }
      }
    }
  });

  const foregroundTokenNames: readonly string[] = [
    '--color-foreground-primary',
    '--color-foreground-secondary',
    '--color-foreground-muted',
    '--color-brand-primary',
    '--color-brand-content',
    '--supa-admonition-note-accent',
    '--supa-admonition-tip-accent',
    '--supa-admonition-important-accent',
    '--supa-admonition-warning-accent',
    '--supa-admonition-caution-accent',
    '--supa-admonition-todo-accent'
  ];

  const polarities: readonly Polarity[] = ['light', 'dark'];

  for (const [paletteId, tokens] of paletteTokens.entries()) {
    const wcagLevel: string = tokens.get('--supa-wcag-level')?.wcagLevel || 'AA';
    const minTextContrast: number = wcagLevel === 'AAA' ? 7.0 : 4.5;
    const minBorderContrast: number = wcagLevel === 'AAA' ? 4.5 : 3.0;

    const bgPrimary: LightDarkHexPair | undefined = tokens.get(
      '--color-background-primary'
    )?.hexPair;
    const bgSecondary: LightDarkHexPair | undefined = tokens.get(
      '--color-background-secondary'
    )?.hexPair;

    if (!bgPrimary || !bgSecondary) {
      violations.push(
        `Palette '${paletteId}' is missing --color-background-primary or --color-background-secondary.`
      );
      continue;
    }

    for (const polarity of polarities) {
      for (const fgToken of foregroundTokenNames) {
        const fg: LightDarkHexPair | undefined = tokens.get(fgToken)?.hexPair;
        if (!fg) {
          violations.push(`Palette '${paletteId}' is missing required token '${fgToken}'.`);
          continue;
        }
        const bgPairs: Array<[string, string]> = [
          ['--color-background-primary', bgPrimary[polarity]],
          ['--color-background-secondary', bgSecondary[polarity]]
        ];
        for (const [bgLabel, bgHex] of bgPairs) {
          const ratio: number = contrastRatio(fg[polarity], bgHex);
          if (ratio < minTextContrast) {
            violations.push(
              `WCAG 2.2 ${wcagLevel} violation in palette '${paletteId}' (${polarity}): ${fgToken} (${fg[polarity]}) on ${bgLabel} (${bgHex}) has contrast ${ratio.toFixed(2)}:1 (minimum ${minTextContrast.toFixed(1)}:1).`
            );
          }
        }
      }

      const fgBorder: LightDarkHexPair | undefined = tokens.get(
        '--color-foreground-border'
      )?.hexPair;
      if (fgBorder) {
        const borderRatio: number = contrastRatio(fgBorder[polarity], bgPrimary[polarity]);
        if (borderRatio < minBorderContrast) {
          violations.push(
            `WCAG 2.2 1.4.11 Non-text contrast violation in palette '${paletteId}' (${polarity}): --color-foreground-border (${fgBorder[polarity]}) on --color-background-primary (${bgPrimary[polarity]}) has contrast ${borderRatio.toFixed(2)}:1 (minimum ${minBorderContrast.toFixed(1)}:1).`
          );
        }
      }
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
    `SCSS Linter checked ${files.length} files and verified WCAG 2.2 AA/AAA contrast across 6 palettes (12 polarities) with 0 violations.`
  );
}
