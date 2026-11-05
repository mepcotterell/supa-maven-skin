/**
 * @fileoverview Heading slug generation, Doxia `<a id="...">` anchor reconciliation,
 * permalink copy buttons, and sticky "On this page" ScrollSpy Table of Contents.
 */
import ScrollSpy from 'bootstrap/js/dist/scrollspy.js';
import { setTooltipTitle } from './bootstrap-components';

/**
 * Converts a heading text string into a lowercase hyphenated slug. Doxia 2 writes no `id` on
 * headings, so this slug is the anchor of every heading. Letters, combining marks, and digits of
 * any script are kept (`Überblick` gives `überblick`, `概要` stays `概要`), and the result is in
 * Unicode NFC so composed and decomposed input give the same slug. For ASCII-only text the slug
 * is the same as in releases before 0.1.6, which kept only `[A-Za-z0-9_]`.
 *
 * @param text - Raw heading text content.
 * @returns Lowercase slug (defaults to `'section'` if no letter or digit remains).
 */
export function slugifyHeading(text: string): string {
  return (
    text
      .normalize('NFC')
      .toLowerCase()
      .trim()
      // Variation selectors (U+FE0F after the warning sign U+26A0) and enclosing marks (the
      // keycap U+20E3) only change how a character is drawn. They are combining marks, so
      // without this an emoji heading would leave an invisible mark behind as its slug. The
      // emoji ℹ (U+2139) is a letter (Ll), so pictographs are removed by name. No ASCII
      // character is a pictograph, so ASCII slugs keep their pre-0.1.6 form.
      .replace(/[\p{Variation_Selector}\p{Me}\p{Extended_Pictographic}]/gu, '')
      .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      // Lowercasing and the removals above can leave a decomposed sequence: J + U+030C has no
      // precomposed form, but its lowercase j + U+030C composes to U+01F0. Normalize again.
      .normalize('NFC') || 'section'
  );
}

/**
 * Returns the id Doxia writes into a Markdown link to a heading id with non-ASCII characters.
 * Doxia 2's `Xhtml5BaseParser` passes the fragment of every relative link that is not a valid
 * Doxia id through `DoxiaUtils.encodeId`, so `[Überblick](#überblick)` reaches the page as
 * `#a.C3.BCberblick`. This ports `encodeId`: ASCII letters, digits, `-`, `_`, and `.` stay, a
 * space becomes `_`, every other UTF-16 code unit becomes its UTF-8 bytes as `.XX` (a lone
 * surrogate encodes as `?`, `.3F`), and an `a` goes first when the id does not start with an
 * ASCII letter or `_`. `src/it/sample-site/verify.bsh` checks Doxia's output for one link.
 *
 * @param id - Heading id.
 * @returns The Doxia link form, or null when the id is ASCII-only and needs no alias.
 */
