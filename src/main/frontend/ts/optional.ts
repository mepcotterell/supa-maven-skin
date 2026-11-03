/**
 * @fileoverview Optional lazy-loaded Mermaid diagram and KaTeX math rendering
 * when enabled in `<custom><supaSkin>` or detected in the page DOM.
 *
 * The built-in CDN defaults are pinned to exact releases and loaded as classic
 * single-file builds with Subresource Integrity. Dynamic `import()` cannot
 * carry an integrity hash, and the ESM entry points of both libraries import
 * further modules from the CDN, so only classic `<script integrity>` loads
 * cover every byte that runs. Consumer-supplied URLs keep working: a URL ending
 * in `.mjs` is still loaded with `import()`, any other URL with `<script>`.
 */

/** A remote asset URL plus the SRI hash of the exact bytes served there. */
export interface PinnedAsset {
  url: string;
  integrity: string;
}

/**
 * Built-in, version-pinned CDN assets. This is the single source of truth for
 * the defaults: `site.vm` only emits `data-supa-*-url` attributes when a
 * consumer overrides them, so a URL can never drift from its hash.
 *
 * Hashes were computed from the bytes jsDelivr serves (identical to the npm
 * tarballs) with `openssl dgst -sha384 -binary | openssl base64 -A`. None of
 * these files fetch further code at runtime; `katex.min.css` loads its
 * `fonts/*` relative to itself, which are not executable and not SRI-checked.
 */
export const PINNED_ASSETS = {
  mermaid: {
    url: 'https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js',
    integrity: 'sha384-EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2'
  },
  katexCss: {
    url: 'https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css',
    integrity: 'sha384-nH0MfJ44wi1dd7w6jinlyBgljjS8EJAh2JBoRad8a3VDw2K69vfaaqm4WnR+gXtA'
  },
  katexCore: {
    url: 'https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.js',
    integrity: 'sha384-CwjPRVHTvLiMBFjEoij+QZViMV5rhTOIp7CJzl24JEqpRDA1sJFHVXXLURktbYYp'
  },
  katexAutoRender: {
    url: 'https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/contrib/auto-render.min.js',
    integrity: 'sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz'
  }
} as const satisfies Record<string, PinnedAsset>;

/** Loads an ES module by URL; injectable so tests can stub network imports. */
export type ModuleImporter = (url: string) => Promise<unknown>;

/** The subset of the Mermaid API used by the skin. */
interface MermaidApi {
  initialize(config: { startOnLoad: boolean; theme: string }): void;
  run(options: { nodes: HTMLElement[] }): Promise<void>;
}

/** KaTeX's `renderMathInElement(element, options)` auto-render entry point. */
type RenderMathInElement = (element: HTMLElement, options: Record<string, unknown>) => void;

/**
 * Imports an ES module natively. `@vite-ignore` keeps Vite from trying to
 * bundle a URL that is only known at runtime.
 *
 * @param url - Module URL to import.
 * @returns The imported module namespace.
 */
const nativeImport: ModuleImporter = (url) => import(/* @vite-ignore */ url);

/**
 * Returns the SRI hash for a URL only when it is exactly one of the built-in
 * pinned assets. Custom URLs are the consumer's responsibility, and guessing a
 * hash for them would break their loads.
 *
 * @param url - Absolute or relative asset URL.
 * @returns The `sha384-...` integrity value, or `undefined` for custom URLs.
 */
export function pinnedIntegrity(url: string): string | undefined {
  return Object.values(PINNED_ASSETS).find((asset) => asset.url === url)?.integrity;
}

/**
 * Decides whether a URL must be loaded with `import()` (ES module) instead of a
 * classic `<script>`, based on a `.mjs` path extension (query and fragment
 * ignored). This preserves pre-SRI overrides, which were always ESM.
 *
 * @param url - Asset URL to classify.
 * @returns True for `.mjs` URLs.
 */
export function isModuleUrl(url: string): boolean {
  return /\.mjs$/i.test(url.split(/[?#]/, 1)[0]);
}

/**
 * Reads a global installed by a classic UMD/IIFE script (for example
 * `window.mermaid` or `window.renderMathInElement`).
 *
 * @param name - Global property name.
 * @returns The global value, or `undefined` when absent.
 */
function readGlobal(name: string): unknown {
  return (globalThis as unknown as Record<string, unknown>)[name];
}

/**
 * Appends a classic `<script>` to `<head>` and waits for it to execute. Pinned
 * URLs get `integrity` plus `crossorigin="anonymous"` (required for the browser
 * to check SRI on a cross-origin response); custom URLs get neither, so CDNs
 * or hosts without CORS headers keep working.
 *
 * @param url - Script URL.
 * @returns Promise that resolves on `load` and rejects on `error` (including
 *     SRI mismatches).
 */
function loadClassicScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    const integrity = pinnedIntegrity(url);
    if (integrity) {
      script.setAttribute('integrity', integrity);
      script.setAttribute('crossorigin', 'anonymous');
    }
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error(`Failed to load ${url}`)));
    document.head.appendChild(script);
  });
}

