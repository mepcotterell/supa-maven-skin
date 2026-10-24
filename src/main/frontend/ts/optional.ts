/**
 * @fileoverview Optional lazy-loaded Mermaid diagram and KaTeX math rendering
 * when enabled in `<custom><supaSkin>` or detected in the page DOM.
 */

/**
 * Lazily loads and initializes Mermaid diagrams and KaTeX math expressions
 * inside `#supa-main-content` when configured or detected on the page.
 *
 * @returns Promise that resolves once optional libraries have initialized.
 */
export async function initOptionalLibraries(): Promise<void> {
  const body = document.body;
  const article = document.getElementById('supa-main-content');
  if (!article) {
    return;
  }

  // 1. Mermaid Diagrams
  const mermaidMode = body.getAttribute('data-supa-mermaid') || 'auto';
  if (mermaidMode !== 'false') {
    const codeBlocks = article.querySelectorAll<HTMLElement>('pre > code.language-mermaid');
    codeBlocks.forEach((code) => {
      const pre = code.parentElement;
      if (!pre) {
        return;
      }
      const div = document.createElement('div');
      div.className = 'mermaid not-prose';
      div.setAttribute('data-mermaid-src', code.textContent || '');
      div.textContent = code.textContent || '';
      pre.replaceWith(div);
    });

    const mermaidNodes = article.querySelectorAll<HTMLElement>('.mermaid');
    if (mermaidMode === 'true' || mermaidNodes.length > 0) {
      const mermaidUrl =
        body.getAttribute('data-supa-mermaid-url') ||
        'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
      try {
        const mermaidModule = await import(/* @vite-ignore */ mermaidUrl);
        const mermaid = mermaidModule.default ?? mermaidModule;
        const renderMermaid = async () => {
          const resolvedTheme =
            document.documentElement.getAttribute('data-supa-resolved-theme') === 'dark'
              ? 'dark'
              : 'default';
          mermaidNodes.forEach((node) => {
            const raw = node.getAttribute('data-mermaid-src') || node.textContent || '';
            node.setAttribute('data-mermaid-src', raw);
            node.removeAttribute('data-processed');
            node.textContent = raw;
          });
          mermaid.initialize({ startOnLoad: false, theme: resolvedTheme });
          await mermaid.run({ nodes: Array.from(mermaidNodes) });
          mermaidNodes.forEach((node) => {
            const svg = node.querySelector<SVGSVGElement>('svg');
            const vb = svg?.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
            if (svg && vb && vb.length === 4 && vb[2] > 480 && vb[3] > 0 && vb[2] / vb[3] > 3.5) {
              svg.style.minWidth = `${Math.min(Math.round(vb[2]), 560)}px`;
            }
          });
        };
        await renderMermaid();
        document.addEventListener('supa:theme-changed', () => {
          void renderMermaid();
        });
      } catch {
        // Ignore network errors when offline
      }
    }
  }

  // 2. KaTeX Math Rendering
  const katexMode = body.getAttribute('data-supa-katex') || 'auto';
  if (katexMode !== 'false') {
    const hasMathClass = article.querySelector('.math, .katex-math') !== null;
    const hasMathDelimiters =
      /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^\s$][^$\n]*\$/.test(
        article.textContent || ''
      );
    if (katexMode === 'true' || hasMathClass || hasMathDelimiters) {
      const cssUrl =
        body.getAttribute('data-supa-katex-css-url') ||
        'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css';
      const jsUrl =
        body.getAttribute('data-supa-katex-js-url') ||
        'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.mjs';

      if (!document.querySelector(`link[href="${cssUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);
      }

      try {
        const katexModule = await import(/* @vite-ignore */ jsUrl);
        const renderMathInElement = katexModule.default ?? katexModule.renderMathInElement;
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(article, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false },
              { left: '$', right: '$', display: false }
            ],
            throwOnError: false
          });
        }
      } catch {
        // Ignore network errors when offline
      }
    }
  }
}
