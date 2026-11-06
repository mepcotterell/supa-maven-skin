/**
 * @fileoverview Client-side search dialog, local DOM indexing, and cross-page
 * HTML crawler for Supa Maven Skin.
 */

import Dialog from 'bootstrap/js/dist/dialog.js';
import { initDoxiaEnhancements } from './doxia';
import { getLabel, type LabelKey } from './labels';
import { assignHeadingIds, decodeFragment, findProseHeadings, headingTextLanguage } from './toc';

/**
 * What a search entry points at: a crawled site page (`page`), a heading on a page (`section`),
 * or a sidebar link (`nav`).
 */
export type SearchDocumentKind = 'page' | 'section' | 'nav';

export interface SearchDocument {
  title: string;
  /**
   * Link target: site-root-relative (`guides/install.html#setup`) for pages inside the site,
   * `#id` for a heading on the current page, or an absolute URL. Site-root-relative values keep
   * the `sessionStorage` index valid on pages at any directory depth; `toPageHref()` turns them
   * back into links for the page that renders the results.
   */
  href: string;
  /**
   * Section name taken from the site itself: a sidebar menu caption from `site.xml` or a page
   * title. Absent when the site provides none; `resolveSearchSection()` then supplies the
   * generic name for the entry's `kind`.
   */
  section?: string;
  kind?: SearchDocumentKind;
  content: string;
  /**
   * Language of a heading's text (`headingTextLanguage()`), present only when it differs from
   * the language of the page the heading is on, such as `ja` for `<h2><span lang="ja">概要</span>`.
   * Results declare it on the heading text (WCAG 2.2 SC 3.1.2). Entries cached by 0.1.6 and
   * earlier have none; `entryLanguage()` reads it.
   */
  lang?: string;
}

/** Matches an href that starts with a URL scheme such as `https:` or `mailto:`. */
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

/** Tag names of the heading levels that search indexes on crawled pages. */
const INDEXED_HEADING_TAG = /^H[1-4]$/;

/**
 * Labels of the generic section names for entries whose section the site does not name. They
 * are looked up when results are ranked and rendered instead of being stored in the entries, so
 * the `sessionStorage` index holds only the site's own text and never goes stale when these or
 * the site's translations of them change.
 * A `section` entry lacks a section only on the current page, when it has neither a `<title>`
 * nor an `<h1>`; headings on crawled pages fall back to the page's sidebar link text or href.
 */
const GENERIC_SECTION_NAMES: Record<SearchDocumentKind, LabelKey> = {
  page: 'searchSectionPage',
  section: 'searchSectionCurrent',
  nav: 'searchSectionNav'
};

/** Prefix of the `sessionStorage` key that caches the crawled search index. */
const SEARCH_INDEX_KEY_PREFIX = 'supa-search-index-';

/**
 * Returns the section name that search results show and match for `doc`: the site's own name
 * when the entry has one, otherwise the generic name for its kind.
 *
 * @param doc - Search entry.
 * @returns Section name, or `''` for an entry with neither a section nor a kind.
 */
function resolveSearchSection(doc: SearchDocument): string {
  return doc.section || (doc.kind ? getLabel(GENERIC_SECTION_NAMES[doc.kind]) : '');
}

/**
 * Escapes HTML special characters in `text` and wraps matching search query terms
 * (2+ characters) in `<mark class="supa-search-mark">` elements.
 *
 * @param text - Raw text to highlight.
 * @param rawQuery - Raw search query entered by the user.
 * @returns HTML-escaped string with `<mark>` tags around matching terms.
 */
export function highlightQueryTerms(text: string, rawQuery: string): string {
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const terms = rawQuery
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (terms.length === 0) {
    return escapedText;
  }
  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  return escapedText.replace(regex, '<mark class="supa-search-mark">$1</mark>');
}

/**
 * Reads the language an entry records for its heading text. An entry cached by an older
 * release, or one whose `lang` is not a string, records none.
 *
 * @param doc - Search entry.
 * @returns The language tag, or null.
 */
