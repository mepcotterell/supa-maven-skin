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
  Menu,
  NavOverflow,
  OtpInput,
  Popover,
  Range,
  ScrollSpy,
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

function initDrawerLinkAutoClose(): void {
  const tocDrawer = document.getElementById('furoTocDrawer') as HTMLDialogElement | null;
  if (tocDrawer) {
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
}

export function initBackToTop(): void {
  if (typeof document === 'undefined' || document.querySelector('.furo-back-to-top')) {
    return;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'furo-back-to-top not-prose';
  btn.setAttribute('aria-label', 'Back to top');
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
  initBootstrapComponents();
  initTocAndScrollSpy();
  initCodeBlocks();
  initSearch();
  initDrawerLinkAutoClose();
  initBackToTop();
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
  Menu,
  NavOverflow,
  OtpInput,
  Popover,
  Range,
  ScrollSpy,
  Strength,
  Tab,
  Toast,
  Toggler,
  Tooltip
};
