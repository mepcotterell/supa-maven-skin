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

// 4. Compile entrypoint with Dart Sass and fail on any warnings originating from our SCSS files
const mainScss = join(scssDir, 'main.scss');
try {
  sass.compile(mainScss, {
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
} catch (err) {
  violations.push(`src/main/frontend/scss/main.scss: Sass compilation failed: ${err.message}`);
}

if (violations.length > 0) {
  console.error(`SCSS Linter found ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log(`SCSS Linter checked ${files.length} files with 0 violations.`);
}
