/**
 * @fileoverview Apache Velocity template linter: directive balance, macro calls checked against
 * the macros the templates define, and the HTML landmarks of `site.vm`. It checks the skin's
 * templates and the Velocity pages (`*.md.vm`) of the self-site and the Invoker fixture sites.
 * It is a static check: Maven still renders every page, so a value that is wrong only at render
 * time (an undefined reference, a failing method call) shows up there, not here.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

interface BlockFrame {
  directive: string;
  lineNo: number;
}

interface MacroMeta {
  file: string;
  lineNo: number;
  argCount: number;
}

/** One template to lint. */
export interface VelocityTemplate {
  /** Path shown in violations, relative to the repository root. */
  path: string;
  /** The template source. */
  content: string;
}

/** What {@link lintVelocity} found. */
export interface VelocityLintResult {
  /** One message per violation, each starting with the template path and line. */
  violations: string[];
  /** Number of `#macro` definitions found across all templates. */
  macroCount: number;
}

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

/** Velocity's own directives: any other `#name(` is a macro call. */
const DIRECTIVES: ReadonlySet<string> = new Set([
  'break',
  'define',
  'else',
  'elseif',
  'end',
  'evaluate',
  'foreach',
  'if',
  'include',
  'macro',
  'parse',
  'set',
  'stop'
]);

/** Directives that open a block closed by `#end`. */
const BLOCK_DIRECTIVES: ReadonlySet<string> = new Set(['define', 'foreach', 'if', 'macro']);

/** Directives whose argument list must not be empty. */
const DIRECTIVES_WITH_ARGUMENTS: ReadonlySet<string> = new Set([
  'define',
  'elseif',
  'foreach',
  'if',
  'macro',
  'parse',
  'set'
]);

/**
 * Replaces everything Velocity does not parse with spaces, keeping line breaks so line numbers
 * stay put: `##` line comments, `#* ... *#` block comments, and `#[[ ... ]]#` unparsed text. One
 * scan from left to right finds whichever starts first, as Velocity does, so a `#*` inside a
 * `##` comment opens nothing. A `#` after an odd number of backslashes is escaped text.
 *
 * @param content - Raw Velocity template content.
 * @returns The template with comments and unparsed text blanked out.
 */
function stripVelocityComments(content: string): string {
  let out = '';
  let i = 0;
  while (i < content.length) {
    let end = -1;
    if (content[i] === '#' && !isEscaped(content, i)) {
      if (content.startsWith('##', i)) {
        end = content.indexOf('\n', i);
        end = end < 0 ? content.length : end;
      } else if (content.startsWith('#*', i)) {
        end = content.indexOf('*#', i + 2);
        end = end < 0 ? content.length : end + 2;
      } else if (content.startsWith('#[[', i)) {
        end = content.indexOf(']]#', i + 3);
        end = end < 0 ? content.length : end + 3;
      }
    }
    if (end < 0) {
      out += content[i];
      i++;
    } else {
      out += content.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
    }
  }
  return out;
}

/**
 * Tells whether the character at an index follows an odd number of backslashes, which makes a
 * `#` there plain text: `\#if` renders `#if`, while `\\#if` renders a backslash and runs `#if`.
 *
 * @param content - The template content.
 * @param index - Index of the character.
 * @returns Whether the character is escaped.
 */
