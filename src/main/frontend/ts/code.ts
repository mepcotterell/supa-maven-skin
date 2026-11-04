/**
 * @fileoverview Syntax highlighting via Highlight.js, code block wrappers,
 * language badge pills, line numbering, and one-click Copy to Clipboard buttons.
 */
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import groovy from 'highlight.js/lib/languages/groovy';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import properties from 'highlight.js/lib/languages/properties';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { setTooltipTitle } from './bootstrap-components';

let languagesRegistered = false;

type LanguageFn = Parameters<typeof hljs.registerLanguage>[1];

/**
 * Wraps a Highlight.js grammar factory so aliases get a fresh language definition object.
 *
 * @param fn - Original Highlight.js language grammar factory.
 * @returns Cloned Highlight.js language grammar factory.
 */
function cloneLanguage(fn: LanguageFn): LanguageFn {
  return (hljsInstance) => ({ ...fn(hljsInstance) });
}

/**
 * Registers all bundled Highlight.js languages and common Maven/Doxia aliases once.
 */
export function registerHighlightLanguages(): void {
  if (languagesRegistered) {
    return;
  }
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('sh', cloneLanguage(bash));
  hljs.registerLanguage('shell', shell);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('diff', diff);
  hljs.registerLanguage('groovy', groovy);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', cloneLanguage(javascript));
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('kotlin', kotlin);
  hljs.registerLanguage('kt', cloneLanguage(kotlin));
  hljs.registerLanguage('markdown', markdown);
  hljs.registerLanguage('md', cloneLanguage(markdown));
  hljs.registerLanguage('plaintext', plaintext);
  hljs.registerLanguage('text', cloneLanguage(plaintext));
  hljs.registerLanguage('properties', properties);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('py', cloneLanguage(python));
  hljs.registerLanguage('scss', scss);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('ts', cloneLanguage(typescript));
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('html', cloneLanguage(xml));
  hljs.registerLanguage('velocity', cloneLanguage(xml));
  hljs.registerLanguage('vm', cloneLanguage(xml));
  hljs.registerLanguage('yaml', yaml);
  hljs.registerLanguage('yml', cloneLanguage(yaml));
  languagesRegistered = true;
}

const LANGUAGE_LABELS: Record<string, string> = {
  bash: 'bash',
  sh: 'sh',
  shell: 'shell',
  css: 'css',
  diff: 'diff',
  groovy: 'groovy',
  java: 'java',
  javascript: 'js',
  js: 'js',
  json: 'json',
  kotlin: 'kotlin',
  kt: 'kotlin',
  markdown: 'md',
  md: 'md',
  plaintext: 'text',
  text: 'text',
  properties: 'properties',
  python: 'python',
  py: 'python',
  scss: 'scss',
  sql: 'sql',
  typescript: 'ts',
  ts: 'ts',
  xml: 'xml',
  html: 'html',
  velocity: 'vm',
  vm: 'vm',
  yaml: 'yaml',
  yml: 'yaml'
};

/**
 * Highlights a single `<code>` or `<pre>` element using Highlight.js while
 * skipping blocks that contain interactive child elements.
 *
 * @param codeEl - Target code or pre element to highlight.
 * @param lang - Optional explicit language identifier.
 */
export function highlightCodeElement(codeEl: HTMLElement, lang?: string): void {
  registerHighlightLanguages();
  codeEl.removeAttribute('data-highlighted');
  Array.from(codeEl.classList).forEach((cls) => {
    if (cls === 'hljs' || (lang && /^(?:language|lang)-/i.test(cls))) {
      codeEl.classList.remove(cls);
    }
  });
  if (lang) {
    codeEl.classList.add(`language-${lang}`);
    const wrapper = codeEl.closest('.supa-code-block');
    const langBadge = wrapper?.querySelector<HTMLElement>('.supa-code-lang');
    if (langBadge) {
      langBadge.textContent = LANGUAGE_LABELS[lang] || lang;
    }
  }
  if (codeEl.children.length > 0) {
    codeEl.classList.add('hljs', 'language-plaintext');
    return;
  }
  try {
    hljs.highlightElement(codeEl);
  } catch {
    // Ignore unknown language errors
  }
}

