import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import groovy from 'highlight.js/lib/languages/groovy';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import plaintext from 'highlight.js/lib/languages/plaintext';
import properties from 'highlight.js/lib/languages/properties';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

let languagesRegistered = false;

export function registerHighlightLanguages(): void {
  if (languagesRegistered) {
    return;
  }
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('sh', bash);
  hljs.registerLanguage('shell', shell);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('diff', diff);
  hljs.registerLanguage('groovy', groovy);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('js', javascript);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('kotlin', kotlin);
  hljs.registerLanguage('kt', kotlin);
  hljs.registerLanguage('plaintext', plaintext);
  hljs.registerLanguage('text', plaintext);
  hljs.registerLanguage('properties', properties);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('py', python);
  hljs.registerLanguage('scss', scss);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('ts', typescript);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('html', xml);
  hljs.registerLanguage('yaml', yaml);
  hljs.registerLanguage('yml', yaml);
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
  yaml: 'yaml',
  yml: 'yaml'
};

const COPY_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

const CHECK_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

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
    if (!wrapper || !wrapper.classList.contains('furo-code-block')) {
      wrapper = document.createElement('div');
      wrapper.className = 'furo-code-block not-prose';
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
    }

    const rawText = (codeEl ?? pre).textContent ?? '';
    const langLabel = detectLanguageLabel(pre, codeEl);
    const blockTitle =
      pre.getAttribute('data-title') ||
      codeEl?.getAttribute('data-title') ||
      pre.getAttribute('title') ||
      '';

    if (blockTitle && !wrapper.querySelector('.furo-code-header')) {
      const header = document.createElement('div');
      header.className = 'furo-code-header';
      const titleSpan = document.createElement('span');
      titleSpan.className = 'furo-code-title';
      titleSpan.textContent = blockTitle;
      header.appendChild(titleSpan);
      if (langLabel) {
        const badge = document.createElement('span');
        badge.className = 'furo-code-header-lang';
        badge.textContent = langLabel;
        header.appendChild(badge);
      }
      wrapper.insertBefore(header, pre);
    } else if (langLabel && !wrapper.querySelector('.furo-code-lang')) {
      const langBadge = document.createElement('span');
      langBadge.className = 'furo-code-lang';
      langBadge.setAttribute('aria-hidden', 'true');
      langBadge.textContent = langLabel;
      wrapper.appendChild(langBadge);
    }

    if (enableHighlight) {
      const target = codeEl ?? pre;
      if (!target.classList.contains('hljs')) {
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
      const target = codeEl ?? pre;
      const lines = target.innerHTML.replace(/\n$/, '').split('\n');
      if (lines.length > 1) {
        target.innerHTML = lines
          .map((line, i) => `<span class="furo-code-line" data-line="${i + 1}">${line || ' '}</span>`)
          .join('\n');
      }
    }

    if (enableCopyButton && !wrapper.querySelector('.furo-copy-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'furo-copy-btn';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.setAttribute('title', 'Copy code');
      btn.innerHTML = COPY_ICON_SVG;

      btn.addEventListener('click', async () => {
        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(rawText);
          }
          btn.classList.add('is-copied');
          btn.innerHTML = CHECK_ICON_SVG;
          btn.setAttribute('aria-label', 'Copied!');
          window.setTimeout(() => {
            btn.classList.remove('is-copied');
            btn.innerHTML = COPY_ICON_SVG;
            btn.setAttribute('aria-label', 'Copy code to clipboard');
          }, 1800);
        } catch {
          // Ignore clipboard write rejections
        }
      });

      wrapper.appendChild(btn);
    }
  });
}

export function initCodeBlocks(): void {
  const article = document.getElementById('furo-main-content');
  if (!article) {
    return;
  }
  const body = document.body;
  const enableHighlight = body.getAttribute('data-furo-syntax-highlight') !== 'false';
  const enableCopy = body.getAttribute('data-furo-copy-code') !== 'false';
  const enableLineNumbers = body.getAttribute('data-furo-line-numbers') === 'true';
  enhanceCodeBlocks(article, enableHighlight, enableCopy, enableLineNumbers);
}