/**
 * Appends a stylesheet `<link>` once per URL, with SRI for pinned URLs.
 *
 * @param url - Stylesheet URL.
 */
function loadStylesheet(url: string): void {
  // Compare attributes directly rather than via a selector so URLs containing
  // quotes cannot break `querySelector`.
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
    (link) => link.getAttribute('href') === url
  );
  if (existing) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  const integrity = pinnedIntegrity(url);
  if (integrity) {
    link.setAttribute('integrity', integrity);
    link.setAttribute('crossorigin', 'anonymous');
  }
  document.head.appendChild(link);
}

/**
 * Checks that a value exposes the Mermaid methods the skin calls.
 *
 * @param value - Candidate Mermaid API object.
 * @returns True when `initialize` and `run` are functions.
 */
function isMermaidApi(value: unknown): value is MermaidApi {
  const candidate = value as Partial<MermaidApi> | null | undefined;
  return typeof candidate?.initialize === 'function' && typeof candidate.run === 'function';
}

/**
 * Loads Mermaid from an ES module URL or a classic script exposing
 * `window.mermaid`.
 *
 * @param url - Mermaid URL (pinned default or consumer override).
 * @param importModule - ES module importer.
 * @returns The Mermaid API, or `undefined` when the URL did not provide one.
 */
async function loadMermaid(url: string, importModule: ModuleImporter): Promise<MermaidApi | undefined> {
  let candidate: unknown;
  if (isModuleUrl(url)) {
    const mod = (await importModule(url)) as { default?: unknown } | null;
    candidate = mod?.default ?? mod;
  } else {
    await loadClassicScript(url);
    candidate = readGlobal('mermaid');
  }
  return isMermaidApi(candidate) ? candidate : undefined;
}

/**
 * Loads KaTeX auto-render from an ES module URL or a classic script exposing
 * `window.renderMathInElement`.
 *
 * The classic `auto-render(.min).js` build reads `window.katex` while it
 * executes, so the core `katex.min.js` from the parent directory (the layout of
 * KaTeX's `dist/` on every CDN and in self-hosted copies) is loaded first
 * unless the page already defines `window.katex`. For the pinned default this
 * resolves to the pinned, SRI-checked core build.
 *
 * @param url - Auto-render URL (pinned default or consumer override).
 * @param importModule - ES module importer.
 * @returns `renderMathInElement`, or `undefined` when the URL did not provide it.
 */
async function loadRenderMathInElement(
  url: string,
  importModule: ModuleImporter
): Promise<RenderMathInElement | undefined> {
  let candidate: unknown;
  if (isModuleUrl(url)) {
    const mod = (await importModule(url)) as { default?: unknown; renderMathInElement?: unknown } | null;
    candidate = mod?.default ?? mod?.renderMathInElement;
  } else {
    const absoluteUrl = new URL(url, document.baseURI).href;
    if (/\/auto-render(\.min)?\.js$/i.test(absoluteUrl.split(/[?#]/, 1)[0]) && readGlobal('katex') === undefined) {
      await loadClassicScript(new URL('../katex.min.js', absoluteUrl).href);
    }
    await loadClassicScript(url);
    candidate = readGlobal('renderMathInElement');
  }
  return typeof candidate === 'function' ? (candidate as RenderMathInElement) : undefined;
}

/**
 * Lazily loads and initializes Mermaid diagrams and KaTeX math expressions
 * inside `#supa-main-content` when configured or detected on the page.
 *
 * @param importModule - ES module importer used for `.mjs` overrides
 *     (defaults to native `import()`; injectable for tests).
 * @returns Promise that resolves once optional libraries have initialized.
 */
export async function initOptionalLibraries(importModule: ModuleImporter = nativeImport): Promise<void> {
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
      const mermaidUrl = body.getAttribute('data-supa-mermaid-url') || PINNED_ASSETS.mermaid.url;
      try {
        const mermaid = await loadMermaid(mermaidUrl, importModule);
        if (mermaid) {
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
        }
      } catch {
        // Ignore network errors when offline (SRI failures are already
        // reported in the console by the browser).
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
      const cssUrl = body.getAttribute('data-supa-katex-css-url') || PINNED_ASSETS.katexCss.url;
      const jsUrl = body.getAttribute('data-supa-katex-js-url') || PINNED_ASSETS.katexAutoRender.url;

      loadStylesheet(cssUrl);

      try {
        const renderMathInElement = await loadRenderMathInElement(jsUrl, importModule);
        if (renderMathInElement) {
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
        // Ignore network errors when offline (SRI failures are already
        // reported in the console by the browser).
      }
    }
  }
}
