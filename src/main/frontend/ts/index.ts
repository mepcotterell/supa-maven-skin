/**
 * @fileoverview Main frontend entrypoint for Supa Maven Skin.
 * Coordinates theme initialization, Doxia DOM normalization, sticky ScrollSpy TOC,
 * syntax highlighting, client-side search, responsive drawers, and Bootstrap 6 components.
 */
import '../scss/main.scss';

import {
  Alert,
  BootstrapPlugins,
  Button,
  Collapse,
  Dialog,
  Drawer,
  initBootstrapComponents,
  initTooltips,
  Menu,
  Popover,
  ScrollSpy,
  setTooltipTitle,
  Toast,
  Toggler,
  Tooltip
} from './bootstrap-components';
import { initCodeBlocks } from './code';
import { initDoxiaEnhancements, initScrollRegions, restoreDocumentationChannels } from './doxia';
import { getLabel, warnUnknownLabels } from './labels';
import { initOptionalLibraries } from './optional';
import { initSearch } from './search';
import { initTheme } from './theme';
import { findFragmentTarget, initTocAndScrollSpy } from './toc';

/**
 * Viewport width, in em, from which the sidebar is inline rather than a drawer: `$lg` in
 * `_breakpoints.scss`, where `_layout.scss` lays `#supaSidebarDrawer` out inline.
 */
export const SIDEBAR_INLINE_EM = 64;

/**
 * Viewport width, in em, from which the TOC is inline rather than a drawer: `$xl` in
 * `_breakpoints.scss`, where `_layout.scss` lays `#supaTocDrawer` out inline.
 */
export const TOC_INLINE_EM = 80;

/**
 * Tells whether a drawer's column is laid out inline, asking the stylesheet's own em media query.
 * In a media query, 1em is the browser's default font size, so a px width compared with
 * `innerWidth` would disagree with the stylesheet once a reader raises it: at a 32 px default, a
 * 1280 px window is 40em wide, and the stylesheet shows both columns as drawers.
 *
 * @param minEm - `SIDEBAR_INLINE_EM` or `TOC_INLINE_EM`.
 * @returns Whether the viewport is at least `minEm` wide; without `matchMedia`, at the 16 px
 *     default font.
 */
function isInline(minEm: number): boolean {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(`(width >= ${minEm}em)`).matches;
  }
  return window.innerWidth >= minEm * 16;
}

/**
 * Role a drawer `<dialog>` has while it is laid out inline, where its column's `<aside>` is the
 * landmark. With its own `dialog` role, screen readers announced a dialog that never opened.
 * `group` is the most neutral role that Chromium and Firefox both honor on a `<dialog>`: they
 * ignore `none` and `presentation` there, and axe rejects `generic`.
 */
const INLINE_DRAWER_ROLE = 'group';

/**
 * Keeps a drawer's role in step with its layout. `site.vm` renders it with `INLINE_DRAWER_ROLE`;
 * below its breakpoint, and while it is open, it has no role of its own, so it opens as the modal
 * dialog it is. It is synced now, when the viewport crosses the breakpoint, and when it closes,
 * since Bootstrap closes an open drawer whose column has become inline.
 *
 * @param drawer - `#supaSidebarDrawer` or `#supaTocDrawer`.
 * @param minEm - `SIDEBAR_INLINE_EM` or `TOC_INLINE_EM`.
 */
function bindDrawerRole(drawer: HTMLDialogElement, minEm: number): void {
  /** Gives the drawer the role of its current layout. */
  const sync = (): void => {
    if (isInline(minEm) && !drawer.open) {
      drawer.setAttribute('role', INLINE_DRAWER_ROLE);
    } else {
      drawer.removeAttribute('role');
    }
  };
  sync();
  if (typeof window.matchMedia === 'function') {
    const query = window.matchMedia(`(width >= ${minEm}em)`);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', sync);
    }
  }
  drawer.addEventListener('close', sync);
}

/**
 * Finds the element a link leads to on the current page.
 *
 * @param link - Navigation link.
 * @returns The element its fragment names, or null for another page or a missing target.
 */
function samePageTarget(link: HTMLAnchorElement): HTMLElement | null {
  const url = new URL(link.href, window.location.href);
  const here = window.location;
  return url.origin === here.origin && url.pathname === here.pathname &&
    url.search === here.search ? findFragmentTarget(url.hash) : null;
}

/**
 * Makes a link's destination focusable as ScrollSpy does, keeping an author-supplied tabindex.
 *
 * @param target - Destination element, usually a heading.
 */
function makeFocusable(target: HTMLElement): void {
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }
}

/**
 * Moves keyboard focus to the section an inline sidebar link leads to on the same page, as the
 * drawers and the TOC do. The browser still follows the link (fragment, `:target`, history, and
 * scroll), but a heading cannot take focus, so it focuses the viewport instead, and focus fell to
 * `<body>`. Making the heading focusable
 * before the browser follows the link lets it focus the heading itself, and the timer covers an
 * engine that does not. A modified click, a link to another page or window, or a click another
 * handler cancels moves nothing.
 *
 * @param event - Click on the link, before the browser follows it.
 * @param link - Activated sidebar link.
 */
