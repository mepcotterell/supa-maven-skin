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
  '.toast-container'
].join(', ');

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
export function initBootstrapComponents(
  root: ParentNode = document.getElementById('furo-main-content') ?? document
): void {
  if (typeof window !== 'undefined') {
    window.bootstrap = BootstrapPlugins;
  }

  isolateBootstrapComponentsFromProse(root);

  // 1. Tooltips: [data-bs-toggle="tooltip"]
  root.querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]').forEach((el) => {
    try {
      Tooltip.getOrCreateInstance(el);
    } catch {
      // Ignore initialization errors in headless test DOMs
    }
  });

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