function doxiaLinkId(id: string): string | null {
  if (!/[\u0080-\uffff]/.test(id)) {
    return null;
  }
  const encoder = new TextEncoder();
  let encoded = /^[A-Za-z_]/.test(id) ? '' : 'a';
  for (let i = 0; i < id.length; i++) {
    const unit = id.charAt(i);
    if (unit === ' ') {
      encoded += '_';
    } else if (/[A-Za-z0-9._-]/.test(unit)) {
      encoded += unit;
    } else {
      // Java encodes a lone surrogate as "?"; TextEncoder would give U+FFFD instead
      const isSurrogate = unit.charCodeAt(0) >= 0xd800 && unit.charCodeAt(0) <= 0xdfff;
      encoder.encode(isSurrogate ? '?' : unit).forEach((byte) => {
        encoded += `.${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      });
    }
  }
  return encoded;
}

/**
 * Finds the language of a heading's text, so its TOC entry can declare the same language
 * (WCAG 2.2 SC 3.1.2): the `lang` of the innermost element that holds all of the text, such as
 * `<h2><span lang="ja">概要</span></h2>`, or else the language the heading inherits.
 *
 * @param heading - Heading in the article.
 * @param textOnly - Copy of the heading without its permalink.
 * @returns The language tag, or `''` when no language is declared.
 */
function headingTextLanguage(heading: HTMLElement, textOnly: HTMLElement): string {
  const text = textOnly.textContent?.trim();
  const wrappers = Array.from(textOnly.querySelectorAll('[lang]')).filter(
    (el) => el.textContent?.trim() === text
  );
  const source = wrappers.length > 0 ? wrappers[wrappers.length - 1] : heading.closest('[lang]');
  return source?.getAttribute('lang') ?? '';
}

/**
 * Percent-decodes a URL fragment. Browsers report `location.hash` and `<a>.hash`
 * percent-encoded (`#%C3%BCberblick` for `#überblick`), while heading ids hold the decoded text.
 *
 * @param hash - Fragment with or without its leading `#`.
 * @returns The decoded fragment, or the fragment as written when it is not valid
 *     percent-encoding (a stray `%`).
 */
export function decodeFragment(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Finds the element a URL fragment names. Like the browser, it tries the fragment as written,
 * then percent-decoded, and finally in NFC, the form `slugifyHeading()` produces, so a page
 * opened with a hand-typed decomposed `#u%CC%88berblick` still scrolls to the `überblick`
 * heading. Only the load-time scroll uses it; a decomposed fragment followed on an open page
 * is left to the browser, which does not normalize it.
 *
 * @param hash - Fragment with or without its leading `#`.
 * @returns The named element, or null.
 */
function findFragmentTarget(hash: string): HTMLElement | null {
  const decoded = decodeFragment(hash);
  const candidates = [hash.replace(/^#/, ''), decoded, decoded.normalize('NFC')];
  for (const id of candidates) {
    const target = id ? document.getElementById(id) : null;
    if (target) {
      return target;
    }
  }
  return null;
}

/**
 * Measures the pinned `.supa-content-header` when `<stickyContentHeader>` is
 * enabled, so ScrollSpy and the active-heading threshold do not treat headings
 * hidden beneath the bar as visible. Returns 0 when the option is off or the
 * header is not currently `position: sticky` (below `lg`).
 *
 * @param doc - Document to inspect.
 * @returns Pixel height of the sticky content header, or 0.
 */
export function getStickyContentHeaderOffset(doc: Document = document): number {
  if (!doc.body?.classList.contains('supa-sticky-content-header')) {
    return 0;
  }
  const header = doc.querySelector<HTMLElement>('.supa-content-header');
  if (!header) {
    return 0;
  }
  const view = doc.defaultView;
  if (view && view.getComputedStyle(header).position !== 'sticky') {
    return 0;
  }
  return Math.ceil(header.getBoundingClientRect().height);
}

/**
 * Ensures every heading in the article has a deterministic clean slug `id`
 * (e.g. `#1-actions-buttons`) while preserving any preceding Doxia `<a id="...">`
 * anchor for backward compatibility, and attaches the optional Furo `#` permalink.
 *
 * @param article - Root article container (`#supa-main-content`).
 * @param enablePermalinks - Whether to append `.supa-headerlink` permalink anchors.
 * @param permalinkSymbol - Symbol text displayed inside each permalink anchor.
 * @returns Array of processed prose heading elements.
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
      clone.querySelectorAll('.supa-headerlink').forEach((el) => el.remove());
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

    // Doxia rewrites a Markdown link to #überblick as #a.C3.BCberblick, so give the heading an
    // empty anchor with that id, as Doxia does for its own anchors. It holds `.XX` escapes, so
    // it can never take a slug from a later heading. It can coincide with Doxia's own anchor for
    // a later heading whose text is this slug (`## Überblick` then `## überblick`); that anchor
    // already exists, so the alias is skipped and such links reach the later heading.
    const linkId = doxiaLinkId(id);
    if (linkId && !document.getElementById(linkId)) {
      const linkAnchor = document.createElement('a');
      linkAnchor.id = linkId;
      heading.parentNode?.insertBefore(linkAnchor, prevAnchor ?? heading);
    }

    if (enablePermalinks && heading.tagName !== 'H1' && !heading.querySelector('.supa-headerlink')) {
      const anchor = document.createElement('a');
      anchor.className = 'supa-headerlink';
      anchor.href = `#${id}`;
      anchor.setAttribute('aria-label', `Permalink to ${heading.textContent?.trim() || 'heading'}`);
      setTooltipTitle(anchor, 'Copy permalink to this heading', 'top');
      anchor.textContent = permalinkSymbol;

      anchor.addEventListener('click', async () => {
        try {
          if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
            const url = new URL(window.location.href);
            // The URL setter percent-encodes the fragment (#%C3%BCberblick), as the browser
            // does when copying from its own address bar. Chat, mail, and Markdown linkifiers
            // can end a URL at its first non-ASCII character, and browsers decode the fragment
            // again when they look for the target.
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
 * Builds the right-hand "On this page" table of contents (`#supaTocNav`) and
 * maintains a single active section indicator synced with both the right TOC
 * and any hash sub-links in the left navigation sidebar.
 *
 * @param article - Root article container (`#supa-main-content`).
 * @param tocNav - Target `<nav id="supaTocNav">` element.
 * @param maxDepth - Maximum heading depth (`2`–`6`) to include in the TOC.
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
  const tocColumn = tocNav.closest<HTMLElement>('.supa-toc-column');
  const tocScroll = tocNav.closest<HTMLElement>('.supa-toc-scroll');
  const tocTriggers = document.querySelectorAll<HTMLElement>('.supa-toc-drawer-trigger');

  if (headings.length === 0) {
    tocColumn?.classList.add('is-empty');
    tocTriggers.forEach((btn) => btn.classList.add('d-none'));
    return;
  }

  tocColumn?.classList.remove('is-empty');

  const tocLinksById = new Map<string, HTMLAnchorElement>();
  const aliasToHeadingId = new Map<string, string>();
  const tocLanguage = tocNav.closest('[lang]')?.getAttribute('lang') ?? '';

  headings.forEach((heading, idx) => {
    const level = Number.parseInt(heading.tagName.slice(1), 10);
    const clone = heading.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.supa-headerlink').forEach((el) => el.remove());
    const text = clone.textContent?.trim() || heading.id;

    const link = document.createElement('a');
    link.className = `nav-link supa-toc-level-${level}${idx === 0 ? ' active' : ''}`;
    link.href = `#${heading.id}`;
    link.textContent = text;
    const language = headingTextLanguage(heading, clone);
    if (language !== tocLanguage) {
      link.lang = language;
    }
    tocNav.appendChild(link);
    tocLinksById.set(heading.id, link);
    aliasToHeadingId.set(heading.id, heading.id);

    const doxiaId = heading.getAttribute('data-doxia-id');
    if (doxiaId) {
      aliasToHeadingId.set(doxiaId, heading.id);
    }
    const linkId = doxiaLinkId(heading.id);
    if (linkId) {
      aliasToHeadingId.set(linkId, heading.id);
    }
  });

  // Collect hash sub-links in the left sidebar that point to sections on the current page
  const currentPageName =
    typeof window !== 'undefined'
      ? window.location.pathname.split('/').pop() || 'index.html'
      : '';
  const sidebarHashLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.supa-sidebar-tree a.supa-nav-link[href*="#"]')
  ).filter((link) => {
    const href = link.getAttribute('href') || '';
    const hashIdx = href.indexOf('#');
    if (hashIdx < 0) {
      return false;
    }
    const pagePart = href.slice(0, hashIdx).split('/').pop() || '';
    const hashPart = decodeFragment(href.slice(hashIdx + 1));
    if (!pagePart) {
      return true;
    }
    if (currentPageName && pagePart === currentPageName) {
      return true;
    }
    return aliasToHeadingId.has(hashPart);
  });

  const sidebarTargetHeadingIds = new Set<string>();
  sidebarHashLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const hashIdx = href.indexOf('#');
    if (hashIdx >= 0) {
      const hashId = decodeFragment(href.slice(hashIdx + 1));
      const canonical = aliasToHeadingId.get(hashId);
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
        const hashId = decodeFragment(href.slice(hashIdx + 1));
        const canonical = aliasToHeadingId.get(hashId) || hashId;
        link.classList.toggle('active', canonical === sidebarActiveId);
      }
    });

    // Keep the active TOC link visible inside the sticky .supa-toc-scroll container
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
      target: '#supaTocNav',
      rootMargin: `-${getStickyContentHeaderOffset()}px 0px -70%`,
      smoothScroll: true
    });
  } catch {
    // Fallback if ScrollSpy cannot initialize in synthetic DOM environments
  }

  // Enforce single active heading (accounts for heading scroll-margin-top ~144px)
  const syncActiveOnScroll = () => {
    const threshold = Math.max(160, getStickyContentHeaderOffset() + 96);
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
      const hashId = decodeFragment(window.location.hash);
      const canonical = aliasToHeadingId.get(hashId) || hashId;
      if (canonical && tocLinksById.has(canonical)) {
        setActiveHeading(canonical);
      }
    });
    syncActiveOnScroll();
  }
}

/**
 * Prepares article headings, handles initial hash scrolling, and builds the sticky ScrollSpy TOC.
 */
export function initTocAndScrollSpy(): void {
  const article = document.getElementById('supa-main-content');
  if (!article) {
    return;
  }

  const body = document.body;
  // site.vm emits <headingPermalinks> as data-supa-permalinks (released 0.1.x HTML carries
  // that name), so read it rather than renaming the template attribute.
  const enablePermalinks = body.getAttribute('data-supa-permalinks') !== 'false';
  const permalinkSymbol = body.getAttribute('data-supa-permalink-symbol') || '#';
  const tocMaxDepth = Number.parseInt(body.getAttribute('data-supa-toc-max-depth') || '4', 10);

  prepareHeadings(article, enablePermalinks, permalinkSymbol);

  // If the page loaded with a #hash pointing to a slugified heading id that was assigned
  // dynamically by prepareHeadings(), scroll to it before building the TOC so initial
  // active state reflects the scrolled position.
  if (typeof window !== 'undefined' && window.location.hash.length > 1) {
    const targetEl = findFragmentTarget(window.location.hash);
    if (targetEl && window.scrollY === 0) {
      targetEl.scrollIntoView();
    }
  }

  const tocNav = document.getElementById('supaTocNav');
  buildTableOfContents(article, tocNav, Number.isNaN(tocMaxDepth) ? 4 : tocMaxDepth);
}