function entryLanguage(doc: SearchDocument): string | null {
  return typeof doc.lang === 'string' ? doc.lang : null;
}

/**
 * Appends `text` with its query terms highlighted to `parent`, inside a `<span lang>` when the
 * text is in another language than the results. Query terms hold no whitespace, so no match
 * spans the space between two pieces of text appended one after the other, and the pieces are
 * highlighted exactly as the whole text would be.
 *
 * @param parent - Element to append to.
 * @param text - Raw text.
 * @param rawQuery - Raw search query entered by the user.
 * @param language - Language tag of the text, or null when it is in the results' language.
 */
function appendHighlighted(
  parent: HTMLElement,
  text: string,
  rawQuery: string,
  language: string | null = null
): void {
  if (language === null) {
    parent.insertAdjacentHTML('beforeend', highlightQueryTerms(text, rawQuery));
    return;
  }
  const span = document.createElement('span');
  span.lang = language;
  span.innerHTML = highlightQueryTerms(text, rawQuery);
  parent.appendChild(span);
}

/**
 * Normalizes Doxia's synthetic root-relative report paths (`/project-info.html`
 * and `/project-reports.html`) into site-root-relative links.
 *
 * @param href - Raw link href attribute.
 * @returns Normalized site-root-relative href.
 */
function normalizeSyntheticReportHref(href: string): string {
  if (href === '/project-info.html' || href === '/project-reports.html') {
    return href.slice(1);
  }
  return href;
}

/**
 * Reads the path from the current page back to the site root, which `site.vm` writes into
 * `html[data-supa-relative-path]` from Doxia's `$relativePath` (`.`, `..`, `../..`).
 *
 * @param doc - Document to inspect (defaults to the global `document`).
 * @returns Relative path to the site root without a trailing slash (`.` when absent).
 */
export function getSiteRelativePath(doc: Document = document): string {
  const raw = doc.documentElement.getAttribute('data-supa-relative-path')?.trim() || '';
  return raw.replace(/\/+$/, '') || '.';
}

/**
 * Builds the `sessionStorage` key for the crawled search index. Cached hrefs are relative to
 * one site root and the cached titles are in one language, so the key names both, along with
 * the project version so that a new version starts a fresh index. maven-site-plugin renders the
 * default locale at the site root and every other locale under `<locale>/`, on the same origin
 * with the same version, and module sites sit below their parent's, so a key without the root
 * would hand one site's index to another. All pages of one site resolve to the same root, at any
 * directory depth, and share one index.
 *
 * @param doc - Document to read `<html lang>`, the project version, and the relative path from
 *     (defaults to the global `document`).
 * @returns `supa-search-index-<version> <lang> <site root URL>`. Spaces separate the parts
 *     because neither a language tag nor a serialized URL contains one.
 */
export function getSearchIndexCacheKey(doc: Document = document): string {
  const html = doc.documentElement;
  const version = html.getAttribute('data-supa-project-version')?.trim() || '0.1.0';
  const lang = html.getAttribute('lang')?.trim() || '';
  let siteRoot = '';
  try {
    // The same root toSiteRootHref() makes the cached hrefs relative to
    siteRoot = new URL(`${getSiteRelativePath(doc)}/`, doc.baseURI).href;
  } catch {
    // Unparseable page URL (for example about:blank): key by version and language only
  }
  return `${SEARCH_INDEX_KEY_PREFIX}${version} ${lang} ${siteRoot}`;
}

/**
 * Converts an href read from a page into a site-root-relative href. `site.vm` writes sidebar
 * links relative to the page that renders them (`../faq.html` on `guides/install.html`), so a
 * search index that stored them verbatim would break when `sessionStorage` hands it to a page
 * at another directory depth.
 *
 * @param href - Raw href attribute as written on the page.
 * @param pageUrl - Absolute URL of the page the href was read from.
 * @param relativePath - Path from that page back to the site root (`.`, `..`, ...).
 * @returns The site-root-relative href (`faq.html`, `guides/install.html#setup`, or `./` for
 *     the site root itself) for a link inside the site, `href` unchanged for a `#fragment`, or
 *     an absolute URL otherwise.
 */
