/**
 * @fileoverview Client-side search dialog, local DOM indexing, and cross-page
 * HTML crawler for Supa Maven Skin.
 */

import Dialog from 'bootstrap/js/dist/dialog.js';
import { slugifyHeading } from './toc';

export interface SearchDocument {
  title: string;
  href: string;
  section?: string;
  kind?: 'page' | 'section' | 'nav';
  content: string;
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
 * Normalizes Doxia's synthetic root-relative report paths (`/project-info.html`
 * and `/project-reports.html`) into relative links.
 *
 * @param href - Raw link href attribute.
 * @returns Normalized relative href.
 */
function normalizeSyntheticReportHref(href: string): string {
  if (href === '/project-info.html' || href === '/project-reports.html') {
    return href.slice(1);
  }
  return href;
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

  // 1. Collect sidebar navigation links
  const navLinks = doc.querySelectorAll<HTMLAnchorElement>('.supa-sidebar-tree a.supa-nav-link');
  navLinks.forEach((link) => {
    const rawHref = link.getAttribute('href')?.trim();
    const title = link.textContent?.trim();
    if (!rawHref || !title) {
      return;
    }
    const href = normalizeSyntheticReportHref(rawHref);
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
      section: groupCaption || 'Navigation',
      kind: 'nav',
      content: `${title} ${groupCaption || ''}`.trim()
    });
  });

  // 2. Collect headings and section snippets from the current article
  const article = doc.getElementById('supa-main-content');
  if (article) {
    const pageTitle = extractCleanDocumentTitle(doc, 'Current Page');
    const headings = article.querySelectorAll<HTMLHeadingElement>('h1[id], h2[id], h3[id], h4[id]');
    headings.forEach((h) => {
      const clone = h.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.supa-headerlink').forEach((el) => el.remove());
      const headingTitle = clone.textContent?.trim();
      if (!headingTitle) {
        return;
      }
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
        section: pageTitle,
        kind: 'section',
        content: `${headingTitle} ${nextText}`.trim()
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
    const sectionLower = (item.section || '').toLowerCase();

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
 * @returns Deduplicated combined search documents.
 */
function mergeSearchDocuments(
  localDocs: SearchDocument[],
  remoteDocs: SearchDocument[]
): SearchDocument[] {
  const currentPageName =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop() || 'index.html'
      : '';
  const merged: SearchDocument[] = [...localDocs];
  const seenHrefs = new Set<string>(localDocs.map((d) => d.href));

  for (const doc of remoteDocs) {
    // Skip remote section entries that duplicate local `#hash` headings on the current page
    if (
      currentPageName &&
      doc.href.startsWith(`${currentPageName}#`) &&
      seenHrefs.has(doc.href.slice(currentPageName.length))
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
 * @param cacheKey - `sessionStorage` key scoped to the project version.
 * @returns Promise resolving to the merged site search index.
 */
async function fetchSiteIndex(
  localDocs: SearchDocument[],
  cacheKey: string
): Promise<SearchDocument[]> {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as SearchDocument[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeSearchDocuments(localDocs, parsed);
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

  const pageHrefs = Array.from(
    new Set(
      localDocs
        .map((d) => normalizeSyntheticReportHref(d.href.split('#')[0]))
        .filter(
          (href) =>
            href &&
            !href.startsWith('#') &&
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            href.endsWith('.html')
        )
    )
  ).slice(0, 30);

  const remoteDocs: SearchDocument[] = [];
  const parser = new DOMParser();

  await Promise.all(
    pageHrefs.map(async (href) => {
      try {
        const res = await fetch(href);
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
          section: 'Site Page',
          kind: 'page',
          content: `${pageTitle} ${bodySnippet}`
        });

        // Also index h1-h4 sections on fetched pages & Maven reports
        const usedSlugs = new Set<string>();
        const headings = mainEl.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4');
        headings.forEach((h, idx) => {
          if (h.closest('.not-prose')) {
            return;
          }
          const headingTitle = h.textContent?.trim();
          if (!headingTitle) {
            return;
          }
          const baseSlug = h.id?.trim() || slugifyHeading(headingTitle);
          let slug = baseSlug;
          let counter = 2;
          while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${counter++}`;
          }
          usedSlugs.add(slug);

          // Skip the primary page title h1 if it matches the page title itself
          if (idx === 0 && h.tagName === 'H1' && headingTitle === pageTitle) {
            return;
          }

          const nextEl = h.nextElementSibling;
          const isNextHeading = nextEl ? /^H[1-6]$/.test(nextEl.tagName) : false;
          const nextText =
            !isNextHeading && nextEl ? nextEl.textContent?.trim()?.slice(0, 220) || '' : '';

          remoteDocs.push({
            title: headingTitle,
            href: `${href}#${slug}`,
            section: pageTitle,
            kind: 'section',
            content: `${headingTitle} ${nextText}`.trim()
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

  return mergeSearchDocuments(localDocs, remoteDocs);
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

  const version =
    document.documentElement.getAttribute('data-supa-project-version') || '0.1.0';
  const cacheKey = `supa-search-index-${version}`;

  /**
   * Renders matching search results for `query` into `#supaSearchResults`.
   *
   * @param query - Current search input value.
   */
  const renderResults = (query: string) => {
    resultsEl.innerHTML = '';
    activeIndex = -1;

    if (!query.trim()) {
      statusEl.textContent = 'Type to search navigation, headings, and site pages.';
      return;
    }

    const matches = filterSearchDocuments(searchDocs, query);
    if (matches.length === 0) {
      statusEl.textContent = `No results found for "${query.trim()}".`;
      return;
    }

    statusEl.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'} found`;

    matches.forEach((match, idx) => {
      const link = document.createElement('a');
      link.className = `supa-search-result-item${idx === 0 ? ' is-active' : ''}`;
      link.href = match.href;
      link.setAttribute('role', 'option');

      const topRow = document.createElement('div');
      topRow.className = 'supa-search-result-top';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'supa-search-result-title';
      const displayTitle = match.section ? `${match.section} \u203a ${match.title}` : match.title;
      titleDiv.innerHTML = highlightQueryTerms(displayTitle, query);

      const badgeSpan = document.createElement('span');
      badgeSpan.className = `supa-search-result-badge is-${match.kind || 'section'}`;
      badgeSpan.textContent =
        match.kind === 'page' ? 'Page' : match.kind === 'nav' ? 'Nav' : 'Section';

      topRow.appendChild(titleDiv);
      topRow.appendChild(badgeSpan);

      const snippetDiv = document.createElement('div');
      snippetDiv.className = 'supa-search-result-snippet';
      snippetDiv.innerHTML = highlightQueryTerms(match.content.slice(0, 140), query);

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
        searchDocs = await fetchSiteIndex(searchDocs, cacheKey);
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