const COPY_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

const CHECK_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

const FAILED_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

/** How long the copy button shows its "Copied!" or "Copy failed" result before resetting. */
const COPY_RESULT_DURATION_MS = 1800;

type CopyButtonState = 'idle' | 'copied' | 'failed';

const COPY_BUTTON_STATES: Record<
  CopyButtonState,
  { icon: string; label: string; tooltip: string }
> = {
  idle: { icon: COPY_ICON_SVG, label: 'Copy code to clipboard', tooltip: 'Copy code' },
  copied: { icon: CHECK_ICON_SVG, label: 'Copied!', tooltip: 'Copied!' },
  failed: { icon: FAILED_ICON_SVG, label: 'Copy failed', tooltip: 'Copy failed' }
};

/**
 * Updates a code-block copy button's icon, accessible name, tooltip, and state class.
 *
 * @param btn - Copy button to update.
 * @param state - State to show.
 */
function setCopyButtonState(btn: HTMLButtonElement, state: CopyButtonState): void {
  const { icon, label, tooltip } = COPY_BUTTON_STATES[state];
  btn.classList.toggle('is-copied', state === 'copied');
  btn.classList.toggle('is-copy-failed', state === 'failed');
  btn.innerHTML = icon;
  btn.setAttribute('aria-label', label);
  setTooltipTitle(btn, tooltip, 'left');
}

/**
 * Copies text with a hidden, read-only `<textarea>` and `document.execCommand('copy')`.
 *
 * This deprecated API is the only copy mechanism left where the asynchronous Clipboard API is
 * missing (pages served over plain HTTP from a host other than `localhost`, some embedded
 * webviews) or denied by a permission policy.
 *
 * The temporary `<textarea>` takes focus, and removing it leaves focus on `<body>`; callers
 * restore focus with {@link restoreFocusAfterCopy}.
 *
 * @param text - Text to copy.
 * @param container - Element that holds the temporary `<textarea>`. Use one next to the copy
 *     button: while a modal `<dialog>` (Bootstrap's `.dialog` or `.drawer`) is open, everything
 *     outside it is inert, so a `<textarea>` in `<body>` selects nothing, yet Chromium and
 *     Firefox still report the copy as successful.
 * @returns True if the `<textarea>` took focus and the browser reports that the copy succeeded.
 */
function copyWithExecCommand(text: string, container: HTMLElement): boolean {
  if (typeof document.execCommand !== 'function') {
    return false;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  // readonly keeps mobile browsers from opening the on-screen keyboard during select().
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  container.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    // iOS Safari ignores select() on a read-only field without an explicit range.
    textarea.setSelectionRange(0, text.length);
    // A textarea that could not take focus (inert, for example) has nothing selected, and
    // execCommand('copy') can still return true, so do not trust it in that case.
    return document.activeElement === textarea && document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/**
 * Copies text to the clipboard, preferring the asynchronous Clipboard API and falling back to
 * `document.execCommand('copy')` when that API is absent or rejects the write.
 *
 * @param text - Text to copy.
 * @param container - Element next to the copy button that holds the fallback's temporary
 *     `<textarea>`.
 * @returns True only if one of the two mechanisms reported a successful copy.
 */
async function copyTextToClipboard(text: string, container: HTMLElement): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or no document focus: try the legacy path before reporting failure.
    }
  }
  return copyWithExecCommand(text, container);
}

/**
 * Puts focus back where it was before a copy, if the `execCommand` fallback's temporary
 * `<textarea>` left it on `<body>`, so keyboard users are not stranded.
 *
 * Focus that started on `<body>` stays there: WebKit does not focus a button on mouse click, and
 * focusing it afterwards would leave mouse users with a focus ring.
 *
 * @param focusBeforeCopy - Element that had focus when the copy started.
 */
