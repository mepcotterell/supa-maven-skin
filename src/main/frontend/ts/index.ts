import '../scss/main.scss';

import {
  Alert,
  BootstrapPlugins,
  Button,
  Carousel,
  Chips,
  Collapse,
  Combobox,
  Datepicker,
  Dialog,
  Drawer,
  initBootstrapComponents,
  initTooltips,
  Menu,
  NavOverflow,
  OtpInput,
  Popover,
  Range,
  ScrollSpy,
  setTooltipTitle,
  Strength,
  Tab,
  Toast,
  Toggler,
  Tooltip
} from './bootstrap-components';
import { initCodeBlocks } from './code';
import { initDoxiaEnhancements } from './doxia';
import { initOptionalLibraries } from './optional';
import { initSearch } from './search';
import { initTheme } from './theme';
import { initTocAndScrollSpy } from './toc';

export function initDrawers(): void {
  const sidebarDrawer = document.getElementById('furoSidebarDrawer') as HTMLDialogElement | null;
  const tocDrawer = document.getElementById('furoTocDrawer') as HTMLDialogElement | null;

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

  if (tocDrawer && !tocDrawer.hasAttribute('data-furo-drawer-bound')) {
    tocDrawer.setAttribute('data-furo-drawer-bound', 'true');
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

  if (sidebarDrawer && !sidebarDrawer.hasAttribute('data-furo-drawer-bound')) {
    sidebarDrawer.setAttribute('data-furo-drawer-bound', 'true');
    sidebarDrawer.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement | null)?.closest('a.furo-nav-link[href*="#"]');
      if (link && window.innerWidth < 1024 && sidebarDrawer.open) {
        try {
          Drawer.getOrCreateInstance(sidebarDrawer).hide();
        } catch {
          sidebarDrawer.close?.();
        }
      }
    });
  }

  if (typeof document !== 'undefined' && !document.documentElement.hasAttribute('data-furo-drawer-sync')) {
    document.documentElement.setAttribute('data-furo-drawer-sync', 'true');
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

export function initBackToTop(): void {
  if (typeof document === 'undefined' || document.querySelector('.furo-back-to-top')) {
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'furo-back-to-top not-prose';
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

export function initFuroSkin(): void {
  initTheme();
  initDoxiaEnhancements();
  initTocAndScrollSpy();
  initCodeBlocks();
  initSearch();
  initDrawers();
  initBackToTop();
  initBootstrapComponents(document);
  void initOptionalLibraries();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFuroSkin());
  } else {
    initFuroSkin();
  }
}

export {
  Alert,
  BootstrapPlugins,
  Button,
  Carousel,
  Chips,
  Collapse,
  Combobox,
  Datepicker,
  Dialog,
  Drawer,
  initTooltips,
  Menu,
  NavOverflow,
  OtpInput,
  Popover,
  Range,
  ScrollSpy,
  setTooltipTitle,
  Strength,
  Tab,
  Toast,
  Toggler,
  Tooltip
};
