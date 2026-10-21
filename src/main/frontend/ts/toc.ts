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
 * Ensures every heading in the article has a deterministic `id` and optional
 * Furo `#` permalink anchor with copy-to-clipboard feedback.
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

    // Check if Doxia placed an <a id="..."> or <a name="..."> inside or right before the heading
    if (!id) {
      const innerAnchor = heading.querySelector<HTMLAnchorElement>('a[id], a[name]');
      if (innerAnchor) {
        id = innerAnchor.id || innerAnchor.getAttribute('name') || '';
        if (id && !innerAnchor.textContent?.trim()) {
          innerAnchor.remove();
        }
      }
    }

    if (!id) {
      const prev = heading.previousElementSibling;
      if (prev && prev.tagName === 'A' && !prev.textContent?.trim()) {
        id = prev.id || prev.getAttribute('name') || '';
      }
    }

    if (!id) {
      const baseSlug = slugifyHeading(heading.textContent || 'section');
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
  const tocTriggers = document.querySelectorAll<HTMLElement>('.furo-toc-drawer-trigger');

  if (headings.length === 0) {
    tocColumn?.classList.add('is-empty');
    tocTriggers.forEach((btn) => btn.classList.add('d-none'));
    return;
  }

  tocColumn?.classList.remove('is-empty');

  const tocLinksById = new Map<string, HTMLAnchorElement>();

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
  });

  // Also collect any hash sub-links in the left sidebar pointing to sections on this page
  const sidebarHashLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.furo-sidebar-tree a.furo-nav-link[href*="#"]')
  );

  const setActiveHeading = (activeId: string) => {
    tocLinksById.forEach((link, id) => {
      link.classList.toggle('active', id === activeId);
    });

    sidebarHashLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const hashIdx = href.indexOf('#');
      if (hashIdx >= 0) {
        const hashId = href.slice(hashIdx + 1);
        link.classList.toggle('active', hashId === activeId);
      }
    });
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

  // Enforce single active heading (topmost heading above the 22% viewport line)
  const syncActiveOnScroll = () => {
    const threshold = 120;
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
    window.addEventListener('scroll', syncActiveOnScroll, { passive: true });
    window.addEventListener('hashchange', () => {
      const hashId = window.location.hash.replace(/^#/, '');
      if (hashId && tocLinksById.has(hashId)) {
        setActiveHeading(hashId);
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
  const enablePermalinks = body.getAttribute('data-furo-permalinks') !== 'false';
  const permalinkSymbol = body.getAttribute('data-furo-permalink-symbol') || '#';
  const maxDepth = Number.parseInt(body.getAttribute('data-furo-toc-max-depth') || '4', 10) || 4;

  prepareHeadings(article, enablePermalinks, permalinkSymbol);

  if (body.getAttribute('data-furo-toc') !== 'false') {
    const tocNav = document.getElementById('furoTocNav');
    buildTableOfContents(article, tocNav, maxDepth);
  }
}
