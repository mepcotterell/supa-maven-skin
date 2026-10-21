import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const vmDir = join(rootDir, 'src/main/resources/META-INF/maven');

/**
 * Collects all .vm Velocity template files in a directory.
 */
function findVmFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findVmFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.vm')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

const files = findVmFiles(vmDir);
const violations = [];
const definedMacros = new Map();

/**
 * Strips Velocity comments (## single-line and #* ... *# multi-line) while preserving line numbers.
 */
function stripVelocityComments(content) {
  // Replace multi-line #* ... *# with equivalent newlines
  const noBlockComments = content.replace(/#\*[\s\S]*?\*#/g, (match) =>
    match.replace(/[^\n]/g, ' ')
  );
  // Strip single-line ## comments (ignoring \#\# escaped)
  return noBlockComments
    .split('\n')
    .map((line) => line.replace(/(?<!\\)##.*$/, ''))
    .join('\n');
}

// Pass 1: Check formatting, block balance (#macro, #if, #foreach, #define -> #end), and collect #macro definitions
for (const filePath of files) {
  const relPath = relative(rootDir, filePath);
  const rawContent = readFileSync(filePath, 'utf8');
  const rawLines = rawContent.split('\n');

  rawLines.forEach((line, idx) => {
    const lineNo = idx + 1;
    if (line.includes('\t')) {
      violations.push(`${relPath}:${lineNo}: Line contains a tab character (use spaces).`);
    }
    if (/[ \t]+$/.test(line.replace(/\r$/, ''))) {
      violations.push(`${relPath}:${lineNo}: Line has trailing whitespace.`);
    }
  });

  const cleanContent = stripVelocityComments(rawContent);
  const cleanLines = cleanContent.split('\n');

  const blockStack = [];
  const directiveRegex = /#(?:\{(macro|if|elseif|else|foreach|define|end|parse)\}|(macro|if|elseif|else|foreach|define|end|parse)\b)\s*(\([^)]*\))?/g;

  cleanLines.forEach((line, idx) => {
    const lineNo = idx + 1;
    let match;
    while ((match = directiveRegex.exec(line)) !== null) {
      const directive = match[1] ?? match[2];
      const argsRaw = match[3] ?? '';

      if (directive === 'macro') {
        blockStack.push({ directive, lineNo });
        const inner = argsRaw.slice(1, -1).trim();
        const tokens = inner.split(/\s+/).filter(Boolean);
        const macroName = tokens[0];
        if (!macroName) {
          violations.push(`${relPath}:${lineNo}: #macro directive is missing a macro name.`);
        } else if (definedMacros.has(macroName)) {
          const prev = definedMacros.get(macroName);
          violations.push(
            `${relPath}:${lineNo}: Duplicate #macro '${macroName}' (already defined at ${prev.file}:${prev.lineNo}).`
          );
        } else {
          definedMacros.set(macroName, {
            file: relPath,
            lineNo,
            argCount: tokens.length - 1
          });
        }
      } else if (directive === 'if' || directive === 'foreach' || directive === 'define') {
        if (!argsRaw || argsRaw.slice(1, -1).trim().length === 0) {
          violations.push(`${relPath}:${lineNo}: #${directive} directive has an empty condition/argument list.`);
        }
        blockStack.push({ directive, lineNo });
      } else if (directive === 'elseif' || directive === 'else') {
        const top = blockStack[blockStack.length - 1];
        if (!top || top.directive !== 'if') {
          violations.push(
            `${relPath}:${lineNo}: Unexpected #${directive} outside of an #if block.`
          );
        }
      } else if (directive === 'end') {
        if (blockStack.length === 0) {
          violations.push(`${relPath}:${lineNo}: Unmatched #end directive.`);
        } else {
          blockStack.pop();
        }
      } else if (directive === 'parse') {
        const targetMatch = argsRaw.match(/^\(\s*["']([^"']+)["']\s*\)$/);
        if (targetMatch) {
          const targetPath = join(dirname(filePath), targetMatch[1]);
          if (!existsSync(targetPath)) {
            violations.push(
              `${relPath}:${lineNo}: #parse("${targetMatch[1]}") references non-existent template.`
            );
          }
        }
      }
    }
  });

  for (const unclosed of blockStack) {
    violations.push(
      `${relPath}:${unclosed.lineNo}: Unclosed #${unclosed.directive} block (missing #end).`
    );
  }
}

// Pass 2: Validate structural HTML landmarks in site.vm (ignoring HTML and Velocity comments)
const siteVmPath = join(vmDir, 'site.vm');
if (existsSync(siteVmPath)) {
  const relPath = relative(rootDir, siteVmPath);
  const rawContent = readFileSync(siteVmPath, 'utf8');
  const content = stripVelocityComments(rawContent).replace(/<!--[\s\S]*?-->/g, '');

  if (!content.trimStart().startsWith('<!DOCTYPE html>')) {
    violations.push(`${relPath}:1: Template must begin with <!DOCTYPE html>.`);
  }

  const structuralTags = ['html', 'head', 'body', 'main', 'aside', 'header', 'footer', 'dialog'];
  for (const tag of structuralTags) {
    const openCount = (content.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) ?? []).length;
    const closeCount = (content.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    if (openCount !== closeCount) {
      violations.push(
        `${relPath}: Mismatched <${tag}> tags (${openCount} opening vs ${closeCount} closing).`
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`Velocity Linter found ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  process.exit(1);
} else {
  console.log(
    `Velocity Linter checked ${files.length} template(s) (${definedMacros.size} macros) with 0 violations.`
  );
}
