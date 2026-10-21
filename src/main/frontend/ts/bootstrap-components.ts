import Alert from 'bootstrap/js/dist/alert.js';
import Button from 'bootstrap/js/dist/button.js';
import Carousel from 'bootstrap/js/dist/carousel.js';
import Chips from 'bootstrap/js/dist/chips.js';
import Collapse from 'bootstrap/js/dist/collapse.js';
import Combobox from 'bootstrap/js/dist/combobox.js';
import Datepicker from 'bootstrap/js/dist/datepicker.js';
import Dialog from 'bootstrap/js/dist/dialog.js';
import Drawer from 'bootstrap/js/dist/drawer.js';
import Menu from 'bootstrap/js/dist/menu.js';
import NavOverflow from 'bootstrap/js/dist/nav-overflow.js';
import OtpInput from 'bootstrap/js/dist/otp-input.js';
import Popover from 'bootstrap/js/dist/popover.js';
import Range from 'bootstrap/js/dist/range.js';
import ScrollSpy from 'bootstrap/js/dist/scrollspy.js';
import Strength from 'bootstrap/js/dist/strength.js';
import Tab from 'bootstrap/js/dist/tab.js';
import Toast from 'bootstrap/js/dist/toast.js';
import Toggler from 'bootstrap/js/dist/toggler.js';
import Tooltip from 'bootstrap/js/dist/tooltip.js';

export const BootstrapPlugins = {
  Alert,
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

declare global {
  interface Window {
    bootstrap?: typeof BootstrapPlugins;
  }
}

/**
 * Top-level Bootstrap 6 component root selectors that should automatically be
 * isolated from `.prose` typography rules when placed inside `.furo-article`.
 */
const BOOTSTRAP_PROSE_ISOLATION_SELECTORS = [
  '.accordion',
  '.alert',
  '.avatar',
  '.avatar-stack',
  '.badge',
  '.breadcrumb',
  '.btn',
  '.btn-group',
  '.btn-group-vertical',
  '.btn-toolbar',
  '.callout',
  '.card',
  '.card-group',
  '.carousel',
  '.chip',
  '.chip-input',
  '.dialog',
  '.drawer',
  '.dropdown',
  '.form-check',
  '.form-floating',
  '.form-range',
  '.input-group',
  '.list-group',
  '.menu',
  '.nav',
  '.navbar',
  '.otp',
  '.pagination',
  '.progress',
  '.spinner-border',
  '.spinner-grow',
  '.stepper',
  '.strength',
  '.tab-content',
  '.toast',
  '.toast-container',
  '.tooltip'
].join(', ');

const NON_TOOLTIP_TAGS = new Set([
  'HTML',
  'HEAD',
  'TITLE',
  'META',
  'LINK',
  'STYLE',
  'SCRIPT',
  'NOSCRIPT',
  'IFRAME',
  'FRAME',
  'OBJECT',
  'EMBED'
]);

function isDoxiaShorthandTitleElement(el: HTMLElement): boolean {
  if (
    el.classList.contains('furo-tabs') ||
    el.classList.contains('furo-accordion') ||
    el.classList.contains('furo-stepper')
  ) {
    return true;
  }
  const parent = el.parentElement;
  if (
    parent &&
    (parent.classList.contains('furo-tabs') || parent.classList.contains('furo-accordion'))
  ) {
    return true;
  }
  return false;
}

function bindTooltipAutoHideOnInteract(el: HTMLElement): void {
  if (el.hasAttribute('data-furo-tooltip-bound')) {
    return;
  }
  el.setAttribute('data-furo-tooltip-bound', 'true');
  const hideTip = () => {
    try {
      Tooltip.getInstance(el)?.hide();
    } catch {
      // Ignore in synthetic DOMs
    }
  };
  el.addEventListener('click', hideTip);
  el.addEventListener('show.bs.menu', hideTip);
}

/**
 * Sets or updates a Bootstrap 6 Tooltip on an element while removing any native
 * `title` attribute so the browser never displays a built-in tooltip.
 */
export function setTooltipTitle(el: HTMLElement, title: string, placement?: string): void {
  const trimmed = title.trim();
  el.removeAttribute('title');
  if (!trimmed) {
    return;
  }

  if (!el.getAttribute('aria-label') && !el.textContent?.trim()) {
    el.setAttribute('aria-label', trimmed);
  }
  el.setAttribute('data-bs-title', trimmed);
  el.setAttribute('data-bs-original-title', trimmed);

  const toggleType = el.getAttribute('data-bs-toggle');
  const isOverlayTrigger =
    toggleType === 'menu' || toggleType === 'dialog' || toggleType === 'drawer';

  if (placement && !el.hasAttribute('data-bs-placement')) {
    el.setAttribute('data-bs-placement', placement);
  }
  if (!toggleType) {
    el.setAttribute('data-bs-toggle', 'tooltip');
  }

  bindTooltipAutoHideOnInteract(el);

  try {
    const existing = Tooltip.getInstance(el) as
      | (InstanceType<typeof Tooltip> & {
          setContent?: (content: Record<string, string>) => void;
          _config?: { title?: string };
        })
      | null;
    if (existing) {
      if (existing._config) {
        existing._config.title = trimmed;
      }
      if (typeof existing.setContent === 'function') {
        existing.setContent({ '.tooltip-inner': trimmed });
      }
    } else {
      const rawPlacement = el.getAttribute('data-bs-placement') || placement || 'top';
      const tooltipPlacement = isOverlayTrigger
        ? rawPlacement.startsWith('top')
          ? 'top'
          : 'bottom'
        : rawPlacement;
      Tooltip.getOrCreateInstance(el, {
        placement: tooltipPlacement,
        trigger: isOverlayTrigger ? 'hover' : 'hover focus'
      });
    }
  } catch {
    // Ignore initialization errors in headless test DOMs
  }
}

/**
 * Upgrades all `[data-bs-toggle="tooltip"]`, `[data-bs-title]`, and native `[title]`
 * elements within `root` to Bootstrap 6 `Tooltip` instances and strips native `title`
 * attributes so built-in browser tooltips are suppressed.
 */
export function initTooltips(root: ParentNode = document): void {
  const selector = [
    '[data-bs-toggle="tooltip"]',
    '[data-bs-title]:not([data-bs-toggle="popover"])',
    '[title]'
  ].join(', ');

  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }
    if (NON_TOOLTIP_TAGS.has(el.tagName)) {
      return;
    }
    if (el.getAttribute('data-bs-toggle') === 'popover') {
      if (el.hasAttribute('title')) {
        const popoverTitle = el.getAttribute('title')?.trim() ?? '';
        if (popoverTitle && !el.hasAttribute('data-bs-title')) {
          el.setAttribute('data-bs-title', popoverTitle);
        }
        el.removeAttribute('title');
      }
      return;
    }
    if (isDoxiaShorthandTitleElement(el)) {
      return;
    }

    const explicitTitle =
      el.getAttribute('data-bs-title')?.trim() ||
      el.getAttribute('title')?.trim() ||
      el.getAttribute('data-bs-original-title')?.trim() ||
      '';

    if (el.hasAttribute('title')) {
      el.removeAttribute('title');
    }

    if (!explicitTitle) {
      return;
    }

    setTooltipTitle(el, explicitTitle);
  });
}

