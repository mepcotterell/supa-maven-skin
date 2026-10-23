import ScrollSpy from 'bootstrap/js/dist/scrollspy.js';
import { setTooltipTitle } from './bootstrap-components';

export function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

/**
 * Ensures every heading in the article has a deterministic clean slug `id`
 * (e.g. `#1-actions-buttons`) while preserving any preceding Doxia `<a id="...">`
 * anchor for backward compatibility, and attaches the optional Furo `#` permalink.
 */
export function prepareHeadings(
  article: HTMLElement,
  enablePermalinks = true,
  permalinkSymbol = '#'
): HTMLHeadingElement[] {
  const usedIds = new Set<string>();
  const allHeadings = Array.from(
    article.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')
  ).filter((h) => !h.closest('.not-prose'));

  allHeadings.forEach((heading) => {
    let id = heading.id?.trim();

    // If Doxia placed an empty <a id="..."> inside the heading, move it before the heading
    const innerAnchor = heading.querySelector<HTMLAnchorElement>('a[id], a[name]');
    if (innerAnchor && !innerAnchor.textContent?.trim()) {
      heading.parentNode?.insertBefore(innerAnchor, heading);
    }

    // Check if Doxia placed an empty <a id="..."> or <a name="..."> right before the heading
    const prev = heading.previousElementSibling;
    const prevAnchor =
      prev && prev.tagName === 'A' && !prev.textContent?.trim()
        ? (prev as HTMLAnchorElement)
        : null;
    const doxiaId = prevAnchor ? prevAnchor.id || prevAnchor.getAttribute('name') || '' : '';
    if (doxiaId) {
      heading.setAttribute('data-doxia-id', doxiaId);
    }

    if (!id) {
      const clone = heading.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.furo-headerlink').forEach((el) => el.remove());
      const baseSlug = slugifyHeading(clone.textContent || 'section');

      // If the preceding Doxia anchor already uses the exact same lowercase slug,
      // remove its id so the heading itself owns that id without DOM duplication.
      if (prevAnchor && prevAnchor.id === baseSlug) {
        prevAnchor.removeAttribute('id');
      }

      let candidate = baseSlug;
      let counter = 2;
      while (usedIds.has(candidate) || document.getElementById(candidate)) {
        candidate = `${baseSlug}-${counter++}`;
      }
      id = candidate;
    }

    usedIds.add(id);
    heading.id = id;

    if (enablePermalinks && heading.tagName !== 'H1' && !heading.querySelector('.furo-headerlink')) {
      const anchor = document.createElement('a');
      anchor.className = 'furo-headerlink';
      anchor.href = `#${id}`;
      anchor.setAttribute('aria-label', `Permalink to ${heading.textContent?.trim() || 'heading'}`);
      setTooltipTitle(anchor, 'Copy permalink to this heading', 'top');
      anchor.textContent = permalinkSymbol;

      anchor.addEventListener('click', async () => {
        try {
          if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
            const url = new URL(window.location.href);
            url.hash = id;
            await navigator.clipboard.writeText(url.toString());
            anchor.classList.add('is-copied');
            anchor.setAttribute('data-copied-label', 'Copied!');
            setTooltipTitle(anchor, 'Copied!', 'top');
            window.setTimeout(() => {
              anchor.classList.remove('is-copied');
              setTooltipTitle(anchor, 'Copy permalink to this heading', 'top');
            }, 1500);
          }
        } catch {
          // Ignore clipboard errors in non-secure contexts
        }
      });

      heading.appendChild(anchor);
    }
  });

  return allHeadings;
}

/**
 * Builds the right-hand "On this page" table of contents (`#furoTocNav`) and
 * maintains a single active section indicator synced with both the right TOC
 * and any hash sub-links in the left navigation sidebar.
 */