export function toSiteRootHref(href: string, pageUrl: string, relativePath: string): string {
  const synthetic = normalizeSyntheticReportHref(href);
  if (synthetic !== href || href.startsWith('#')) {
    return synthetic;
  }
  let target: URL;
  let siteRoot: URL;
  try {
    target = new URL(href, pageUrl);
    siteRoot = new URL(`${relativePath.replace(/\/+$/, '') || '.'}/`, pageUrl);
  } catch {
    // Unparseable page URL (for example about:blank): keep the href as written
    return href;
  }
  if (target.origin !== siteRoot.origin || !target.pathname.startsWith(siteRoot.pathname)) {
    return target.href;
  }
  // The site root has an empty site-root-relative path. Keep it as "./": an empty href (or a
  // bare "#hash") would link to the page that renders the search results instead
  const path = target.pathname.slice(siteRoot.pathname.length) || './';
  // URL parsing percent-encodes the fragment (#%C3%BCberblick), while crawled sections keep the
  // heading id as written (#überblick); one form lets the index drop the duplicate entry
  const hash = target.hash ? `#${decodeFragment(target.hash)}` : '';
  return `${path}${target.search}${hash}`;
}

/**
 * Turns a site-root-relative href from the search index into a link for the current page,
 * mirroring `#supaResolveHref` in `site-macros.vm`.
 *
 * @param siteHref - Site-root-relative href, `#fragment`, or absolute URL.
 * @param relativePath - Path from the current page back to the site root (`.`, `..`, ...).
 * @returns The href prefixed with `relativePath` for a link inside the site, otherwise unchanged.
 */
export function toPageHref(siteHref: string, relativePath: string): string {
  if (
    !siteHref ||
    siteHref.startsWith('#') ||
    siteHref.startsWith('/') ||
    URL_SCHEME_PATTERN.test(siteHref)
  ) {
    return siteHref;
  }
  const prefix = relativePath.replace(/\/+$/, '') || '.';
  if (prefix === '.') {
    return siteHref;
  }
  // The site root "./" becomes "../" rather than ".././"
  return `${prefix}/${siteHref.replace(/^\.\//, '')}`;
}

/**
 * Decides whether the site crawler fetches a page from the search index: a `.html` page inside
 * the site (stored site-root-relative), or a `.html` page on the current origin outside the site
 * root, such as the parent project's `index.html` from `<menu ref="parent"/>`, which
 * `toSiteRootHref()` stored as an absolute URL. Pages on other origins are never fetched.
 *
 * @param href - Index href without its `#fragment`.
 * @param pageOrigin - Origin of the page running the crawler (`''` outside a browser).
 * @returns Whether to fetch and index the page.
 */
function isCrawlableHref(href: string, pageOrigin: string): boolean {
  if (!href.endsWith('.html')) {
    return false;
  }
  if (!URL_SCHEME_PATTERN.test(href)) {
    return !href.startsWith('/');
  }
  // file: pages report the opaque origin "null", and fetch() cannot read file: URLs anyway
  return pageOrigin !== '' && pageOrigin !== 'null' && href.startsWith(`${pageOrigin}/`);
}

/**
 * Computes the site-root-relative path of the page currently displayed, so remote index entries
 * for this page can be matched against its local `#id` headings.
 *
 * @param relativePath - Path from the current page back to the site root.
 * @returns Site-root-relative page path (`guides/install.html`), with a directory URL mapped
 *     to its `index.html`, or `''` outside a browser.
 */
function currentPageSiteHref(relativePath: string): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const pageUrl = window.location.href.split('#')[0].split('?')[0];
  // A directory URL for the site root comes back as "./"; drop that so it maps to "index.html"
  const siteHref = toSiteRootHref(pageUrl, pageUrl, relativePath).replace(/^\.\//, '');
  return siteHref === '' || siteHref.endsWith('/') ? `${siteHref}index.html` : siteHref;
}

