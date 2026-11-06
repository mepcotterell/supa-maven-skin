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
 * Returns the id Doxia writes into a Markdown link to a heading id. Doxia 2's `Xhtml5BaseParser`
 * passes the fragment of every relative link that fails `DoxiaUtils.isValidId` through
 * `DoxiaUtils.encodeId`, so `[Überblick](#überblick)` reaches the page as `#a.C3.BCberblick` and
 * `[1. Install](#1-install)` as `#a1-install`. This ports both methods of Doxia 2.2.0. A valid id
 * is an ASCII letter or `_` followed by ASCII letters, digits, `_`, `-`, and `.`, so every id with
 * a non-ASCII character is invalid, and so is every slug that starts with a digit. `encodeId`
 * keeps those characters, writes a space as `_` and every other UTF-16 code unit as its UTF-8
 * bytes in `.XX` form (a lone surrogate encodes as `?`, `.3F`), and puts an `a` first when the id
 * does not start with an ASCII letter or `_`. It also trims the id, which heading ids never need.
 * `src/it/sample-site/verify.bsh` checks Doxia's output for a non-ASCII and a digit-first link.
 *
 * @param id - Heading id.
 * @returns The Doxia link form, or null when Doxia leaves a link to the id as written.
 */
export function doxiaLinkId(id: string): string | null {
  if (/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(id)) {
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
 * Finds the language of a heading's text, so its TOC entry and search results can declare the
 * same language (WCAG 2.2 SC 3.1.2): the `lang` of the innermost element that holds all of the
 * text, such as `<h2><span lang="ja">概要</span></h2>`, or else the language the heading inherits.
 *
 * @param heading - Heading in the article.
 * @param textOnly - Copy of the heading without its permalink.
 * @returns The language tag, or `''` when no language is declared.
 */
export function headingTextLanguage(heading: HTMLElement, textOnly: HTMLElement): string {
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
 * Reader input after which the skin does not scroll to the URL's heading again: the reader owns
 * the scroll position from then on. Scroll events cannot tell the reader's scrolling from the
 * skin's own scroll to the heading or from the browser's scroll anchoring, so the input that
 * scrolls the page, moves focus, or follows a link is watched instead: the wheel, a touch, a
 * pointer press (which starts every click), and a key.
 */
const READER_INPUT_EVENTS: readonly string[] = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

/**
 * Starts listening for `READER_INPUT_EVENTS` on the window, in the capture phase so a handler that
 * stops propagation cannot hide them.
 *
 * @returns Function that stops listening and reports whether any such input arrived.
 */
function watchReaderInput(): () => boolean {
  let seen = false;
  const onInput = (): void => {
    seen = true;
  };
  READER_INPUT_EVENTS.forEach((type) => {
    window.addEventListener(type, onInput, { capture: true, passive: true });
  });
  return () => {
    READER_INPUT_EVENTS.forEach((type) => {
      window.removeEventListener(type, onInput, true);
    });
    return seen;
  };
}

/**
 * Waits until the content above a heading has stopped reshaping. `data-supa-ready` can come before
 * the load event, and what still arrives then moves the content: a late stylesheet (KaTeX's moved
 * the kitchen sink's lower headings 63px) and images without dimensions, which grow when they
 * load. Both hold the load event. Fonts that only such a stylesheet uses start loading when text
 * is laid out in them, so the page is laid out before `document.fonts.ready` is read.
 *
 * @returns Promise that resolves once the page has loaded and its fonts are in.
 */
async function layoutSettled(): Promise<void> {
  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      window.addEventListener('load', () => resolve(), { once: true });
    });
  }
  if ('fonts' in document) {
    document.body.getBoundingClientRect();
    await document.fonts.ready;
  }
}

/**
 * Tells whether the browser will put the page back where the reader left it: on a reload, or on a
 * Back or Forward to a page not kept in the back/forward cache. The browser restores the position
 * as the page loads, after the skin's scripts have run on a page still at the top, so the skin
 * cannot see it coming from `scrollY`. A site that sets `history.scrollRestoration` to `'manual'`
 * has turned that restoring off.
 *
 * @returns Whether this navigation restores a scroll position.
 */
function browserRestoresScroll(): boolean {
  if (typeof history !== 'undefined' && history.scrollRestoration === 'manual') {
    return false;
  }
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return false;
  }
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return navigation?.type === 'reload' || navigation?.type === 'back_forward';
}