function restoreFocusAfterCopy(focusBeforeCopy: Element | null): void {
  const focusWasLost = document.activeElement === null || document.activeElement === document.body;
  if (
    focusWasLost &&
    focusBeforeCopy instanceof HTMLElement &&
    focusBeforeCopy !== document.body &&
    focusBeforeCopy.isConnected
  ) {
    focusBeforeCopy.focus({ preventScroll: true });
  }
}

/**
 * Extracts a normalized display label for a `<pre>`/`<code>` block's language class.
 *
 * @param pre - Outer `<pre>` element.
 * @param codeEl - Inner `<code>` element if present.
 * @returns Normalized short language label, or null if none is set.
 */
function detectLanguageLabel(pre: HTMLElement, codeEl: HTMLElement | null): string | null {
  const classes = [
    ...(codeEl ? Array.from(codeEl.classList) : []),
    ...Array.from(pre.classList)
  ];
  for (const cls of classes) {
    const match = cls.match(/^(?:language|lang)-([a-z0-9_+-]+)$/i);
    if (match) {
      const raw = match[1].toLowerCase();
      return LANGUAGE_LABELS[raw] || raw;
    }
  }
  return null;
}

/**
 * Checks whether a `<pre>` block is inside a Maven Project Licenses report section.
 *
 * @param pre - Candidate `<pre>` element.
 * @param container - Enclosing content container.
 * @returns True if the `<pre>` block represents license text.
 */
function isLicenseBlock(pre: HTMLElement, container: HTMLElement): boolean {
  if (
    typeof window !== 'undefined' &&
    /(?:^|\/)licenses?\.html$/i.test(window.location.pathname)
  ) {
    return true;
  }
  let section = pre.closest('section');
  while (section && container.contains(section)) {
    if (
      section.querySelector(
        ':scope > a#Project_Licenses, :scope > a[name="Project_Licenses"], :scope > h1#project-licenses, :scope > h2#project-licenses'
      )
    ) {
      return true;
    }
    section = section.parentElement?.closest('section') ?? null;
  }
  return false;
}

/**
 * Wraps `<pre>` blocks in `.supa-code-block`, applies Highlight.js syntax highlighting,
 * renders optional title headers / language pills / line numbers, and adds Copy buttons.
 *
 * @param container - Root element containing `<pre>` blocks to enhance.
 * @param enableHighlight - Whether to run Highlight.js syntax highlighting.
 * @param enableCopyButton - Whether to attach Copy to Clipboard buttons.
 * @param enableLineNumbers - Whether to render line number spans by default.
 */