/**
 * Extracts a clean human-readable page title from a document's `<title>` or primary `<h1>`.
 *
 * @param doc - Document to inspect.
 * @param fallback - Fallback title when neither `<title>` nor `<h1>` is present.
 * @returns Extracted page title.
 */
function extractCleanDocumentTitle(doc: Document, fallback: string): string {
  const rawTitle = doc.title?.trim() || '';
  if (rawTitle) {
    const cleaned = rawTitle.split(/\s+[\u2013\u2014-]\s+/)[0]?.trim();
    if (cleaned) {
      return cleaned;
    }
  }
  return doc.querySelector('#supa-main-content h1')?.textContent?.trim() || fallback;
}

/**
 * Collects searchable navigation links and current-page heading sections from a DOM document.
 *
 * @param doc - Document to index (defaults to the global `document`).
 * @returns Indexed local search documents.
 */
export function collectLocalSearchDocuments(doc: Document = document): SearchDocument[] {
  const results: SearchDocument[] = [];
  const seenHrefs = new Set<string>();
  const relativePath = getSiteRelativePath(doc);

  // 1. Collect sidebar navigation links
  const navLinks = doc.querySelectorAll<HTMLAnchorElement>('.supa-sidebar-tree a.supa-nav-link');
  navLinks.forEach((link) => {
    const rawHref = link.getAttribute('href')?.trim();
    const title = link.textContent?.trim();
    if (!rawHref || !title) {
      return;
    }
    const href = toSiteRootHref(rawHref, doc.baseURI, relativePath);
    if (seenHrefs.has(href)) {
      return;
    }
    seenHrefs.add(href);
    const groupCaption = link
      .closest('.supa-nav-group')
      ?.querySelector('.supa-nav-caption')
      ?.textContent?.trim();
    results.push({
      title,
      href,
      section: groupCaption || undefined,
      kind: 'nav',
      content: `${title} ${groupCaption || ''}`.trim()
    });
  });

  // 2. Collect headings and section snippets from the current article
  const article = doc.getElementById('supa-main-content');
  if (article) {
    const pageTitle = extractCleanDocumentTitle(doc, '');
    const pageLanguage = doc.documentElement.getAttribute('lang') ?? '';
    const headings = article.querySelectorAll<HTMLHeadingElement>('h1[id], h2[id], h3[id], h4[id]');
    headings.forEach((h) => {
      const clone = h.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.supa-headerlink').forEach((el) => el.remove());
      const headingTitle = clone.textContent?.trim();
      if (!headingTitle) {
        return;
      }
      const language = headingTextLanguage(h, clone);
      const nextEl = h.nextElementSibling;
      const isNextHeading = nextEl ? /^H[1-6]$/.test(nextEl.tagName) : false;
      const nextText = !isNextHeading && nextEl ? nextEl.textContent?.trim()?.slice(0, 220) || '' : '';
      const href = `#${h.id}`;
      if (seenHrefs.has(href)) {
        return;
      }
      seenHrefs.add(href);
      results.push({
        title: headingTitle,
        href,
        section: pageTitle || undefined,
        kind: 'section',
        content: `${headingTitle} ${nextText}`.trim(),
        ...(language !== pageLanguage ? { lang: language } : {})
      });
    });
  }

  return results;
}

/**
 * Filters and ranks search documents against a whitespace-tokenized search query.
 *
 * @param docs - Candidate search documents.
 * @param rawQuery - Raw search query string.
 * @param limit - Maximum number of results to return (defaults to 20).
 * @returns Ranked matching search documents.
 */