function isEscaped(content: string, index: number): boolean {
  let backslashes = 0;
  for (let j = index - 1; j >= 0 && content[j] === '\\'; j--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
}

/**
 * Reads a parenthesized argument list starting at an opening parenthesis, skipping nested
 * brackets and quoted strings, and splits it into its top-level arguments, which Velocity
 * separates with whitespace or commas.
 *
 * @param content - The template content, with comments blanked out.
 * @param open - Index of the opening parenthesis.
 * @returns The arguments and the index just past the closing parenthesis, or `null` when the
 *     list is never closed.
 */
function readArguments(content: string, open: number): { args: string[]; end: number } | null {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let quote = '';
  for (let i = open + 1; i < content.length; i++) {
    const ch: string = content[i]!;
    if (quote !== '') {
      current += ch;
      if (ch === quote) {
        quote = '';
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
    } else if ((ch === ')' || ch === ']' || ch === '}') && depth > 0) {
      depth--;
      current += ch;
    } else if (ch === ')') {
      if (current !== '') {
        args.push(current);
      }
      return { args, end: i + 1 };
    } else if (depth === 0 && (/\s/.test(ch) || ch === ',')) {
      if (current !== '') {
        args.push(current);
      }
      current = '';
    } else {
      current += ch;
    }
  }
  return null;
}

/** A directive or macro call found in a template. */
interface VelocityCall {
  /** Directive or macro name. */
  name: string;
  /** 1-based line of the `#`. */
  lineNo: number;
  /** Top-level arguments, or `null` when no parenthesized list follows the name. */
  args: string[] | null;
  /** Whether a parenthesized list was opened but never closed. */
  unclosed: boolean;
}

/**
 * Finds every unescaped directive and macro call (`#name` or `#{name}`) in a template whose
 * comments and unparsed text are blanked out.
 *
 * @param content - The cleaned template content.
 * @returns The calls in source order.
 */
function findCalls(content: string): VelocityCall[] {
  const calls: VelocityCall[] = [];
  const nameRegex = /#(?:\{([A-Za-z][A-Za-z0-9_]*)\}|([A-Za-z][A-Za-z0-9_]*))/g;
  let match: RegExpExecArray | null;
  while ((match = nameRegex.exec(content)) !== null) {
    if (isEscaped(content, match.index)) {
      continue;
    }
    const name: string = match[1] ?? match[2] ?? '';
    const lineNo: number = content.slice(0, match.index).split('\n').length;
    let open: number = nameRegex.lastIndex;
    while (content[open] === ' ' || content[open] === '\t') {
      open++;
    }
    if (content[open] !== '(') {
      calls.push({ name, lineNo, args: null, unclosed: false });
      continue;
    }
    const list = readArguments(content, open);
    calls.push({ name, lineNo, args: list ? list.args : [], unclosed: list === null });
    if (list) {
      nameRegex.lastIndex = list.end;
    }
  }
  return calls;
}

/**
 * Lints Velocity templates. Every template is checked for directive balance (`#if`, `#foreach`,
 * `#define`, and `#macro` closed by `#end`), empty `#if`, `#elseif`, `#foreach`, `#define`,
 * `#macro`, `#parse`, and `#set` argument lists, duplicate `#macro` definitions, missing `#parse`
 * targets, and calls to macros that no template defines or with the wrong number of arguments.
 * Skin templates (any template not ending in `.md.vm`) are also checked for tabs and trailing
 * whitespace, which Markdown pages may need, and `site.vm` for its structural HTML landmarks.
 *
 * @param templates - The templates to lint, together, so a macro defined in one is known in all.
 * @param templateExists - Tells whether a `#parse` target, given relative to the repository
 *     root, exists.
 * @returns The violations found and the number of macros defined.
 */
export function lintVelocity(
  templates: readonly VelocityTemplate[],
  templateExists: (path: string) => boolean = () => true
): VelocityLintResult {
  const violations: string[] = [];
  const definedMacros = new Map<string, MacroMeta>();
  const callsByTemplate = new Map<VelocityTemplate, VelocityCall[]>();

  // Pass 1: Check formatting and block balance, and collect #macro definitions
  for (const template of templates) {
    const relPath: string = template.path;
    const isPage: boolean = relPath.endsWith('.md.vm');

    if (!isPage) {
      template.content.split('\n').forEach((line: string, idx: number) => {
        const lineNo: number = idx + 1;
        if (line.includes('\t')) {
          violations.push(`${relPath}:${lineNo}: Line contains a tab character (use spaces).`);
        }
        if (/[ \t]+$/.test(line.replace(/\r$/, ''))) {
          violations.push(`${relPath}:${lineNo}: Line has trailing whitespace.`);
        }
      });
    }

    const calls: VelocityCall[] = findCalls(stripVelocityComments(template.content));
    callsByTemplate.set(template, calls);
    const blockStack: BlockFrame[] = [];

    for (const call of calls) {
      const { name: directive, lineNo, args } = call;
      if (call.unclosed) {
        violations.push(`${relPath}:${lineNo}: #${directive} has an unclosed argument list.`);
        continue;
      }
      if (!DIRECTIVES.has(directive)) {
        continue;
      }
      if (DIRECTIVES_WITH_ARGUMENTS.has(directive) && (args === null || args.length === 0)) {
        violations.push(
          `${relPath}:${lineNo}: #${directive} directive has an empty condition/argument list.`
        );
      }

      if (directive === 'macro') {
        const macroName: string | undefined = args?.[0];
        if (!macroName) {
          violations.push(`${relPath}:${lineNo}: #macro directive is missing a macro name.`);
        } else if (definedMacros.has(macroName)) {
          const prev: MacroMeta = definedMacros.get(macroName)!;
          violations.push(
            `${relPath}:${lineNo}: Duplicate #macro '${macroName}' (already defined at ${prev.file}:${prev.lineNo}).`
          );
        } else {
          definedMacros.set(macroName, { file: relPath, lineNo, argCount: args!.length - 1 });
        }
      }

      if (BLOCK_DIRECTIVES.has(directive)) {
        blockStack.push({ directive, lineNo });
      } else if (directive === 'elseif' || directive === 'else') {
        const top: BlockFrame | undefined = blockStack[blockStack.length - 1];
        if (!top || top.directive !== 'if') {
          violations.push(`${relPath}:${lineNo}: Unexpected #${directive} outside of an #if block.`);
        }
      } else if (directive === 'end') {
        if (blockStack.length === 0) {
          violations.push(`${relPath}:${lineNo}: Unmatched #end directive.`);
        } else {
          blockStack.pop();
        }
      } else if (directive === 'parse') {
        const targetMatch = args?.length === 1 ? args[0]!.match(/^["']([^"']+)["']$/) : null;
        if (targetMatch && targetMatch[1] && !templateExists(join(dirname(relPath), targetMatch[1]))) {
          violations.push(
            `${relPath}:${lineNo}: #parse("${targetMatch[1]}") references non-existent template.`
          );
        }
      }
    }

    for (const unclosed of blockStack) {
      violations.push(
        `${relPath}:${unclosed.lineNo}: Unclosed #${unclosed.directive} block (missing #end).`
      );
    }
  }

  // Pass 2: Check each macro call against the macros the templates define. Only a name followed
  // by an argument list is a call; Velocity prints any other #word, such as a #fragment, as text.
  for (const [template, calls] of callsByTemplate) {
    for (const { name, lineNo, args } of calls) {
      if (DIRECTIVES.has(name) || args === null) {
        continue;
      }
      const macro: MacroMeta | undefined = definedMacros.get(name);
      if (!macro) {
        violations.push(
          `${template.path}:${lineNo}: #${name}() calls a macro that no template defines (Velocity would print it as text).`
        );
      } else if (macro.argCount !== args.length) {
        violations.push(
          `${template.path}:${lineNo}: #${name}() expects ${macro.argCount} argument(s) (${macro.file}:${macro.lineNo}), but is given ${args.length}.`
        );
      }
    }
  }

  // Pass 3: Validate structural HTML landmarks in site.vm (ignoring HTML and Velocity comments)
  for (const template of templates.filter((t) => t.path.endsWith('/site.vm'))) {
    const relPath: string = template.path;
    const content: string = stripVelocityComments(template.content).replace(/<!--[\s\S]*?-->/g, '');

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

  return { violations, macroCount: definedMacros.size };
}

/**
 * Reads the skin's Velocity templates and the Velocity pages (such as `index.md.vm`) of the
 * self-site and of each Invoker fixture site.
 *
 * @param rootDir - The repository root.
 * @returns The templates, with paths relative to the repository root.
 */
export function collectTemplates(rootDir: string): VelocityTemplate[] {
  const dirs: string[] = [join(rootDir, 'src/main/resources/META-INF/maven'), join(rootDir, 'src/site')];
  const itDir: string = join(rootDir, 'src/it');
  if (existsSync(itDir)) {
    for (const entry of readdirSync(itDir, { withFileTypes: true })) {
      if (entry.isDirectory() && existsSync(join(itDir, entry.name, 'src/site'))) {
        dirs.push(join(itDir, entry.name, 'src/site'));
      }
    }
  }
  return dirs
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => findVmFiles(dir))
    .map((file) => ({
      path: relative(rootDir, file).split(sep).join('/'),
      content: readFileSync(file, 'utf8')
    }));
}

/**
 * Lints the repository's templates and exits with status 1 when any violation is found.
 */
function main(): void {
  const rootDir: string = resolve(import.meta.dirname, '..');
  const templates: VelocityTemplate[] = collectTemplates(rootDir);
  const { violations, macroCount } = lintVelocity(templates, (path: string) =>
    existsSync(join(rootDir, path))
  );
  if (violations.length > 0) {
    console.error(`Velocity Linter found ${violations.length} violation(s):`);
    for (const v of violations) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  } else {
    console.log(
      `Velocity Linter checked ${templates.length} template(s) (${macroCount} macros) with 0 violations.`
    );
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