export function enhanceCodeBlocks(
  container: HTMLElement,
  enableHighlight = true,
  enableCopyButton = true,
  enableLineNumbers = false
): void {
  if (enableHighlight) {
    registerHighlightLanguages();
  }

  const preBlocks = Array.from(container.querySelectorAll<HTMLPreElement>('pre'));
  preBlocks.forEach((pre) => {
    const codeEl = pre.querySelector<HTMLElement>('code');
    if (
      pre.classList.contains('mermaid') ||
      codeEl?.classList.contains('language-mermaid')
    ) {
      return;
    }

    let wrapper = pre.parentElement;
    if (!wrapper || !wrapper.classList.contains('supa-code-block')) {
      wrapper = document.createElement('div');
      wrapper.className = 'supa-code-block not-prose';
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
    }

    const rawText = (codeEl ?? pre).textContent ?? '';
    const langLabel = detectLanguageLabel(pre, codeEl);
    const target = codeEl ?? pre;
    const hasEmbeddedChildElements = target.children.length > 0;
    if (!langLabel && isLicenseBlock(pre, container)) {
      target.classList.add('language-plaintext');
    }

    const blockTitle =
      pre.getAttribute('data-title') ||
      codeEl?.getAttribute('data-title') ||
      pre.getAttribute('title') ||
      codeEl?.getAttribute('title') ||
      '';
    pre.removeAttribute('title');
    codeEl?.removeAttribute('title');

    if (blockTitle && !wrapper.querySelector('.supa-code-header')) {
      const header = document.createElement('div');
      header.className = 'supa-code-header';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'supa-code-title';
      titleSpan.textContent = blockTitle;
      header.appendChild(titleSpan);
      if (langLabel) {
        const badge = document.createElement('span');
        badge.className = 'supa-code-header-lang';
        badge.textContent = langLabel;
        header.appendChild(badge);
      }
      wrapper.insertBefore(header, pre);
    } else if (langLabel && !wrapper.querySelector('.supa-code-lang')) {
      const langBadge = document.createElement('span');
      langBadge.className = 'supa-code-lang';
      langBadge.setAttribute('aria-hidden', 'true');
      langBadge.textContent = langLabel;
      wrapper.appendChild(langBadge);
    }

    if (enableHighlight) {
      if (hasEmbeddedChildElements) {
        // Doxia verbatimLink blocks (e.g., <pre><a class="externalLink" href="...">...</a></pre>
        // on ci-management.html and scm.html) contain real child elements. Keep the interactive
        // child markup intact and style as .hljs.language-plaintext without invoking hljs.highlightElement()
        // (which logs an "unescaped HTML" security warning and strips child elements).
        target.classList.add('hljs', 'language-plaintext');
      } else if (!target.classList.contains('hljs')) {
        try {
          hljs.highlightElement(target);
        } catch {
          // Ignore unknown language errors
        }
      }
    }

    const wantLineNumbers =
      enableLineNumbers ||
      pre.classList.contains('line-numbers') ||
      codeEl?.classList.contains('line-numbers');

    if (wantLineNumbers && !wrapper.classList.contains('has-line-numbers')) {
      wrapper.classList.add('has-line-numbers');
      const lines = target.innerHTML.replace(/\n$/, '').split('\n');
      if (lines.length > 1) {
        target.innerHTML = lines
          .map((line, i) => `<span class="supa-code-line" data-line="${i + 1}">${line || ' '}</span>`)
          .join('\n');
      }
    }

    if (enableCopyButton && !wrapper.querySelector('.supa-copy-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'supa-copy-btn';
      setCopyButtonState(btn, 'idle');

      let resetTimer: number | undefined;
      btn.addEventListener('click', async () => {
        const textToCopy = (codeEl ?? pre).textContent ?? rawText;
        const focusBeforeCopy = document.activeElement;
        const copied = await copyTextToClipboard(textToCopy, btn.parentElement ?? document.body);
        setCopyButtonState(btn, copied ? 'copied' : 'failed');
        // Refocus only once the result is set, so screen readers announce "Copied!" or
        // "Copy failed" when focus returns rather than the idle label.
        restoreFocusAfterCopy(focusBeforeCopy);
        // Restart the countdown so an earlier click cannot cut this result short.
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(() => {
          setCopyButtonState(btn, 'idle');
        }, COPY_RESULT_DURATION_MS);
      });

      wrapper.appendChild(btn);
    }
  });
}

/**
 * Reads `data-supa-syntax-highlight` and `data-supa-copy-code` attributes on `document.body`
 * and enhances all code blocks inside `#supa-main-content`.
 */
export function initCodeBlocks(): void {
  const article = document.getElementById('supa-main-content');
  if (!article) {
    return;
  }
  const body = document.body;
  const enableHighlight = body.getAttribute('data-supa-syntax-highlight') !== 'false';
  const enableCopy = body.getAttribute('data-supa-copy-code') !== 'false';
  enhanceCodeBlocks(article, enableHighlight, enableCopy, false);
}