function focusInlineLinkTarget(event: MouseEvent, link: HTMLAnchorElement): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      (link.target !== '' && link.target !== '_self')) {
    return;
  }
  const target = samePageTarget(link);
  if (!target) {
    return;
  }
  makeFocusable(target);
  setTimeout(() => {
    const active = document.activeElement;
    // Only where the browser left focus; a reader who already moved on keeps their place.
    if (!event.defaultPrevented && target.isConnected &&
        (active === null || active === document.body || active === link)) {
      target.focus({ preventScroll: true });
    }
  }, 0);
}

/**
 * Closes a link's drawer and restores same-page destination focus after Bootstrap's opener focus.
 *
 * @param drawer - Open navigation drawer.
 * @param link - Activated section link.
 */
function closeDrawerForLink(drawer: HTMLDialogElement, link: HTMLAnchorElement): void {
  const target = samePageTarget(link);
  const focusTarget = (): void => {
    // Bootstrap's data API restores the opener during hidden.bs.drawer. A microtask runs after
    // every listener, regardless of registration order, without waiting for smooth scrollend.
    queueMicrotask(() => {
      if (target?.isConnected) {
        // Match ScrollSpy's focus behavior, preserving author-supplied tabindex and scroll position.
        makeFocusable(target);
        target.focus({ preventScroll: true });
      }
    });
  };
  if (target) {
    drawer.addEventListener('hidden.bs.drawer', focusTarget, { once: true });
  }
  /** Removes an abandoned destination listener after the hide attempt settles. */
  const clearPendingFocus = (): void => {
    // A declined or rejected hide must not affect a later Escape/backdrop dismissal.
    drawer.removeEventListener('hidden.bs.drawer', focusTarget);
  };
  try {
    void Drawer.getOrCreateInstance(drawer).hide().then(clearPendingFocus, clearPendingFocus);
  } catch {
    drawer.removeEventListener('hidden.bs.drawer', focusTarget);
    drawer.close?.();
    focusTarget();
  }
}

/**
 * Initializes the responsive left sidebar (`#supaSidebarDrawer`) and right TOC
 * (`#supaTocDrawer`) Bootstrap 6 `<dialog>` drawers, keeps their roles in step with their
 * layout, and binds auto-close behavior.
 */
export function initDrawers(): void {
  const sidebarDrawer = document.getElementById('supaSidebarDrawer') as HTMLDialogElement | null;
  const tocDrawer = document.getElementById('supaTocDrawer') as HTMLDialogElement | null;

  [sidebarDrawer, tocDrawer].forEach((drawerEl) => {
    if (!drawerEl) {
      return;
    }
    try {
      const existing = Drawer.getInstance(drawerEl);
      if (existing) {
        existing.dispose();
      }
      Drawer.getOrCreateInstance(drawerEl);
    } catch {
      // Ignore initialization errors in synthetic DOM environments
    }
  });

  if (tocDrawer && !tocDrawer.hasAttribute('data-supa-drawer-bound')) {
    tocDrawer.setAttribute('data-supa-drawer-bound', 'true');
    bindDrawerRole(tocDrawer, TOC_INLINE_EM);
    tocDrawer.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a.nav-link');
      if (link && !isInline(TOC_INLINE_EM) && tocDrawer.open) {
        closeDrawerForLink(tocDrawer, link);
      }
    });
  }

  if (sidebarDrawer && !sidebarDrawer.hasAttribute('data-supa-drawer-bound')) {
    sidebarDrawer.setAttribute('data-supa-drawer-bound', 'true');
    bindDrawerRole(sidebarDrawer, SIDEBAR_INLINE_EM);
    sidebarDrawer.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a.supa-nav-link[href*="#"]');
      if (!link) {
        return;
      }
      if (!isInline(SIDEBAR_INLINE_EM) && sidebarDrawer.open) {
        closeDrawerForLink(sidebarDrawer, link);
      } else {
        focusInlineLinkTarget(e, link);
      }
    });
  }

  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-supa-drawer-sync')) {
    document.documentElement.setAttribute('data-supa-drawer-sync', 'true');
    document.addEventListener('show.bs.drawer', (event) => {
      const target = event.target as HTMLDialogElement | null;
      if (!target) {
        return;
      }
      document
        .querySelectorAll<HTMLDialogElement>('dialog.drawer[open], dialog[open][class*=":drawer"]')
        .forEach((openDrawer) => {
          if (openDrawer !== target) {
            try {
              Drawer.getInstance(openDrawer)?.hide();
            } catch {
              openDrawer.close?.();
            }
          }
        });
    });
  }
}

