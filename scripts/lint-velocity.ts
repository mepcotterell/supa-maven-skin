/**
 * @fileoverview Apache Velocity template syntax, directive balance, and HTML landmark linter.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

interface BlockFrame {
  directive: string;
  lineNo: number;
}

interface MacroMeta {
  file: string;
  lineNo: number;
  argCount: number;
}

const rootDir: string = resolve(import.meta.dirname, '..');
const vmDir: string = join(rootDir, 'src/main/resources/META-INF/maven');

/**
 * Recursively collects all `.vm` Velocity template files in a directory.
 *
 * @param dir - Absolute directory path to search.
 * @returns Sorted array of absolute `.vm` file paths.
 */
function findVmFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath: string = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findVmFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.vm')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

const files: string[] = findVmFiles(vmDir);
const violations: string[] = [];
const definedMacros = new Map<string, MacroMeta>();

/**
 * Strips Velocity comments (`##` single-line and `#* ... *#` multi-line) while preserving line numbers.
 *
 * @param content - Raw Velocity template content.
 * @returns Velocity template string with comments replaced by whitespace.
 */
function stripVelocityComments(content: string): string {
  // Replace multi-line #* ... *# with equivalent newlines
  const noBlockComments: string = content.replace(/#\*[\s\S]*?\*#/g, (match: string) =>
    match.replace(/[^\n]/g, ' ')
  );
  // Strip single-line ## comments (ignoring \#\# escaped)
  return noBlockComments
    .split('\n')
    .map((line: string) => line.replace(/(?<!\\)##.*$/, ''))
    .join('\n');
}

// Pass 1: Check formatting, block balance (#macro, #if, #foreach, #define -> #end), and collect #macro definitions
for (const filePath of files) {
  const relPath: string = relative(rootDir, filePath);
  const rawContent: string = readFileSync(filePath, 'utf8');
  const rawLines: string[] = rawContent.split('\n');

  rawLines.forEach((line: string, idx: number) => {
    const lineNo: number = idx + 1;
    if (line.includes('\t')) {
      violations.push(`${relPath}:${lineNo}: Line contains a tab character (use spaces).`);
    }
    if (/[ \t]+$/.test(line.replace(/\r$/, ''))) {
      violations.push(`${relPath}:${lineNo}: Line has trailing whitespace.`);
    }
  });

  const cleanContent: string = stripVelocityComments(rawContent);
  const cleanLines: string[] = cleanContent.split('\n');

  const blockStack: BlockFrame[] = [];
  const directiveRegex =
    /#(?:\{(macro|if|elseif|else|foreach|define|end|parse)\}|(macro|if|elseif|else|foreach|define|end|parse)\b)\s*(\([^)]*\))?/g;

  cleanLines.forEach((line: string, idx: number) => {
    const lineNo: number = idx + 1;
    let match: RegExpExecArray | null;
    while ((match = directiveRegex.exec(line)) !== null) {
      const directive: string = match[1] ?? match[2] ?? '';
      const argsRaw: string = match[3] ?? '';

      if (directive === 'macro') {
        blockStack.push({ directive, lineNo });
        const inner: string = argsRaw.slice(1, -1).trim();
        const tokens: string[] = inner.split(/\s+/).filter(Boolean);
        const macroName: string | undefined = tokens[0];
        if (!macroName) {
          violations.push(`${relPath}:${lineNo}: #macro directive is missing a macro name.`);
        } else if (definedMacros.has(macroName)) {
          const prev: MacroMeta = definedMacros.get(macroName)!;
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
          violations.push(
            `${relPath}:${lineNo}: #${directive} directive has an empty condition/argument list.`
          );
        }
        blockStack.push({ directive, lineNo });
      } else if (directive === 'elseif' || directive === 'else') {
        const top: BlockFrame | undefined = blockStack[blockStack.length - 1];
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
        if (targetMatch && targetMatch[1]) {
          const targetPath: string = join(dirname(filePath), targetMatch[1]);
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
const siteVmPath: string = join(vmDir, 'site.vm');
if (existsSync(siteVmPath)) {
  const relPath: string = relative(rootDir, siteVmPath);
  const rawContent: string = readFileSync(siteVmPath, 'utf8');
  const content: string = stripVelocityComments(rawContent).replace(/<!--[\s\S]*?-->/g, '');

  if (!content.trimStart().startsWith('<!DOCTYPE html>')) {
    violations.push(`${relPath}:1: Template must begin with <!DOCTYPE html>.`);
  }

  const structuralTags: readonly string[] = [
    'html',
    'head',
    'body',
    'main',
    'aside',
    'header',
    'footer',
    'dialog'
  ];
  for (const tag of structuralTags) {
    const openCount: number = (content.match(new RegExp(`<${tag}(?:\\s|>)`, 'g')) ?? []).length;
    const closeCount: number = (content.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
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