/**
 * Scrolls to the element the URL's fragment names when the page opens, and returns a second scroll
 * to it. Doxia 2 writes no `id` on headings, so the browser cannot find the heading a link names
 * until `prepareHeadings()` gives it one, and this scroll stands in for the browser's. The content
 * above the heading reshapes after it, as code is highlighted, widget chunks, Mermaid, and KaTeX
 * load, and late images and fonts arrive, which left headings far down the kitchen sink hundreds
 * of pixels short. The returned function scrolls to the element again once that is over, unless the
 * reader has scrolled, clicked, touched, or pressed a key since the page opened, or the fragment
 * no longer names an element. Neither scroll runs when the browser restores the reader's place, on
 * a reload or a Back or Forward. Both are smooth only where the stylesheet makes them so.
 *
 * @returns Function that scrolls to the fragment's element again once the page has loaded and its
 *     fonts are in, and resolves when it has done so or skipped it.
 */
function landOnFragment(): () => Promise<void> {
  const skip = (): Promise<void> => Promise.resolve();
  if (typeof window === 'undefined' || window.location.hash.length <= 1) {
    return skip;
  }
  // On a reload or a Back without the back/forward cache, the browser puts the reader back where
  // they were. Scrolling to the heading would fight that, and the second scroll would win it.
  if (browserRestoresScroll()) {
    return skip;
  }
  const target = findFragmentTarget(window.location.hash);
  // A page no longer at the top was scrolled before this ran: by the reader, or by the browser, to
  // an element the HTML itself names or back to the reader's place before a reload.
  if (!target || window.scrollY !== 0) {
    return skip;
  }
  target.scrollIntoView();
  const readerMoved = watchReaderInput();
  return async () => {
    await layoutSettled();
    if (readerMoved()) {
      return;
    }
    findFragmentTarget(window.location.hash)?.scrollIntoView();
  };
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
 * Lists the headings of an article that get an id and a permalink: every `h1`–`h6` outside
 * `.not-prose` components, in document order.
 *
 * @param article - Root article container (`#supa-main-content`).
 * @returns The prose headings.
 */
export function findProseHeadings(article: ParentNode): HTMLHeadingElement[] {
  return Array.from(
    article.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')
  ).filter((h) => !h.closest('.not-prose'));
}

/**
 * Finds the empty `<a id="...">` or `<a name="...">` anchor that Doxia writes for a heading:
 * inside the heading, which `prepareHeadings()` then moves before it, or right before it.
 *
 * @param heading - Heading in the article.
 * @returns The anchor, or null.
 */
function findDoxiaAnchor(heading: HTMLElement): HTMLAnchorElement | null {
  const inner = heading.querySelector<HTMLAnchorElement>('a[id], a[name]');
  if (inner && !inner.textContent?.trim()) {
    return inner;
  }
  const prev = heading.previousElementSibling;
  return prev && prev.tagName === 'A' && !prev.textContent?.trim()
    ? (prev as HTMLAnchorElement)
    : null;
}

/**
 * Slugs a heading's text, leaving out its permalink.
 *
 * @param heading - Heading in the article.
 * @returns The slug (`slugifyHeading()`).
 */
function headingSlug(heading: HTMLElement): string {
  const clone = heading.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.supa-headerlink').forEach((el) => el.remove());
  return slugifyHeading(clone.textContent || 'section');
}

/**
 * Computes the id `prepareHeadings()` gives each heading. The search crawler computes the ids of
 * the pages it fetches with it too, so that a result links to the id the page later gives itself.
 * A heading keeps an id it already has. Any other heading gets its slug, or the slug numbered
 * `-2`, `-3`, ... when an earlier heading of any level took it or another element of the
 * document holds it: a Doxia anchor, an id the author wrote, the skin's own markup, or the anchor
 * `prepareHeadings()` adds for Doxia's link form of an earlier heading's id. A Doxia anchor that
 * holds exactly its own heading's slug gives the slug up first.
 *
 * @param headings - The prose headings of one document, in document order
 *     (`findProseHeadings()`).
 * @param takenIds - Ids of that document's elements before any heading gets one, repeats
 *     included.
 * @returns The id of each heading, in the order of `headings`.
 */
export function assignHeadingIds(
  headings: readonly HTMLElement[],
  takenIds: Iterable<string>
): string[] {
  // How many elements hold each id: an id can repeat, and getElementById() still finds it after
  // one of them gives it up
  const holders = new Map<string, number>();
  for (const id of takenIds) {
    holders.set(id, (holders.get(id) ?? 0) + 1);
  }
  const used = new Set<string>();
  return headings.map((heading) => {
    let id = heading.id.trim();
    if (!id) {
      const slug = headingSlug(heading);
      // prepareHeadings() removes the id of a Doxia anchor that holds its heading's slug
      if (findDoxiaAnchor(heading)?.id === slug) {
        holders.set(slug, (holders.get(slug) ?? 0) - 1);
      }
      id = slug;
      for (let counter = 2; used.has(id) || (holders.get(id) ?? 0) > 0; counter++) {
        id = `${slug}-${counter}`;
      }
    }
    // No room is kept for the heading's Doxia link anchor (doxiaLinkId()): prepareHeadings()
    // adds those only after every heading has its id, so a later "A1 Install" keeps a1-install.
    used.add(id);
    return id;
  });
}

/**
 * Ensures every heading in the article has a deterministic clean slug `id`
 * (e.g. `#1-actions-buttons`) while preserving any preceding Doxia `<a id="...">`
 * anchor for backward compatibility, attaches the optional Furo `#` permalink, and adds an
 * anchor for the id Doxia writes into Markdown links to the heading (`doxiaLinkId()`),
 * recording that anchor's id on the heading as `data-doxia-link-id`.
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
  const allHeadings = findProseHeadings(article);
  const ids = assignHeadingIds(
    allHeadings,
    Array.from(article.ownerDocument.querySelectorAll('[id]'), (el) => el.id)
  );
  // Where each heading's Doxia link anchor goes: before Doxia's own anchor, or the heading
  const linkAnchorPlaces = new Map<HTMLHeadingElement, Element>();

  allHeadings.forEach((heading, index) => {
    const id = ids[index];
    const hadId = heading.id.trim() !== '';

    // Doxia's empty anchor stays in place, or moves out of the heading to just before it
    const prevAnchor = findDoxiaAnchor(heading);
    if (prevAnchor && heading.contains(prevAnchor)) {
      heading.parentNode?.insertBefore(prevAnchor, heading);
    }
    const doxiaId = prevAnchor ? prevAnchor.id || prevAnchor.getAttribute('name') || '' : '';
    if (doxiaId) {
      heading.setAttribute('data-doxia-id', doxiaId);
    }

    // If the Doxia anchor already uses the exact same lowercase slug, remove its id so the
    // heading itself owns that id without DOM duplication (assignHeadingIds() counts on it)
    if (!hadId && prevAnchor && prevAnchor.id === headingSlug(heading)) {
      prevAnchor.removeAttribute('id');
    }

    heading.id = id;
    linkAnchorPlaces.set(heading, prevAnchor ?? heading);

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

  // Doxia rewrites a Markdown link to #1-install as #a1-install and one to #überblick as
  // #a.C3.BCberblick, so give each such heading an empty anchor with that id, as Doxia does for
  // its own anchors. The anchors go in only once every heading has its id: a1-install is also the
  // slug of a heading "A1 Install", which must keep it rather than move to a1-install-2. An id
  // that an element already has (a heading, Doxia's own anchor, or an author's id) is skipped, so
  // such a link reaches that element: "A1 Install", or the later heading in `## Überblick` then
  // `## überblick`, whose Doxia anchor is a.C3.BCberblick.
  linkAnchorPlaces.forEach((place, heading) => {
    const linkId = doxiaLinkId(heading.id);
    if (linkId && !document.getElementById(linkId)) {
      const linkAnchor = document.createElement('a');
      linkAnchor.id = linkId;
      heading.parentNode?.insertBefore(linkAnchor, place);
      // buildTableOfContents() maps only the anchors that went in to their heading
      heading.setAttribute('data-doxia-link-id', linkId);
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
  });
  // Only the Doxia link anchors prepareHeadings() inserted are mapped to their heading. It skips
  // one whose id any element already has, including an h1 or a heading deeper than the TOC that
  // this list never sees, so a link to that id marks the element the browser scrolls to.
  headings.forEach((heading) => {
    const linkId = heading.getAttribute('data-doxia-link-id');
    if (linkId && !aliasToHeadingId.has(linkId)) {
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
      // On each TOC click, Bootstrap 6 asks matchMedia whether the reader prefers reduced motion,
      // and if so scrolls with `behavior: 'auto'`, which leaves it to <html>'s `scroll-behavior`.
      // That is smooth only under `prefers-reduced-motion: no-preference` (_layout.scss).
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
 * Prepares article headings, scrolls to the URL's heading, and builds the sticky ScrollSpy TOC.
 *
 * @returns Function that scrolls to the URL's heading again once the page has settled (see
 *     `landOnFragment()`); `initSupaSkin()` calls it once the skin is ready.
 */
export function initTocAndScrollSpy(): () => Promise<void> {
  const article = document.getElementById('supa-main-content');
  if (!article) {
    return () => Promise.resolve();
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
  const landAgain = landOnFragment();

  const tocNav = document.getElementById('supaTocNav');
  buildTableOfContents(article, tocNav, Number.isNaN(tocMaxDepth) ? 4 : tocMaxDepth);
  return landAgain;
}
