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
import { initDoxiaEnhancements, initScrollRegions } from './doxia';
import { initOptionalLibraries } from './optional';
import { initSearch } from './search';
import { initTheme } from './theme';
import { initTocAndScrollSpy } from './toc';

/**
 * Initializes the responsive left sidebar (`#supaSidebarDrawer`) and right TOC
 * (`#supaTocDrawer`) Bootstrap 6 `<dialog>` drawers and binds auto-close behavior.
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
    tocDrawer.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement | null)?.closest('a.nav-link');
      if (link && window.innerWidth < 1280 && tocDrawer.open) {
        try {
          Drawer.getOrCreateInstance(tocDrawer).hide();
        } catch {
          tocDrawer.close?.();
        }
      }
    });
  }

  if (sidebarDrawer && !sidebarDrawer.hasAttribute('data-supa-drawer-bound')) {
    sidebarDrawer.setAttribute('data-supa-drawer-bound', 'true');
    sidebarDrawer.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement | null)?.closest('a.supa-nav-link[href*="#"]');
      if (link && window.innerWidth < 1024 && sidebarDrawer.open) {
        try {
          Drawer.getOrCreateInstance(sidebarDrawer).hide();
        } catch {
          sidebarDrawer.close?.();
        }
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
 * Creates and mounts the floating "Back to top" button and binds scroll visibility.
 */
export function initBackToTop(): void {
  if (typeof document === 'undefined' || document.querySelector('.supa-back-to-top')) {
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'supa-back-to-top not-prose';
  btn.setAttribute('aria-label', 'Back to top');
  setTooltipTitle(btn, 'Scroll back to top', 'top');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg><span>Back to top</span>';

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
 * Boots all Supa Maven Skin frontend modules in deterministic order.
 *
 * @returns Promise that resolves once optional libraries and lazily loaded
 *     widgets have settled and `data-supa-ready` has been set on `<html>`.
 */
export function initSupaSkin(): Promise<void> {
  initTheme();
  initDoxiaEnhancements();
  initTocAndScrollSpy();
  initCodeBlocks();
  initSearch();
  initDrawers();
  initBackToTop();
  const widgetsSettled = initBootstrapComponents(document);
  // After code blocks and tables exist so every scroll wrapper is seen. The lazily loaded
  // playground fills its code block later; the regions' ResizeObserver re-checks it then.
  initScrollRegions(document);
  // `allSettled` so a failed CDN import or widget chunk still marks the page ready, and only
  // once every widget on the page has initialized.
  return Promise.allSettled([initOptionalLibraries(), widgetsSettled]).then(() => {
    document.documentElement.setAttribute(SUPA_READY_ATTRIBUTE, 'true');
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