/**
 * Picks the behavior of a scroll the skin starts in script: smooth only when the reader has not
 * asked to reduce motion. The preference is read as the scroll starts, so a change to it applies
 * without a reload. `'instant'` rather than `'auto'`, which would defer to a stylesheet that a
 * site's own CSS may set to smooth.
 *
 * @returns `'smooth'` under `prefers-reduced-motion: no-preference`, else `'instant'`.
 */
function motionScrollBehavior(): ScrollBehavior {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
    ? 'smooth'
    : 'instant';
}

/**
 * Creates and mounts the floating "Back to top" button and binds scroll visibility.
 */
export function initBackToTop(): void {
  if (typeof document === 'undefined' || document.querySelector('.supa-back-to-top')) {
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'supa-back-to-top not-prose';
  // One label for the visible text, the name, and the tooltip, set as text, never as HTML
  const label = getLabel('backToTop');
  btn.setAttribute('aria-label', label);
  setTooltipTitle(btn, label, 'top');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg><span></span>';
  const textEl = btn.querySelector('span');
  if (textEl) {
    textEl.textContent = label;
  }

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: motionScrollBehavior() });
  });

  document.body.appendChild(btn);

  const toggleVisibility = () => {
    const show = window.scrollY > 320;
    btn.classList.toggle('is-visible', show);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();
  }
}

/**
 * Attribute set on `<html>` once every enhancer (including the asynchronous
 * Mermaid/KaTeX loaders and the lazily loaded widget chunks) has settled.
 * Rendered-page checks such as `npm run test:a11y` wait for it so they never
 * scan a half-enhanced DOM.
 */
export const SUPA_READY_ATTRIBUTE = 'data-supa-ready';

/**
 * Runs one enhancer so that an error in it cannot stop the ones after it: the error is logged
 * with the enhancer's name and `fallback` stands in for its result. The boot would otherwise
 * stop at the first throw, leaving the page without copy buttons, search, or `data-supa-ready`.
 *
 * @param name - Name shown in the console message.
 * @param enhancer - Enhancer to run.
 * @param fallback - Result to use when the enhancer throws.
 * @returns What the enhancer returned, or `fallback` if it threw.
 */
function runEnhancer<T>(name: string, enhancer: () => T, fallback: T): T {
  try {
    return enhancer();
  } catch (error) {
    console.error(`Supa Maven Skin: ${name} failed`, error);
    return fallback;
  }
}

/**
 * Boots all Supa Maven Skin frontend modules in deterministic order. Each synchronous enhancer
 * runs on its own, so one that throws is logged and the others still run.
 *
 * @returns Promise that resolves once optional libraries and lazily loaded
 *     widgets have settled, `data-supa-ready` has been set on `<html>`, and the
 *     page has scrolled to its URL's heading again (or had no reason to).
 */
export function initSupaSkin(): Promise<void> {
  runEnhancer('warnUnknownLabels', warnUnknownLabels, undefined);
  runEnhancer('initTheme', initTheme, undefined);
  runEnhancer('initDoxiaEnhancements', () => initDoxiaEnhancements(), undefined);
  // Document-wide: a channels navigation may sit outside the article.
  runEnhancer('restoreDocumentationChannels', () => restoreDocumentationChannels(document), undefined);
  const landOnFragmentAgain = runEnhancer(
    'initTocAndScrollSpy',
    initTocAndScrollSpy,
    (): Promise<void> => Promise.resolve()
  );
  runEnhancer('initCodeBlocks', () => initCodeBlocks(), undefined);
  runEnhancer('initSearch', initSearch, undefined);
  runEnhancer('initDrawers', initDrawers, undefined);
  runEnhancer('initBackToTop', initBackToTop, undefined);
  const widgetsSettled = runEnhancer(
    'initBootstrapComponents',
    () => initBootstrapComponents(document),
    Promise.resolve()
  );
  // After code blocks and tables exist so every scroll wrapper is seen. The lazily loaded
  // playground fills its code block later; the regions' ResizeObserver re-checks it then.
  runEnhancer('initScrollRegions', () => initScrollRegions(document), undefined);
  // `allSettled` so a failed CDN import or widget chunk still marks the page ready, and only
  // once every widget on the page has initialized.
  return Promise.allSettled([
    runEnhancer('initOptionalLibraries', initOptionalLibraries, Promise.resolve()),
    widgetsSettled
  ]).then(() => {
    document.documentElement.setAttribute(SUPA_READY_ATTRIBUTE, 'true');
    // Highlighting, the widgets, Mermaid, and KaTeX have reshaped the article since the TOC
    // enhancer scrolled to the URL's heading, so scroll to it again once the page has settled.
    return landOnFragmentAgain();
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initSupaSkin();
    });
  } else {
    void initSupaSkin();
  }
}

export {
  Alert,
  BootstrapPlugins,
  Button,
  Collapse,
  Dialog,
  Drawer,
  initTooltips,
  Menu,
  Popover,
  ScrollSpy,
  setTooltipTitle,
  Toast,
  Toggler,
  Tooltip
};
