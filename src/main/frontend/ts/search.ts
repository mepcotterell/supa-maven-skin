import Dialog from 'bootstrap/js/dist/dialog.js';

export interface SearchDocument {
  title: string;
  href: string;
  section?: string;
  kind?: 'page' | 'section' | 'nav';
  content: string;
}

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
  return escapedText.replace(regex, '<mark class="furo-search-mark">$1</mark>');
}

export function collectLocalSearchDocuments(doc: Document = document): SearchDocument[] {
  const results: SearchDocument[] = [];
  const seenHrefs = new Set<string>();

  // 1. Collect sidebar navigation links
  const navLinks = doc.querySelectorAll<HTMLAnchorElement>('.furo-sidebar-tree a.furo-nav-link');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href')?.trim();
    const title = link.textContent?.trim();
    if (!href || !title || seenHrefs.has(href)) {
      return;
    }
    seenHrefs.add(href);
    const groupCaption = link
      .closest('.furo-nav-group')
      ?.querySelector('.furo-nav-caption')
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
  const article = doc.getElementById('furo-main-content');
  if (article) {
    const pageTitle =
      doc.querySelector('.furo-article h1')?.textContent?.trim() || doc.title || 'Current Page';
    const headings = article.querySelectorAll<HTMLHeadingElement>('h1[id], h2[id], h3[id], h4[id]');
    headings.forEach((h) => {
      const clone = h.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.furo-headerlink').forEach((el) => el.remove());
      const headingTitle = clone.textContent?.trim();
      if (!headingTitle) {
        return;
      }
      const nextEl = h.nextElementSibling;
      const isNextHeading = nextEl ? /^H[1-6]$/.test(nextEl.tagName) : false;
      const nextText = !isNextHeading && nextEl ? nextEl.textContent?.trim()?.slice(0, 220) || '' : '';
      const href = `#${h.id}`;
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
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  const internalLinks = localDocs
    .map((d) => d.href)
    .filter(
      (href) =>
        href &&
        !href.startsWith('#') &&
        !href.startsWith('http://') &&
        !href.startsWith('https://') &&
        href.endsWith('.html')
    )
    .slice(0, 25);

  const fetchedDocs: SearchDocument[] = [...localDocs];
  const parser = new DOMParser();

  await Promise.all(
    internalLinks.map(async (href) => {
      try {
        const res = await fetch(href);
        if (!res.ok) {
          return;
        }
        const html = await res.text();
        const parsedDoc = parser.parseFromString(html, 'text/html');
        const mainEl = parsedDoc.getElementById('furo-main-content');
        if (!mainEl) {
          return;
        }
        const pageTitle =
          mainEl.querySelector('h1')?.textContent?.trim() ||
          parsedDoc.title ||
          href;
        const bodySnippet = (mainEl.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 600);
        fetchedDocs.push({
          title: pageTitle,
          href,
          section: 'Site Page',
          kind: 'page',
          content: `${pageTitle} ${bodySnippet}`
        });
      } catch {
        // Ignore offline/file:// fetch errors
      }
    })
  );

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(fetchedDocs));
    }
  } catch {
    // Ignore storage quota errors
  }

  return fetchedDocs;
}

export function initSearch(): void {
  if (document.body.getAttribute('data-furo-search') === 'false') {
    return;
  }

  const dialogEl = document.getElementById('furoSearchDialog') as HTMLDialogElement | null;
  const inputEl = document.getElementById('furoSearchInput') as HTMLInputElement | null;
  const resultsEl = document.getElementById('furoSearchResults');
  const statusEl = document.getElementById('furoSearchStatus');
  if (!dialogEl || !inputEl || !resultsEl || !statusEl) {
    return;
  }

  let searchDocs = collectLocalSearchDocuments(document);
  let fullSiteIndexed = false;
  let activeIndex = -1;

  const version =
    document.documentElement.getAttribute('data-furo-project-version') || '0.1.0';
  const cacheKey = `furo-search-index-${version}`;

  const ensureSiteIndex = async () => {
    if (fullSiteIndexed) {
      return;
    }
    fullSiteIndexed = true;
    searchDocs = await fetchSiteIndex(searchDocs, cacheKey);
    if (inputEl.value.trim()) {
      renderResults(inputEl.value);
    }
  };

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
      link.className = `furo-search-result-item${idx === 0 ? ' is-active' : ''}`;
      link.href = match.href;
      link.setAttribute('role', 'option');

      const topRow = document.createElement('div');
      topRow.className = 'furo-search-result-top';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'furo-search-result-title';
      const displayTitle = match.section ? `${match.section} › ${match.title}` : match.title;
      titleDiv.innerHTML = highlightQueryTerms(displayTitle, query);

      const badgeSpan = document.createElement('span');
      badgeSpan.className = `furo-search-result-badge is-${match.kind || 'section'}`;
      badgeSpan.textContent =
        match.kind === 'page' ? 'Page' : match.kind === 'nav' ? 'Nav' : 'Section';

      topRow.appendChild(titleDiv);
      topRow.appendChild(badgeSpan);

      const snippetDiv = document.createElement('div');
      snippetDiv.className = 'furo-search-result-snippet';
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

  inputEl.addEventListener('input', () => {
    void ensureSiteIndex();
    renderResults(inputEl.value);
  });

  inputEl.addEventListener('keydown', (e) => {
    const items = Array.from(
      resultsEl.querySelectorAll<HTMLAnchorElement>('.furo-search-result-item')
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

  dialogEl.addEventListener('shown.bs.dialog', () => {
    void ensureSiteIndex();
    inputEl.focus();
  });
}
