import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import postcssScss from 'postcss-scss';
import * as sass from 'sass-embedded';

const rootDir = resolve(import.meta.dirname, '..');
const scssDir = join(rootDir, 'src/main/frontend/scss');

/**
 * Recursively collects all .scss files under a directory.
 */
function findScssFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findScssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.scss')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

/**
 * Computes WCAG 2.2 relative luminance for a 6-digit hex color (#rrggbb).
 */
function hexLuminance(hex) {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG 2.2 contrast ratio between two hex colors.
 */
function contrastRatio(hex1, hex2) {
  const l1 = hexLuminance(hex1);
  const l2 = hexLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extracts light and dark hex colors from `light-dark(#light, #dark)`.
 */
function parseLightDarkHex(value) {
  const match = value.match(/light-dark\(\s*(#[0-9a-fA-F]{6})\s*,\s*(#[0-9a-fA-F]{6})\s*\)/);
  if (!match) {
    return null;
  }
  return { light: match[1], dark: match[2] };
}

const files = findScssFiles(scssDir);
const violations = [];

for (const filePath of files) {
  const relPath = relative(rootDir, filePath);
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // 1. Line-level checks: no tab characters, no trailing whitespace
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (line.includes('\t')) {
      violations.push(`${relPath}:${lineNo}: Line contains a tab character (use spaces).`);
    }
    if (/[ \t]+$/.test(line.replace(/\r$/, ''))) {
      violations.push(`${relPath}:${lineNo}: Line has trailing whitespace.`);
    }
  });

  // 2. Parse SCSS AST with postcss-scss
  let root;
  try {
    root = postcssScss.parse(content, { from: filePath });
  } catch (err) {
    violations.push(`${relPath}:${err.line ?? 1}:${err.column ?? 1}: SCSS syntax error: ${err.reason ?? err.message}`);
    continue;
  }

  // 3. AST-level checks: empty blocks, duplicate properties within same block, invalid hex colors
  root.walkRules((rule) => {
    const nonCommentNodes = (rule.nodes ?? []).filter((n) => n.type !== 'comment');
    if (nonCommentNodes.length === 0) {
      const lineNo = rule.source?.start?.line ?? 1;
      violations.push(`${relPath}:${lineNo}: Empty rule block '${rule.selector}' (block-no-empty).`);
    }

    const seenProps = new Map();
    for (const node of rule.nodes ?? []) {
      if (node.type === 'decl') {
        const prop = node.prop.toLowerCase();
        // Custom properties are case-sensitive
        const key = node.prop.startsWith('--') ? node.prop : prop;
        if (seenProps.has(key)) {
          const lineNo = node.source?.start?.line ?? 1;
          violations.push(
            `${relPath}:${lineNo}: Duplicate property '${node.prop}' in '${rule.selector}' (first declared on line ${seenProps.get(key)}).`
          );
        } else {
          seenProps.set(key, node.source?.start?.line ?? 1);
        }
      }
    }
  });

  root.walkDecls((decl) => {
    const hexMatches = decl.value.matchAll(/#([0-9a-fA-F]+)\b/g);
    for (const match of hexMatches) {
      const hex = match[1];
      if (![3, 4, 6, 8].includes(hex.length)) {
        const lineNo = decl.source?.start?.line ?? 1;
        violations.push(`${relPath}:${lineNo}: Invalid hex color '#${hex}' in '${decl.prop}: ${decl.value}'.`);
      }
    }
  });
}

// 4. Compile entrypoint with Dart Sass and verify WCAG 2.2 AA / AAA contrast across all built-in palettes
const mainScss = join(scssDir, 'main.scss');
let compiledCss = '';
try {
  const result = sass.compile(mainScss, {
    loadPaths: [join(rootDir, 'node_modules')],
    quietDeps: true,
    logger: {
      warn(message, options) {
        const spanUrl = options.span?.url?.pathname ?? '';
        if (!spanUrl.includes('node_modules')) {
          const lineNo = (options.span?.start?.line ?? 0) + 1;
          violations.push(`src/main/frontend/scss:${lineNo}: Sass warning: ${message}`);
        }
      }
    }
  });
  compiledCss = result.css;
} catch (err) {
  violations.push(`src/main/frontend/scss/main.scss: Sass compilation failed: ${err.message}`);
}

// 5. WCAG 2.2 Contrast Audit across all 6 built-in accessible palettes (12 light/dark polarities)
if (compiledCss) {
  const cssRoot = postcssScss.parse(compiledCss);
  const paletteTokens = new Map();

  cssRoot.walkRules((rule) => {
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
          paletteTokens.set(paletteId, new Map());
        }
        const map = paletteTokens.get(paletteId);
        for (const node of rule.nodes ?? []) {
          if (node.type === 'decl' && node.prop.startsWith('--')) {
            const parsed = parseLightDarkHex(node.value);
            if (parsed) {
              map.set(node.prop, parsed);
            } else if (node.prop === '--supa-wcag-level') {
              map.set(node.prop, node.value.replace(/["']/g, '').trim());
            }
          }
        }
      }
    }
  });

  const foregroundTokenNames = [
    '--color-foreground-primary',
    '--color-foreground-secondary',
    '--color-foreground-muted',
    '--color-brand-primary',
    '--color-brand-content',
    '--supa-admonition-note-accent',
    '--supa-admonition-tip-accent',
    '--supa-admonition-important-accent',
    '--supa-admonition-warning-accent',
    '--supa-admonition-caution-accent'
  ];

  for (const [paletteId, tokens] of paletteTokens.entries()) {
    const wcagLevel = tokens.get('--supa-wcag-level') || 'AA';
    const minTextContrast = wcagLevel === 'AAA' ? 7.0 : 4.5;
    const minBorderContrast = wcagLevel === 'AAA' ? 4.5 : 3.0;

    const bgPrimary = tokens.get('--color-background-primary');
    const bgSecondary = tokens.get('--color-background-secondary');

    if (!bgPrimary || !bgSecondary) {
      violations.push(`Palette '${paletteId}' is missing --color-background-primary or --color-background-secondary.`);
      continue;
    }

    for (const polarity of ['light', 'dark']) {
      for (const fgToken of foregroundTokenNames) {
        const fg = tokens.get(fgToken);
        if (!fg) {
          violations.push(`Palette '${paletteId}' is missing required token '${fgToken}'.`);
          continue;
        }
        for (const [bgLabel, bgHex] of [
          ['--color-background-primary', bgPrimary[polarity]],
          ['--color-background-secondary', bgSecondary[polarity]]
        ]) {
          const ratio = contrastRatio(fg[polarity], bgHex);
          if (ratio < minTextContrast) {
            violations.push(
              `WCAG 2.2 ${wcagLevel} violation in palette '${paletteId}' (${polarity}): ${fgToken} (${fg[polarity]}) on ${bgLabel} (${bgHex}) has contrast ${ratio.toFixed(2)}:1 (minimum ${minTextContrast.toFixed(1)}:1).`
            );
          }
        }
      }

      const fgBorder = tokens.get('--color-foreground-border');
      if (fgBorder) {
        const borderRatio = contrastRatio(fgBorder[polarity], bgPrimary[polarity]);
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
  console.log(`SCSS Linter checked ${files.length} files and verified WCAG 2.2 AA/AAA contrast across 6 palettes (12 polarities) with 0 violations.`);
}