/**
 * Automatically adds `.not-prose` to Bootstrap 6 component root containers inside
 * `.furo-article` so site authors don't have to manually wrap every component.
 */
export function isolateBootstrapComponentsFromProse(container: ParentNode = document): void {
  const elements = container.querySelectorAll<HTMLElement>(BOOTSTRAP_PROSE_ISOLATION_SELECTORS);
  elements.forEach((el) => {
    if (!el.classList.contains('not-prose')) {
      el.classList.add('not-prose');
    }
  });
}

/**
 * Attaches all 20 Bootstrap 6 JS plugins to `window.bootstrap` and auto-initializes
 * opt-in interactive widgets (`Tooltip`, `Popover`, `Toast`, `Combobox`, `Datepicker`,
 * `Chips`, `OtpInput`, `Range`, `Strength`, `NavOverflow`, `Carousel`).
 */
export function initBootstrapComponents(root: ParentNode = document): void {
  if (typeof window !== 'undefined') {
    window.bootstrap = BootstrapPlugins;
  }

  isolateBootstrapComponentsFromProse(root);

  // 1. Tooltips (including upgrading native [title] attributes across the page)
  initTooltips(root);

  // 2. Popovers: [data-bs-toggle="popover"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="popover"]').forEach((el) => {
    try {
      Popover.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 3. Toasts & declarative toast triggers ([data-furo-toast-target="#toastId"])
  root.querySelectorAll<HTMLElement>('.toast').forEach((el) => {
    try {
      Toast.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  root.querySelectorAll<HTMLElement>('[data-furo-toast-target]').forEach((trigger) => {
    if (trigger.hasAttribute('data-furo-toast-bound')) {
      return;
    }
    trigger.setAttribute('data-furo-toast-bound', 'true');
    trigger.addEventListener('click', () => {
      const selector = trigger.getAttribute('data-furo-toast-target');
      if (!selector) return;
      const toastEl = document.querySelector<HTMLElement>(selector);
      if (toastEl) {
        try {
          Toast.getOrCreateInstance(toastEl).show();
        } catch {
          toastEl.classList.add('show');
        }
      }
    });
  });

  // 4. Comboboxes: [data-bs-toggle="combobox"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="combobox"]').forEach((el) => {
    try {
      Combobox.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 5. Datepickers: [data-bs-toggle="datepicker"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="datepicker"]').forEach((el) => {
    try {
      Datepicker.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 6. Chips input: [data-bs-chips], .chip-input
  root.querySelectorAll<HTMLElement>('[data-bs-chips], .chip-input').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-chips')) {
        el.setAttribute('data-bs-chips', '');
      }
      Chips.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 7. OTP inputs: [data-bs-otp], .otp
  root.querySelectorAll<HTMLElement>('[data-bs-otp], .otp').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-otp')) {
        el.setAttribute('data-bs-otp', '');
      }
      OtpInput.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 8. Range sliders: .form-range
  root.querySelectorAll<HTMLElement>('.form-range').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-bubble')) {
        el.setAttribute('data-bs-bubble', 'true');
      }
      Range.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 9. Password / token strength meters: [data-bs-strength], .strength
  root.querySelectorAll<HTMLElement>('[data-bs-strength], .strength').forEach((el) => {
    try {
      if (!el.hasAttribute('data-bs-strength')) {
        el.setAttribute('data-bs-strength', '');
      }
      if (!el.hasAttribute('data-bs-input')) {
        const prevInput = el.previousElementSibling;
        if (prevInput instanceof HTMLInputElement && prevInput.id) {
          el.setAttribute('data-bs-input', `#${prevInput.id}`);
        }
      }
      Strength.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 10. Overflowing horizontal navigation bars: .nav-overflow
  root.querySelectorAll<HTMLElement>('.nav-overflow').forEach((el) => {
    try {
      NavOverflow.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });

  // 11. Carousels: [data-bs-ride="carousel"], .carousel
  root.querySelectorAll<HTMLElement>('[data-bs-ride="carousel"], .carousel').forEach((el) => {
    try {
      Carousel.getOrCreateInstance(el);
    } catch {
      // Ignore
    }
  });
}

export {
  Alert,
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