export function buildTableOfContents(
  article: HTMLElement,
  tocNav: HTMLElement | null,
  maxDepth = 4
): void {
  if (!tocNav) {
    return;
  }

  const clampedDepth = Math.min(Math.max(maxDepth, 2), 6);
  const selectors: string[] = [];
  for (let level = 2; level <= clampedDepth; level++) {
    selectors.push(`h${level}`);
  }

  const headings = Array.from(
    article.querySelectorAll<HTMLHeadingElement>(selectors.join(', '))
  ).filter((h) => !h.closest('.not-prose') && h.id);

  tocNav.innerHTML = '';
  const tocColumn = tocNav.closest<HTMLElement>('.furo-toc-column');
  const tocScroll = tocNav.closest<HTMLElement>('.furo-toc-scroll');
  const tocTriggers = document.querySelectorAll<HTMLElement>('.furo-toc-drawer-trigger');

  if (headings.length === 0) {
    tocColumn?.classList.add('is-empty');
    tocTriggers.forEach((btn) => btn.classList.add('d-none'));
    return;
  }

  tocColumn?.classList.remove('is-empty');

  const tocLinksById = new Map<string, HTMLAnchorElement>();
  const aliasToHeadingId = new Map<string, string>();

  headings.forEach((heading, idx) => {
    const level = Number.parseInt(heading.tagName.slice(1), 10);
    const clone = heading.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.furo-headerlink').forEach((el) => el.remove());
    const text = clone.textContent?.trim() || heading.id;

    const link = document.createElement('a');
    link.className = `nav-link furo-toc-level-${level}${idx === 0 ? ' active' : ''}`;
    link.href = `#${heading.id}`;
    link.textContent = text;
    tocNav.appendChild(link);
    tocLinksById.set(heading.id, link);
    aliasToHeadingId.set(heading.id, heading.id);

    const doxiaId = heading.getAttribute('data-doxia-id');
    if (doxiaId) {
      aliasToHeadingId.set(doxiaId, heading.id);
    }
  });

  // Collect hash sub-links in the left sidebar that point to sections on the current page
  const currentPageName =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop() || 'index.html'
      : '';
  const sidebarHashLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.furo-sidebar-tree a.furo-nav-link[href*="#"]')
  ).filter((link) => {
    const href = link.getAttribute('href') || '';
    const hashIdx = href.indexOf('#');
    if (hashIdx < 0) return false;
    const pagePart = href.slice(0, hashIdx).split('/').pop() || '';
    const hashPart = href.slice(hashIdx + 1);
    if (!pagePart) return true;
    if (currentPageName && pagePart === currentPageName) return true;
    return aliasToHeadingId.has(hashPart);
  });

  const sidebarTargetHeadingIds = new Set<string>();
  sidebarHashLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const hashIdx = href.indexOf('#');
    if (hashIdx >= 0) {
      const rawHash = href.slice(hashIdx + 1);
      const canonical = aliasToHeadingId.get(rawHash);
      if (canonical) {
        sidebarTargetHeadingIds.add(canonical);
      }
    }
  });

  const resolveSidebarActiveHeadingId = (activeId: string): string => {
    if (sidebarTargetHeadingIds.has(activeId)) {
      return activeId;
    }
    const idx = headings.findIndex((h) => h.id === activeId);
    if (idx > 0) {
      const activeLevel = Number.parseInt(headings[idx].tagName.slice(1), 10);
      for (let i = idx - 1; i >= 0; i--) {
        const candidate = headings[i];
        const candidateLevel = Number.parseInt(candidate.tagName.slice(1), 10);
        if (candidateLevel < activeLevel && sidebarTargetHeadingIds.has(candidate.id)) {
          return candidate.id;
        }
      }
    }
    return activeId;
  };

  let lastActiveId = '';

  const setActiveHeading = (rawActiveId: string) => {
    const activeId = aliasToHeadingId.get(rawActiveId) || rawActiveId;
    const changed = activeId !== lastActiveId;
    lastActiveId = activeId;

    let activeLink: HTMLAnchorElement | null = null;
    tocLinksById.forEach((link, id) => {
      const isActive = id === activeId;
      link.classList.toggle('active', isActive);
      if (isActive) {
        activeLink = link;
      }
    });

    const sidebarActiveId = resolveSidebarActiveHeadingId(activeId);
    sidebarHashLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const hashIdx = href.indexOf('#');
      if (hashIdx >= 0) {
        const rawHash = href.slice(hashIdx + 1);
        const canonical = aliasToHeadingId.get(rawHash) || rawHash;
        link.classList.toggle('active', canonical === sidebarActiveId);
      }
    });

    // Keep the active TOC link visible inside the sticky .furo-toc-scroll container
    if (changed && activeLink && tocScroll && tocScroll.scrollHeight > tocScroll.clientHeight) {
      const scrollRect = tocScroll.getBoundingClientRect();
      const linkRect = (activeLink as HTMLElement).getBoundingClientRect();
      const topPadding = 24;
      const bottomPadding = 24;
      if (linkRect.top < scrollRect.top + topPadding) {
        tocScroll.scrollTop += linkRect.top - (scrollRect.top + topPadding);
      } else if (linkRect.bottom > scrollRect.bottom - bottomPadding) {
        tocScroll.scrollTop += linkRect.bottom - (scrollRect.bottom - bottomPadding);
      }
    }
  };

  try {
    new ScrollSpy(document.body, {
      target: '#furoTocNav',
      rootMargin: '0px 0px -70%',
      smoothScroll: true
    });
  } catch {
    // Fallback if ScrollSpy cannot initialize in synthetic DOM environments
  }

  // Enforce single active heading (accounts for heading scroll-margin-top ~144px)
  const syncActiveOnScroll = () => {
    const threshold = 160;
    let currentId = headings[0]?.id || '';
    for (const h of headings) {
      const top = h.getBoundingClientRect().top;
      if (top <= threshold) {
        currentId = h.id;
      } else {
        break;
      }
    }
    if (
      typeof window !== 'undefined' &&
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24
    ) {
      currentId = headings[headings.length - 1]?.id || currentId;
    }
    if (currentId) {
      setActiveHeading(currentId);
    }
  };

  if (typeof window !== 'undefined') {
    document.body.addEventListener('activate.bs.scrollspy', syncActiveOnScroll);
    window.addEventListener('scroll', syncActiveOnScroll, { passive: true });
    window.addEventListener('hashchange', () => {
      const hashId = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      const canonical = aliasToHeadingId.get(hashId) || hashId;
      if (canonical && tocLinksById.has(canonical)) {
        setActiveHeading(canonical);
      }
    });
    syncActiveOnScroll();
  }
}

export function initTocAndScrollSpy(): void {
  const article = document.getElementById('furo-main-content');
  if (!article) {
    return;
  }

  const body = document.body;
  const enablePermalinks = body.getAttribute('data-furo-heading-permalinks') !== 'false';
  const permalinkSymbol = body.getAttribute('data-furo-permalink-symbol') || '#';
  const tocMaxDepth = Number.parseInt(body.getAttribute('data-furo-toc-max-depth') || '4', 10);

  prepareHeadings(article, enablePermalinks, permalinkSymbol);

  // If the page loaded with a #hash pointing to a slugified heading id that was assigned
  // dynamically by prepareHeadings(), scroll to it before building the TOC so initial
  // active state reflects the scrolled position.
  if (typeof window !== 'undefined' && window.location.hash.length > 1) {
    const rawHash = decodeURIComponent(window.location.hash.slice(1));
    const targetEl = document.getElementById(rawHash);
    if (targetEl && window.scrollY === 0) {
      targetEl.scrollIntoView();
    }
  }

  const tocNav = document.getElementById('furoTocNav');
  buildTableOfContents(article, tocNav, Number.isNaN(tocMaxDepth) ? 4 : tocMaxDepth);
}