export function filterSearchDocuments(
  docs: SearchDocument[],
  rawQuery: string,
  limit = 20
): SearchDocument[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [];
  }
  const terms = query.split(/\s+/).filter(Boolean);

  const scored: Array<{ doc: SearchDocument; score: number }> = [];
  for (const item of docs) {
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();
    // Match the section name the result shows, generic names included
    const sectionLower = resolveSearchSection(item).toLowerCase();

    let matchesAll = true;
    let score = 0;
    for (const term of terms) {
      const inTitle = titleLower.includes(term);
      const inContent = contentLower.includes(term);
      const inSection = sectionLower.includes(term);
      if (!inTitle && !inContent && !inSection) {
        matchesAll = false;
        break;
      }
      if (titleLower === term) {
        score += 50;
      } else if (titleLower.startsWith(term)) {
        score += 30;
      } else if (inTitle) {
        score += 20;
      }
      if (inSection) {
        score += 8;
      }
      if (inContent) {
        score += 5;
      }
    }

    if (matchesAll) {
      scored.push({ doc: item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.doc);
}

/**
 * Merges local current-page search documents with remotely fetched site search documents,
 * deduplicating links and current-page section hashes.
 *
 * @param localDocs - Local search documents from the active DOM.
 * @param remoteDocs - Remote search documents crawled from sibling pages.
 * @param relativePath - Path from the current page back to the site root.
 * @returns Deduplicated combined search documents.
 */
function mergeSearchDocuments(
  localDocs: SearchDocument[],
  remoteDocs: SearchDocument[],
  relativePath: string
): SearchDocument[] {
  const currentPage = currentPageSiteHref(relativePath);
  const merged: SearchDocument[] = [...localDocs];
  const seenHrefs = new Set<string>(localDocs.map((d) => d.href));

  for (const doc of remoteDocs) {
    // Skip remote section entries that duplicate local `#hash` headings on the current page
    if (
      currentPage &&
      doc.href.startsWith(`${currentPage}#`) &&
      seenHrefs.has(doc.href.slice(currentPage.length))
    ) {
      continue;
    }
    if (!seenHrefs.has(doc.href)) {
      seenHrefs.add(doc.href);
      merged.push(doc);
    }
  }

  return merged;
}

/**
 * Crawls sibling `.html` pages linked from the sidebar navigation (with `sessionStorage`
 * caching) and merges their content and headings into the search index.
 *
 * @param localDocs - Local search documents from the active DOM.
 * @param cacheKey - `sessionStorage` key from `getSearchIndexCacheKey()`.
 * @param relativePath - Path from the current page back to the site root.
 * @returns Promise resolving to the merged site search index.
 */
async function fetchSiteIndex(
  localDocs: SearchDocument[],
  cacheKey: string,
  relativePath: string
): Promise<SearchDocument[]> {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as SearchDocument[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeSearchDocuments(localDocs, parsed, relativePath);
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  const navTitleByHref = new Map<string, string>();
  for (const doc of localDocs) {
    if (doc.kind === 'nav' && !doc.href.includes('#')) {
      navTitleByHref.set(normalizeSyntheticReportHref(doc.href), doc.title);
    }
  }

  const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pageHrefs = Array.from(
    new Set(
      localDocs
        .map((d) => normalizeSyntheticReportHref(d.href.split('#')[0]))
        .filter((href) => isCrawlableHref(href, pageOrigin))
    )
  ).slice(0, 30);

  const remoteDocs: SearchDocument[] = [];
  const parser = new DOMParser();

  await Promise.all(
    pageHrefs.map(async (href) => {
      try {
        const res = await fetch(toPageHref(href, relativePath));
        if (!res.ok) {
          return;
        }
        const html = await res.text();
        const parsedDoc = parser.parseFromString(html, 'text/html');
        const mainEl = parsedDoc.getElementById('supa-main-content');
        if (!mainEl) {
          return;
        }
        const pageTitle = extractCleanDocumentTitle(
          parsedDoc,
          navTitleByHref.get(href) || href
        );
        const bodySnippet = (mainEl.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 600);
        remoteDocs.push({
          title: pageTitle,
          href,
          kind: 'page',
          content: `${pageTitle} ${bodySnippet}`
        });

        // Also index the h1-h4 sections of fetched pages & Maven reports, each linked by the id
        // the page gives it when it opens: prepareHeadings() numbers repeated slugs over h1-h6
        // and around ids the page's elements already hold, through the same assignHeadingIds().
        // The page normalizes Doxia's output before that, which can move a heading into a
        // .not-prose component (tabs or an alert: no id) or drop a :bi-*: shortcode from its text
        // (another slug), so normalize this throwaway copy the same way first.
        initDoxiaEnhancements(mainEl);
        const pageLanguage = parsedDoc.documentElement.getAttribute('lang') ?? '';
        const headings = findProseHeadings(mainEl);
        const ids = assignHeadingIds(
          headings,
          Array.from(parsedDoc.querySelectorAll('[id]'), (el) => el.id)
        );
        const firstIndexed = headings.find((h) => INDEXED_HEADING_TAG.test(h.tagName));
        headings.forEach((h, idx) => {
          if (!INDEXED_HEADING_TAG.test(h.tagName)) {
            return;
          }
          const headingTitle = h.textContent?.trim();
          if (!headingTitle) {
            return;
          }

          // Skip the primary page title h1 if it matches the page title itself
          if (h === firstIndexed && h.tagName === 'H1' && headingTitle === pageTitle) {
            return;
          }

          const nextEl = h.nextElementSibling;
          const isNextHeading = nextEl ? /^H[1-6]$/.test(nextEl.tagName) : false;
          const nextText =
            !isNextHeading && nextEl ? nextEl.textContent?.trim()?.slice(0, 220) || '' : '';
          // The fetched markup has no permalinks yet, so the heading is its own text-only copy
          const language = headingTextLanguage(h, h);

          remoteDocs.push({
            title: headingTitle,
            href: `${href}#${ids[idx]}`,
            section: pageTitle,
            kind: 'section',
            content: `${headingTitle} ${nextText}`.trim(),
            ...(language !== pageLanguage ? { lang: language } : {})
          });
        });
      } catch {
        // Ignore offline/file:// fetch errors
      }
    })
  );

  try {
    if (typeof window !== 'undefined' && window.sessionStorage && remoteDocs.length > 0) {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(remoteDocs));
    }
  } catch {
    // Ignore storage quota errors
  }

  return mergeSearchDocuments(localDocs, remoteDocs, relativePath);
}

/**
 * Initializes the client-side search modal dialog (`#supaSearchDialog`), input listeners,
 * and global keyboard shortcuts (`/` and `Cmd/Ctrl + K`).
 */
export function initSearch(): void {
  if (document.body.getAttribute('data-supa-search') === 'false') {
    return;
  }

  const dialogEl = document.getElementById('supaSearchDialog') as HTMLDialogElement | null;
  const inputEl = document.getElementById('supaSearchInput') as HTMLInputElement | null;
  const resultsEl = document.getElementById('supaSearchResults');
  const statusEl = document.getElementById('supaSearchStatus');
  if (!dialogEl || !inputEl || !resultsEl || !statusEl) {
    return;
  }

  let searchDocs = collectLocalSearchDocuments(document);
  let fullSiteIndexed = false;
  let activeIndex = -1;

  const cacheKey = getSearchIndexCacheKey(document);
  const relativePath = getSiteRelativePath(document);

  /**
   * Renders matching search results for `query` into `#supaSearchResults`.
   *
   * @param query - Current search input value.
   */
  const renderResults = (query: string) => {
    resultsEl.innerHTML = '';
    activeIndex = -1;

    if (!query.trim()) {
      statusEl.textContent = getLabel('searchHint');
      return;
    }

    const matches = filterSearchDocuments(searchDocs, query);
    if (matches.length === 0) {
      statusEl.textContent = getLabel('searchNoResults', { query: query.trim() });
      return;
    }

    // Plural-free, so one translation fits every count in every language
    statusEl.textContent = getLabel('searchResultCount', { count: matches.length });

    matches.forEach((match, idx) => {
      const link = document.createElement('a');
      link.className = `supa-search-result-item${idx === 0 ? ' is-active' : ''}`;
      link.href = toPageHref(match.href, relativePath);
      link.setAttribute('role', 'option');

      const topRow = document.createElement('div');
      topRow.className = 'supa-search-result-top';

      // The heading text can be in another language than the page or section name around it
      const language = entryLanguage(match);
      const titleDiv = document.createElement('div');
      titleDiv.className = 'supa-search-result-title';
      const section = resolveSearchSection(match);
      if (section) {
        appendHighlighted(titleDiv, `${section} \u203a `, query);
      }
      appendHighlighted(titleDiv, match.title, query, language);

      const badgeSpan = document.createElement('span');
      badgeSpan.className = `supa-search-result-badge is-${match.kind || 'section'}`;
      badgeSpan.textContent = getLabel(
        match.kind === 'page'
          ? 'searchBadgePage'
          : match.kind === 'nav'
            ? 'searchBadgeNav'
            : 'searchBadgeSection'
      );

      topRow.appendChild(titleDiv);
      topRow.appendChild(badgeSpan);

      const snippetDiv = document.createElement('div');
      snippetDiv.className = 'supa-search-result-snippet';
      const snippet = match.content.slice(0, 140);
      // A section entry's content starts with its heading text, followed by the text after it
      const headingEnd =
        language !== null && match.title && match.content.startsWith(match.title)
          ? Math.min(match.title.length, snippet.length)
          : 0;
      if (headingEnd > 0) {
        appendHighlighted(snippetDiv, snippet.slice(0, headingEnd), query, language);
      }
      appendHighlighted(snippetDiv, snippet.slice(headingEnd), query);

      link.appendChild(topRow);
      link.appendChild(snippetDiv);

      link.addEventListener('click', () => {
        try {
          Dialog.getOrCreateInstance(dialogEl).hide();
        } catch {
          dialogEl.close?.();
        }
      });

      resultsEl.appendChild(link);
    });
    activeIndex = 0;
  };

  let indexPromise: Promise<void> | null = null;
  /**
   * Lazily triggers full-site indexing on first search modal activation.
   *
   * @returns Promise resolving once the site index is populated.
   */
  const ensureSiteIndex = (): Promise<void> => {
    if (fullSiteIndexed) {
      return Promise.resolve();
    }
    if (!indexPromise) {
      indexPromise = (async () => {
        searchDocs = await fetchSiteIndex(searchDocs, cacheKey, relativePath);
        fullSiteIndexed = true;
        if (inputEl.value.trim()) {
          renderResults(inputEl.value);
        }
      })();
    }
    return indexPromise;
  };

  inputEl.addEventListener('input', () => {
    renderResults(inputEl.value);
    void ensureSiteIndex();
  });

  inputEl.addEventListener('keydown', (e) => {
    const items = Array.from(
      resultsEl.querySelectorAll<HTMLAnchorElement>('.supa-search-result-item')
    );
    if (items.length === 0) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      items.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].click();
    }
  });

  // Global keyboard shortcuts: `/` or `Cmd/Ctrl + K`
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const isInput =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      try {
        Dialog.getOrCreateInstance(dialogEl).show();
      } catch {
        dialogEl.showModal?.();
      }
      void ensureSiteIndex();
      window.setTimeout(() => inputEl.focus(), 50);
    } else if (!isInput && e.key === '/' && !dialogEl.open) {
      e.preventDefault();
      try {
        Dialog.getOrCreateInstance(dialogEl).show();
      } catch {
        dialogEl.showModal?.();
      }
      void ensureSiteIndex();
      window.setTimeout(() => inputEl.focus(), 50);
    }
  });

  // Focus input when dialog opens via trigger button
  dialogEl.addEventListener('shown.bs.dialog', () => {
    void ensureSiteIndex();
    inputEl.focus();
  });
}
